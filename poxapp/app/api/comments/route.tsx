import prisma from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET() {
    const results = await prisma.comments.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
    return NextResponse.json(results, { status: 200 });
}

export async function POST(request: NextRequest) {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body) {
        const {
            comment,
            imagePath,
            classification,
            changedClassification,
            predictionId,
        } = body;

        const result = await prisma.comments.create({
            data: {
                comment: comment?.toString?.() ?? "",
                imagePath: imagePath?.toString?.() ?? "",
                classification: classification?.toString?.() ?? "",
                changedClassification: changedClassification?.toString?.() ?? "",
                userId: user.id,
                predictionId:
                    Number.isFinite(Number(predictionId)) &&
                    Number(predictionId) > 0
                        ? Number(predictionId)
                        : null,
            },
        });

        if (result) return NextResponse.json(result, { status: 200 });
        else
            return NextResponse.json(
                { error: "something went wrong" },
                { status: 400 }
            );
    }

    return NextResponse.json(
        { error: "something went wrong" },
        { status: 400 }
    );
}
