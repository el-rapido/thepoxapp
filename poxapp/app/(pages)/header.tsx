"use client";

import React from "react";
import type { AuthUser } from "@/lib/types";

type HeaderProps = {
    user: AuthUser;
};

export default function Header({ user }: HeaderProps) {
    return (
        <div className="header">
            <div className="left-side">
                <div className="auth-user-info">
                    <p className="auth-user-name">{user.name}</p>
                    <p className="auth-user-role">
                        {user.role === "ADMIN" ? "Administrator" : "User"}
                    </p>
                </div>
            </div>

            <div className="right-side">
                <img src="assets/logos/rcaiot-logo.png" alt="" />
                <img src="assets/logos/desam.svg" alt="" />
            </div>
        </div>
    );
}
