"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./styles/index.css";

type User = {
    username: string;
    password: string;
    name: string;
    phone: string;
    email: string;
};

const AUTH_STORAGE_KEY = "poxapp-auth-user";

const USERS: User[] = [
    {
        username: "profdux",
        password: "dux123",
        name: "Profdux",
        phone: "",
        email: "",
    },
    {
        username: "mugedeniz90@gmail.com",
        password: "mugedeniz",
        name: "Muge Deniz",
        phone: "",
        email: "mugedeniz90@gmail.com",
    },
    {
        username: "salihmujdat.balkan@neu.edu.tr",
        password: "05338388625",
        name: "Prof. Dr. Salih Müjdat Balkan",
        phone: "05338388625",
        email: "salihmujdat.balkan@neu.edu.tr",
    },
    {
        username: "kaya.suer@neu.edu.tr",
        password: "05338843723",
        name: "Prof. Dr. Kaya Süer",
        phone: "05338843723",
        email: "kaya.suer@neu.edu.tr",
    },
    {
        username: "ceyhun.dalkan@med.neu.edu.tr",
        password: "05338422857",
        name: "Prof. Dr. Ceyhun Dalkan",
        phone: "05338422857",
        email: "ceyhun.dalkan@med.neu.edu.tr",
    },
    {
        username: "serap.maden@neu.edu.tr",
        password: "05391062693",
        name: "Uzm. Dr. Serap Maden",
        phone: "05391062693",
        email: "serap.maden@neu.edu.tr",
    },
];

function normalizeValue(value: string) {
    return value.trim().toLowerCase();
}

export default function Home() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    const router = useRouter();

    useEffect(() => {
        const authUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (authUser) {
            router.push("/dashboard");
        }
    }, [router]);

    function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedUsername = normalizeValue(username);
        const normalizedPassword = password.trim();

        if (!normalizedUsername || !normalizedPassword) {
            setLoginError("Please enter username/email and password.");
            return;
        }

        const selectedUser = USERS.find((user) => {
            const matchesIdentifier =
                normalizeValue(user.username) === normalizedUsername ||
                normalizeValue(user.email) === normalizedUsername;
            const matchesPassword = user.password === normalizedPassword;
            return matchesIdentifier && matchesPassword;
        });

        if (!selectedUser) {
            setLoginError("Invalid credentials.");
            return;
        }

        localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
                username: selectedUser.username,
                name: selectedUser.name,
                email: selectedUser.email,
                phone: selectedUser.phone,
            })
        );

        setLoginError("");
        router.push("/dashboard");
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
                        <button type="submit">Login</button>
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
