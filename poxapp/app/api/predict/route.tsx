import { NextRequest, NextResponse } from "next/server";

const BACKENDURL =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://backend:7135";

export async function POST(request: NextRequest) {
    const body = await request.json();
    if (body.fileName) {
        const { fileName } = body;

        console.log("fileName: ", fileName);

        try {
            const backendUrl = `${BACKENDURL}/predict/?imageName=${encodeURIComponent(
                fileName
            )}&&modelInputFeatureSize=300&&modelFilename=model_10-0.92.keras`;

            const result = await fetch(backendUrl, {
                method: "GET",
            });

            const responseText = await result.text();

            if (!result.ok) {
                console.error(
                    "Prediction backend returned error:",
                    result.status,
                    responseText
                );
                return NextResponse.json(
                    {
                        error: "Prediction service failed",
                        details:
                            responseText ||
                            `backend responded with ${result.status}`,
                    },
                    { status: result.status }
                );
            }

            if (!responseText) {
                console.error("Prediction backend returned empty body");
                return NextResponse.json(
                    { error: "Prediction service returned an empty body" },
                    { status: 502 }
                );
            }

            let classificationResults;
            try {
                classificationResults = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Failed to parse prediction response:", parseError);
                return NextResponse.json(
                    {
                        error: "Invalid prediction response",
                        details: responseText,
                    },
                    { status: 502 }
                );
            }

            return NextResponse.json(classificationResults, { status: 200 });
        } catch (error) {
            console.error("Prediction request failed:", error);
            return NextResponse.json(
                {
                    error: "Unable to reach the prediction service",
                    details: (error as Error).message ?? "unknown",
                },
                { status: 502 }
            );
        }
    }

    return NextResponse.json(
        {
            error: "something went wrong",
        },
        { status: 400 }
    );
}
