import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSessionUserFromRequest } from "@/lib/auth";
import { LABEL_FOLDERS, normalizeLabelFolder } from "@/lib/labels";

export const config = {
    api: {
        bodyParser: true, // Default body parser
    },
};

function ensureLabelFolders(uploadDir: string) {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const folder of LABEL_FOLDERS) {
        const folderPath = path.join(uploadDir, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }
}

export async function GET(request: NextRequest) {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadDir = path.join(process.cwd(), "uploads");
    ensureLabelFolders(uploadDir);

    return NextResponse.json(
        {
            labels: LABEL_FOLDERS,
        },
        { status: 200 }
    );
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

        // Parse the JSON body
        const body = await request.json();
        const { folderName, fileName } = body;
        const normalizedFolderName = normalizeLabelFolder(
            folderName?.toString?.() ?? ""
        );

        if (!normalizedFolderName) {
            return NextResponse.json(
                { error: "Invalid label folder name." },
                { status: 400 }
            );
        }

        const uploadDir = path.join(process.cwd(), "uploads");
        ensureLabelFolders(uploadDir);

        const subDir = path.join(uploadDir, normalizedFolderName);
        if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir, { recursive: true });
        }

        if (fileName) {
            // Define the source file path (assuming it's already in the uploads folder)
            const sourceFilePath = path.join(uploadDir, fileName);

            // Ensure the source file exists
            if (!fs.existsSync(sourceFilePath)) {
                return NextResponse.json(
                    { error: "Source file not found" },
                    { status: 404 }
                );
            }

            // Define the new file path in the subdirectory
            const destinationFilePath = path.join(subDir, fileName);

            // Copy the file to the new location
            fs.copyFileSync(sourceFilePath, destinationFilePath);

            return NextResponse.json(
                {
                    filePath: `/uploads/${normalizedFolderName}/${fileName}`,
                    folderName: normalizedFolderName,
                },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: "No file name provided" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            {
                error: "File operation failed",
                details: (error as Error).message,
            },
            { status: 500 }
        );
    }
}
