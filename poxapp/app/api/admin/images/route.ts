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

export async function DELETE(request: NextRequest) {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const relativePathRaw = body?.relativePath?.toString?.() ?? "";
    const relativePath = sanitizeRelativePath(relativePathRaw);

    if (!relativePath) {
        return NextResponse.json(
            { error: "Invalid relative path." },
            { status: 400 }
        );
    }

    const absolutePath = path.join(process.cwd(), "uploads", relativePath);

    if (!fs.existsSync(absolutePath)) {
        return NextResponse.json({ error: "Image not found." }, { status: 404 });
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

    return NextResponse.json(
        {
            ok: true,
            deletedPath: relativePath,
            dbCleanupApplied: isRootFile,
        },
        { status: 200 }
    );
}
