import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const predictionId = Number(id);
    if (!Number.isFinite(predictionId)) {
        return NextResponse.json(
            { error: "Invalid prediction id." },
            { status: 400 }
        );
    }

    const prediction = await prisma.prediction.findUnique({
        where: { id: predictionId },
    });

    if (!prediction) {
        return NextResponse.json(
            { error: "Prediction not found." },
            { status: 404 }
        );
    }

    const isOwner = prediction.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const finalClass = body?.finalClass?.toString?.().trim();

    if (!finalClass) {
        return NextResponse.json(
            { error: "finalClass is required." },
            { status: 400 }
        );
    }

    const updated = await prisma.prediction.update({
        where: { id: predictionId },
        data: {
            finalClass,
        },
    });

    return NextResponse.json(updated, { status: 200 });
}
