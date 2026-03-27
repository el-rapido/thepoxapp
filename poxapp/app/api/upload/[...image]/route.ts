import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function sanitizeImagePath(parts: string[]) {
    const cleanedParts = parts.filter(Boolean).map((part) => part.trim());
    if (cleanedParts.length === 0) {
        return null;
    }

    const joined = cleanedParts.join("/");
    const normalized = path.posix.normalize(joined);

    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
        return null;
    }

    return normalized;
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ image: string[] }> }
) {
    const { image } = await params;
    const sanitizedRelativePath = sanitizeImagePath(image ?? []);

    if (!sanitizedRelativePath) {
        return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    }

    const imagePath = path.join(process.cwd(), "uploads", sanitizedRelativePath);

    if (!fs.existsSync(imagePath)) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const ext = path.extname(imagePath).toLowerCase();
    if (!allowedExtensions.has(ext)) {
        return NextResponse.json(
            { error: "Unsupported file type" },
            { status: 415 }
        );
    }

    const file = fs.readFileSync(imagePath);

    let contentType = "image/jpeg";
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";

    return new NextResponse(file, {
        status: 200,
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
}
