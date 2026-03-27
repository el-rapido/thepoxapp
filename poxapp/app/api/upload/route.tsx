import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "@/prisma/client";
import { getSessionUserFromRequest } from "@/lib/auth";

export const config = {
    api: {
        bodyParser: false, // allow streaming the multipart/form-data ourselves
    },
};

async function ensureUploadDir(uploadDir: string) {
    if (!fs.existsSync(uploadDir)) {
        await fs.promises.mkdir(uploadDir, { recursive: true });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getSessionUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const uploadDir = path.join(process.cwd(), "uploads");
        await ensureUploadDir(uploadDir);

        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || typeof file === "string") {
            return NextResponse.json(
                { error: "No file was uploaded" },
                { status: 400 }
            );
        }

        const fileName =
            (file as File).name ||
            `image-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
        const ext = path.extname(fileName) || ".jpg";
        const uniqueName = `image-${Date.now()}-${crypto
            .randomBytes(6)
            .toString("hex")}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);

        const data = Buffer.from(await (file as File).arrayBuffer());
        await fs.promises.writeFile(filePath, data);

        const upload = await prisma.uploadedImage.create({
            data: {
                userId: user.id,
                imagePath: uniqueName,
                originalName: (file as File).name || null,
            },
        });

        return NextResponse.json(
            { filePath: `/uploads/${uniqueName}`, uploadId: upload.id },
            { status: 200 }
        );
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            {
                error: "File upload failed",
                details: (error as Error).message,
            },
            { status: 500 }
        );
    }
}
