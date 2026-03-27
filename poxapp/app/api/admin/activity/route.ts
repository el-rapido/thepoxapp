import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [users, loginEvents, predictions, uploads] = await Promise.all([
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
    ]);

    return NextResponse.json(
        {
            users,
            loginEvents,
            predictions,
            uploads,
        },
        { status: 200 }
    );
}
