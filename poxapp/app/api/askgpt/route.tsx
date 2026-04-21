import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
    const body = await request.json();

    try {
        if (body) {
            const { prediction, question, absoluteImageURL } = body;
            const result = await askChatGPT(
                prediction,
                question,
                absoluteImageURL
            );
            return new NextResponse(result, { status: 200 });
        }
    } catch (error) {
        return NextResponse.json(error, { status: 200 });
    }
}

async function askChatGPT(__prediction: string, __question: string, absoluteImageURL: string) {
    const prediction = __prediction.trim();
    const question = __question.trim();

    const OPENAI_KEY = process.env.OPENAI_KEY;

    const textPrompt = `The ML model predicted this skin condition as "${prediction}". ${question}`;

    if (!OPENAI_KEY) {
        throw new Error("OPENAI_KEY is not set");
    }

    // Extract the filename from the URL and read from disk so OpenAI can receive
    // the image directly — the app URL is not publicly reachable by OpenAI's servers.
    const fileName = absoluteImageURL.split("/uploads/")[1];
    const filePath = path.join(process.cwd(), "uploads", fileName);
    const fileBuffer = await fs.promises.readFile(filePath);
    const ext = path.extname(fileName).slice(1).toLowerCase() || "jpeg";
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const base64Image = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    try {
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image_url",
                                    image_url: { url: base64Image },
                                },
                                {
                                    type: "text",
                                    text: textPrompt,
                                },
                            ],
                        },
                    ],
                    max_tokens: 100,
                }),
            }
        );

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            console.error("OpenAI error response:", data);
            throw new Error(data.error?.message ?? "GPT returned no content");
        }
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error(error);
        throw new Error("GPT Failed To Respond");
    }
}
