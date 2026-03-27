import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import {
    createSession,
    hashPassword,
    normalizeValue,
    setSessionCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const identifier = body?.identifier?.toString?.() ?? "";
    const password = body?.password?.toString?.() ?? "";

    const normalizedIdentifier = normalizeValue(identifier);
    const trimmedPassword = password.trim();

    if (!normalizedIdentifier || !trimmedPassword) {
        return NextResponse.json(
            { error: "Please provide identifier and password." },
            { status: 400 }
        );
    }

    const user = await prisma.user.findFirst({
        where: {
            isActive: true,
            OR: [
                { usernameNormalized: normalizedIdentifier },
                { emailNormalized: normalizedIdentifier },
            ],
        },
    });

    if (!user) {
        return NextResponse.json(
            { error: "Invalid credentials." },
            { status: 401 }
        );
    }

    if (user.passwordHash !== hashPassword(trimmedPassword)) {
        return NextResponse.json(
            { error: "Invalid credentials." },
            { status: 401 }
        );
    }

    const { token, expiresAt } = await createSession(user.id);

    await prisma.loginEvent.create({
        data: {
            userId: user.id,
            ipAddress:
                request.headers.get("x-forwarded-for") ??
                request.headers.get("x-real-ip") ??
                null,
            userAgent: request.headers.get("user-agent"),
        },
    });

    const response = NextResponse.json(
        {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        },
        { status: 200 }
    );

    setSessionCookie(response, token, expiresAt);
    return response;
}
