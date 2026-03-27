import { NextRequest, NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/prisma/client";
import {
    getSessionUserFromRequest,
    hashPassword,
    normalizeValue,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const username = body.username?.toString?.().trim() ?? "";
    const password = body.password?.toString?.().trim() ?? "";
    const name = body.name?.toString?.().trim() ?? "";
    const emailRaw = body.email?.toString?.().trim() ?? "";
    const phoneRaw = body.phone?.toString?.().trim() ?? "";
    const role = body.role === "ADMIN" ? UserRole.ADMIN : UserRole.USER;

    if (!username || !password || !name) {
        return NextResponse.json(
            { error: "name, username and password are required." },
            { status: 400 }
        );
    }

    const usernameNormalized = normalizeValue(username);
    const email = emailRaw ? emailRaw : null;
    const emailNormalized = email ? normalizeValue(email) : null;
    const phone = phoneRaw ? phoneRaw : null;

    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { usernameNormalized },
                    ...(emailNormalized ? [{ emailNormalized }] : []),
                ],
            },
            select: {
                id: true,
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Username or email already exists." },
                { status: 409 }
            );
        }

        const createdUser = await prisma.user.create({
            data: {
                username,
                usernameNormalized,
                email,
                emailNormalized,
                passwordHash: hashPassword(password),
                name,
                phone,
                role,
                isActive: true,
            },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json(createdUser, { status: 201 });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Username or email already exists." },
                { status: 409 }
            );
        }

        console.error(error);
        return NextResponse.json(
            { error: "Failed to create user." },
            { status: 500 }
        );
    }
}
