import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { clearSessionCookie, getSessionTokenFromRequest, hashSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const sessionToken = getSessionTokenFromRequest(request);

    if (sessionToken) {
        const tokenHash = hashSessionToken(sessionToken);
        await prisma.loginSession.updateMany({
            where: {
                tokenHash,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    clearSessionCookie(response);
    return response;
}
