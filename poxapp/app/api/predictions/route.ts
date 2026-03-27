import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const imagePath = body?.imagePath?.toString?.() ?? "";
    const predictedClass = body?.predictedClass?.toString?.() ?? "";
    const finalClass = body?.finalClass?.toString?.() ?? predictedClass;
    const modelName = body?.modelName?.toString?.() ?? null;
    const uploadedImageId = Number(body?.uploadedImageId);
    const confidenceValue = body?.confidence;
    const confidence =
        typeof confidenceValue === "number"
            ? confidenceValue
            : Number(confidenceValue);

    if (!imagePath || !predictedClass || !finalClass) {
        return NextResponse.json(
            { error: "imagePath, predictedClass and finalClass are required." },
            { status: 400 }
        );
    }

    const prediction = await prisma.prediction.create({
        data: {
            userId: user.id,
            uploadedImageId:
                Number.isFinite(uploadedImageId) && uploadedImageId > 0
                    ? uploadedImageId
                    : null,
            imagePath,
            predictedClass,
            finalClass,
            confidence: Number.isFinite(confidence) ? confidence : null,
            modelName,
        },
    });

    return NextResponse.json(prediction, { status: 201 });
}
