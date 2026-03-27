"use client";

import React from "react";
import Header from "./header";
import Menu from "./Menu";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";

export default function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const result = await fetch("/api/auth/me", {
                    cache: "no-store",
                });

                if (!result.ok) {
                    if (active) {
                        router.replace("/");
                    }
                    return;
                }

                const payload = await result.json();
                if (active) {
                    setUser(payload.user);
                }
            } catch (error) {
                console.error(error);
                if (active) {
                    router.replace("/");
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [router]);

    if (isLoading || !user) {
        return <div style={{ padding: "2rem" }}>Checking session...</div>;
    }

    return (
        <>
            <Header user={user} />
            <Menu user={user} />
            <div className="main-container">{children}</div>
        </>
    );
}
