"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./styles/index.css";

export default function Home() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const router = useRouter();

    useEffect(() => {
        let active = true;

        (async () => {
            const result = await fetch("/api/auth/me", { cache: "no-store" });
            if (active && result.ok) {
                router.replace("/predict");
            }
        })();

        return () => {
            active = false;
        };
    }, [router]);

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const identifier = username.trim();
        const trimmedPassword = password.trim();
        if (!identifier || !trimmedPassword) {
            setLoginError("Please enter username/email and password.");
            return;
        }

        setIsSubmitting(true);
        setLoginError("");

        try {
            const result = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    identifier,
                    password: trimmedPassword,
                }),
            });

            if (!result.ok) {
                const errorPayload = await result.json().catch(() => null);
                setLoginError(errorPayload?.error ?? "Invalid credentials.");
                return;
            }

            router.push("/predict");
        } catch (error) {
            console.error(error);
            setLoginError("Login request failed.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <div className="split-view-container">
                <div className="background-view">
                    <img src="/assets/background.png" alt="" />
                </div>

                <div className="login-container">
                    <div className="logo-container">
                        <img src="/assets/logos/air-logo.png" alt="" />
                        <img src="/assets/logos/rcaiot-logo.png" alt="" />
                    </div>

                    <form className="login-form" onSubmit={login}>
                        <h1 className="login-heading">Skin Conditions App</h1>
                        <div className="input-element">
                            <input
                                type="text"
                                className="username"
                                placeholder="username or email"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="input-element">
                            <input
                                type="password"
                                className="password"
                                placeholder="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Logging in..." : "Login"}
                        </button>
                        <div
                            className={`bubble-message-container ${
                                loginError ? "visible" : ""
                            }`}
                        >
                            {loginError}
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
