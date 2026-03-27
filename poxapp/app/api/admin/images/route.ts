import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/prisma/client";
import { getSessionUserFromRequest } from "@/lib/auth";

function sanitizeRelativePath(input: string) {
    const normalized = input.trim().replace(/^\/+/, "");
    if (!normalized) {
        return null;
    }

    const clean = path.posix.normalize(normalized);
    if (clean.startsWith("..") || path.isAbsolute(clean)) {
        return null;
    }

    return clean;
}

async function deleteSingleImage(relativePath: string) {
    const absolutePath = path.join(process.cwd(), "uploads", relativePath);

    if (!fs.existsSync(absolutePath)) {
        return {
            path: relativePath,
            deleted: false,
            dbCleanupApplied: false,
            error: "Image not found.",
        };
    }

    await fs.promises.unlink(absolutePath);

    const isRootFile = !relativePath.includes("/");
    if (isRootFile) {
        await prisma.$transaction([
            prisma.comments.deleteMany({
                where: {
                    imagePath: relativePath,
                },
            }),
            prisma.prediction.deleteMany({
                where: {
                    imagePath: relativePath,
                },
            }),
            prisma.uploadedImage.deleteMany({
                where: {
                    imagePath: relativePath,
                },
            }),
        ]);
    }

    return {
        path: relativePath,
        deleted: true,
        dbCleanupApplied: isRootFile,
        error: null,
    };
}

export async function DELETE(request: NextRequest) {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const rawList = Array.isArray(body?.relativePaths)
        ? body.relativePaths
        : [body?.relativePath];

    const relativePaths: string[] = Array.from(
        new Set(
            rawList
                .map((value: unknown) =>
                    sanitizeRelativePath(value?.toString?.() ?? "")
                )
                .filter((value: string | null): value is string => Boolean(value))
        )
    );

    if (relativePaths.length === 0) {
        return NextResponse.json(
            { error: "Invalid relative path(s)." },
            { status: 400 }
        );
    }

    const results = [];
    for (const relativePath of relativePaths) {
        const result = await deleteSingleImage(relativePath);
        results.push(result);
    }

    const deleted = results.filter((entry) => entry.deleted);
    const failed = results.filter((entry) => !entry.deleted);

    if (deleted.length === 0 && failed.length > 0) {
        const singleFailure = failed[0];
        return NextResponse.json(
            {
                error: singleFailure.error ?? "Failed to delete images.",
                deleted,
                failed,
            },
            { status: 404 }
        );
    }

    return NextResponse.json(
        {
            ok: failed.length === 0,
            deleted,
            failed,
        },
        { status: 200 }
    );
}
