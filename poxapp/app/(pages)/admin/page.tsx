"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/styles/admin.css";

type AdminUser = {
    id: number;
    username: string;
    name: string;
    email: string | null;
    role: "ADMIN" | "USER";
    createdAt: string;
    _count: {
        uploads: number;
        predictions: number;
        loginEvents: number;
    };
    loginEvents: { loggedInAt: string }[];
};

type LoginEvent = {
    id: number;
    loggedInAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    user: {
        id: number;
        username: string;
        name: string;
        email: string | null;
    };
};

type Prediction = {
    id: number;
    imagePath: string;
    predictedClass: string;
    finalClass: string;
    confidence: number | null;
    createdAt: string;
    user: {
        id: number;
        username: string;
        name: string;
        email: string | null;
    };
};

type Upload = {
    id: number;
    imagePath: string;
    originalName: string | null;
    createdAt: string;
    user: {
        id: number;
        username: string;
        name: string;
        email: string | null;
    };
};

type AdminActivityPayload = {
    users: AdminUser[];
    loginEvents: LoginEvent[];
    predictions: Prediction[];
    uploads: Upload[];
};

function dateLabel(value: string) {
    return new Date(value).toLocaleString();
}

export default function AdminPage() {
    const [data, setData] = useState<AdminActivityPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const result = await fetch("/api/admin/activity", {
                    cache: "no-store",
                });

                if (!result.ok) {
                    const payload = await result.json().catch(() => null);
                    throw new Error(
                        payload?.error ??
                            `Request failed with status ${result.status}`
                    );
                }

                const payload = (await result.json()) as AdminActivityPayload;
                if (active) {
                    setData(payload);
                }
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : "Failed to load admin activity."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    const stats = useMemo(() => {
        return {
            users: data?.users.length ?? 0,
            logins: data?.loginEvents.length ?? 0,
            predictions: data?.predictions.length ?? 0,
            uploads: data?.uploads.length ?? 0,
        };
    }, [data]);

    return (
        <div className="admin-dashboard">
            <div className="admin-top">
                <h1>Admin Dashboard</h1>
                <p>Track logins, uploaded images, and prediction activity.</p>
            </div>

            {loading && <p>Loading admin data...</p>}
            {!loading && error && <p>{error}</p>}

            {!loading && !error && data && (
                <>
                    <div className="admin-stats">
                        <div className="admin-stat">
                            <h2>{stats.users}</h2>
                            <p>Users</p>
                        </div>
                        <div className="admin-stat">
                            <h2>{stats.logins}</h2>
                            <p>Recent Logins</p>
                        </div>
                        <div className="admin-stat">
                            <h2>{stats.predictions}</h2>
                            <p>Prediction Attempts</p>
                        </div>
                        <div className="admin-stat">
                            <h2>{stats.uploads}</h2>
                            <p>Uploaded Images</p>
                        </div>
                    </div>

                    <section className="admin-section">
                        <h2>Users</h2>
                        <div className="admin-table">
                            <div className="admin-row admin-row-head">
                                <span>Name</span>
                                <span>Role</span>
                                <span>Last Login</span>
                                <span>Uploads</span>
                                <span>Predictions</span>
                            </div>
                            {data.users.map((user) => (
                                <div key={user.id} className="admin-row">
                                    <span>{user.name}</span>
                                    <span>{user.role}</span>
                                    <span>
                                        {user.loginEvents[0]
                                            ? dateLabel(
                                                  user.loginEvents[0].loggedInAt
                                              )
                                            : "Never"}
                                    </span>
                                    <span>{user._count.uploads}</span>
                                    <span>{user._count.predictions}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="admin-section">
                        <h2>Login History</h2>
                        <div className="admin-table">
                            <div className="admin-row admin-row-head">
                                <span>User</span>
                                <span>Time</span>
                                <span>IP</span>
                                <span>Device</span>
                            </div>
                            {data.loginEvents.map((event) => (
                                <div key={event.id} className="admin-row">
                                    <span>{event.user.name}</span>
                                    <span>{dateLabel(event.loggedInAt)}</span>
                                    <span>{event.ipAddress ?? "-"}</span>
                                    <span>{event.userAgent ?? "-"}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="admin-section">
                        <h2>Prediction Photos</h2>
                        <div className="admin-photo-grid">
                            {data.predictions.map((prediction) => (
                                <div key={prediction.id} className="admin-photo">
                                    <img
                                        src={`/uploads/${prediction.imagePath}`}
                                        alt={prediction.predictedClass}
                                    />
                                    <div className="admin-photo-meta">
                                        <p>{prediction.user.name}</p>
                                        <p>
                                            Predicted:{" "}
                                            {prediction.predictedClass}
                                        </p>
                                        <p>Final: {prediction.finalClass}</p>
                                        <p>{dateLabel(prediction.createdAt)}</p>
                                        <a
                                            href={`/uploads/${prediction.imagePath}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open image
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="admin-section">
                        <h2>All Uploaded Photos</h2>
                        <div className="admin-photo-grid">
                            {data.uploads.map((upload) => (
                                <div key={upload.id} className="admin-photo">
                                    <img
                                        src={`/uploads/${upload.imagePath}`}
                                        alt={upload.originalName ?? upload.imagePath}
                                    />
                                    <div className="admin-photo-meta">
                                        <p>{upload.user.name}</p>
                                        <p>
                                            Original file:{" "}
                                            {upload.originalName ?? "unknown"}
                                        </p>
                                        <p>{dateLabel(upload.createdAt)}</p>
                                        <a
                                            href={`/uploads/${upload.imagePath}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open image
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
