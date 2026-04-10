import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/prisma/client";
import { getSessionUserFromRequest } from "@/lib/auth";
import { normalizeLabelFolder } from "@/lib/labels";

export async function POST(request: NextRequest) {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const uploadsDir = path.join(process.cwd(), "uploads");

    // Find all predictions whose imagePath has no folder prefix (still in root)
    const predictions = await prisma.prediction.findMany({
        where: { imagePath: { not: { contains: "/" } } },
        select: { id: true, imagePath: true, finalClass: true, uploadedImageId: true },
    });

    const moved: { from: string; to: string }[] = [];
    const skipped: { imagePath: string; reason: string }[] = [];

    for (const prediction of predictions) {
        const folder = normalizeLabelFolder(prediction.finalClass);
        if (!folder) {
            skipped.push({ imagePath: prediction.imagePath, reason: `unknown class: ${prediction.finalClass}` });
            continue;
        }

        const srcPath = path.join(uploadsDir, prediction.imagePath);
        if (!fs.existsSync(srcPath)) {
            skipped.push({ imagePath: prediction.imagePath, reason: "file not found on disk" });
            continue;
        }

        const destDir = path.join(uploadsDir, folder);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const destPath = path.join(destDir, prediction.imagePath);
        const newRelativePath = `${folder}/${prediction.imagePath}`;

        // Move file
        fs.renameSync(srcPath, destPath);

        // Update prediction record
        await prisma.prediction.update({
            where: { id: prediction.id },
            data: { imagePath: newRelativePath },
        });

        // Update uploadedImage record if linked
        if (prediction.uploadedImageId) {
            await prisma.uploadedImage.updateMany({
                where: { id: prediction.uploadedImageId, imagePath: prediction.imagePath },
                data: { imagePath: newRelativePath },
            });
        }

        moved.push({ from: prediction.imagePath, to: newRelativePath });
    }

    return NextResponse.json({ moved: moved.length, skipped: skipped.length, details: { moved, skipped } }, { status: 200 });
}
