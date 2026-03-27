import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getSessionUserFromRequest } from "@/lib/auth";
import { LABEL_FOLDERS } from "@/lib/labels";
import fs from "fs";
import path from "path";

type ServerPhoto = {
    folder: string;
    fileName: string;
    relativePath: string;
};

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function ensureLabelFolders(uploadsDir: string) {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const folder of LABEL_FOLDERS) {
        const folderPath = path.join(uploadsDir, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }
}

function collectServerPhotos(uploadsDir: string): ServerPhoto[] {
    if (!fs.existsSync(uploadsDir)) {
        return [];
    }

    const results: ServerPhoto[] = [];

    function walk(currentDir: string, currentFolder: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const nextFolder = currentFolder
                ? `${currentFolder}/${entry.name}`
                : entry.name;

            if (entry.isDirectory()) {
                walk(fullPath, nextFolder);
                continue;
            }

            const ext = path.extname(entry.name).toLowerCase();
            if (!imageExtensions.has(ext)) {
                continue;
            }

            const relativePath = currentFolder
                ? `${currentFolder}/${entry.name}`
                : entry.name;

            results.push({
                folder: currentFolder || "root",
                fileName: entry.name,
                relativePath,
            });
        }
    }

    walk(uploadsDir, "");
    return results.slice(0, 1000);
}

export async function GET(request: NextRequest) {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    ensureLabelFolders(uploadsDir);

    const [users, loginEvents, predictions, uploads, serverPhotos] =
        await Promise.all([
        prisma.user.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        uploads: true,
                        predictions: true,
                        loginEvents: true,
                    },
                },
                loginEvents: {
                    select: {
                        loggedInAt: true,
                    },
                    orderBy: {
                        loggedInAt: "desc",
                    },
                    take: 1,
                },
            },
        }),
        prisma.loginEvent.findMany({
            orderBy: { loggedInAt: "desc" },
            take: 200,
            select: {
                id: true,
                loggedInAt: true,
                ipAddress: true,
                userAgent: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        email: true,
                    },
                },
            },
        }),
        prisma.prediction.findMany({
            orderBy: { createdAt: "desc" },
            take: 400,
            select: {
                id: true,
                imagePath: true,
                predictedClass: true,
                finalClass: true,
                confidence: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        email: true,
                    },
                },
            },
        }),
        prisma.uploadedImage.findMany({
            orderBy: { createdAt: "desc" },
            take: 400,
            select: {
                id: true,
                imagePath: true,
                originalName: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        email: true,
                    },
                },
            },
        }),
        Promise.resolve(collectServerPhotos(uploadsDir)),
    ]);

    return NextResponse.json(
        {
            users,
            loginEvents,
            predictions,
            uploads,
            serverPhotos,
        },
        { status: 200 }
    );
}
