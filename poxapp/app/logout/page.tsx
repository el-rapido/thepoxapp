"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        let active = true;

        (async () => {
            await fetch("/api/auth/logout", {
                method: "POST",
            });

            if (active) {
                router.replace("/");
            }
        })();

        return () => {
            active = false;
        };
    }, [router]);

    return <div style={{ padding: "2rem" }}>Logging out...</div>;
}
