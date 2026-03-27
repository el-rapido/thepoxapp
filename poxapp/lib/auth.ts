import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { UserRole } from "@prisma/client";

const SESSION_COOKIE_NAME = "poxapp-session";
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;

type SessionUser = {
    id: number;
    username: string;
    email: string | null;
    name: string;
    phone: string | null;
    role: UserRole;
};

function getSessionSecret() {
    return process.env.SESSION_SECRET ?? "poxapp-dev-secret";
}

function hashWithSecret(value: string) {
    return crypto
        .createHash("sha256")
        .update(`${value}:${getSessionSecret()}`)
        .digest("hex");
}

export function normalizeValue(value: string) {
    return value.trim().toLowerCase();
}

export function hashPassword(password: string) {
    return crypto
        .createHash("sha256")
        .update(`password:${password}`)
        .digest("hex");
}

export function createSessionToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
    return hashWithSecret(`session:${token}`);
}

export async function createSession(userId: number) {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

    await prisma.loginSession.create({
        data: {
            userId,
            tokenHash,
            expiresAt,
        },
    });

    return { token, expiresAt };
}

export function setSessionCookie(
    response: NextResponse,
    sessionToken: string,
    expiresAt: Date
) {
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
        path: "/",
    });
}

export function clearSessionCookie(response: NextResponse) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: new Date(0),
        path: "/",
    });
}

export function getSessionTokenFromRequest(request: NextRequest) {
    return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getSessionUserFromRequest(
    request: NextRequest
): Promise<SessionUser | null> {
    const sessionToken = getSessionTokenFromRequest(request);
    if (!sessionToken) {
        return null;
    }

    const tokenHash = hashSessionToken(sessionToken);
    const now = new Date();

    const session = await prisma.loginSession.findFirst({
        where: {
            tokenHash,
            revokedAt: null,
            expiresAt: {
                gt: now,
            },
        },
        include: {
            user: true,
        },
    });

    if (!session || !session.user.isActive) {
        return null;
    }

    return {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        name: session.user.name,
        phone: session.user.phone,
        role: session.user.role,
    };
}
