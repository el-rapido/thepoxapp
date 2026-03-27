"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
    serverPhotos: {
        folder: string;
        fileName: string;
        relativePath: string;
    }[];
};

type CreateUserForm = {
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role: "ADMIN" | "USER";
};

function dateLabel(value: string) {
    return new Date(value).toLocaleString();
}

export default function AdminPage() {
    const [data, setData] = useState<AdminActivityPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
        name: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        role: "USER",
    });
    const [createUserError, setCreateUserError] = useState("");
    const [createUserSuccess, setCreateUserSuccess] = useState("");
    const [creatingUser, setCreatingUser] = useState(false);

    const loadAdminData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await fetch("/api/admin/activity", {
                cache: "no-store",
            });

            if (!result.ok) {
                const payload = await result.json().catch(() => null);
                throw new Error(
                    payload?.error ?? `Request failed with status ${result.status}`
                );
            }

            const payload = (await result.json()) as AdminActivityPayload;
            setData(payload);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Failed to load admin activity."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAdminData();
    }, [loadAdminData]);

    async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateUserError("");
        setCreateUserSuccess("");
        setCreatingUser(true);

        try {
            const result = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(createUserForm),
            });

            const payload = await result.json().catch(() => null);
            if (!result.ok) {
                throw new Error(payload?.error ?? "Failed to create user.");
            }

            setCreateUserForm({
                name: "",
                username: "",
                email: "",
                phone: "",
                password: "",
                role: "USER",
            });
            setCreateUserSuccess("User created successfully.");
            await loadAdminData();
        } catch (createError) {
            setCreateUserError(
                createError instanceof Error
                    ? createError.message
                    : "Failed to create user."
            );
        } finally {
            setCreatingUser(false);
        }
    }

    const stats = useMemo(() => {
        return {
            users: data?.users.length ?? 0,
            logins: data?.loginEvents.length ?? 0,
            predictions: data?.predictions.length ?? 0,
            uploads: data?.uploads.length ?? 0,
            serverPhotos: data?.serverPhotos.length ?? 0,
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
                        <div className="admin-stat">
                            <h2>{stats.serverPhotos}</h2>
                            <p>Server Folder Photos</p>
                        </div>
                    </div>

                    <section className="admin-section">
                        <h2>Create User</h2>
                        <form
                            className="admin-user-form"
                            onSubmit={handleCreateUser}
                        >
                            <div className="admin-form-grid">
                                <label className="admin-form-field">
                                    <span>Name</span>
                                    <input
                                        required
                                        value={createUserForm.name}
                                        onChange={(event) =>
                                            setCreateUserForm((previous) => ({
                                                ...previous,
                                                name: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Username</span>
                                    <input
                                        required
                                        value={createUserForm.username}
                                        onChange={(event) =>
                                            setCreateUserForm((previous) => ({
                                                ...previous,
                                                username: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Email (optional)</span>
                                    <input
                                        type="email"
                                        value={createUserForm.email}
                                        onChange={(event) =>
                                            setCreateUserForm((previous) => ({
                                                ...previous,
                                                email: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Phone (optional)</span>
                                    <input
                                        value={createUserForm.phone}
                                        onChange={(event) =>
                                            setCreateUserForm((previous) => ({
                                                ...previous,
                                                phone: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Password</span>
                                    <input
                                        type="password"
                                        required
                                        value={createUserForm.password}
                                        onChange={(event) =>
                                            setCreateUserForm((previous) => ({
                                                ...previous,
                                                password: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Role</span>
                                    <select
                                        value={createUserForm.role}
                                        onChange={(event) =>
                                            setCreateUserForm((previous) => ({
                                                ...previous,
                                                role: event.target
                                                    .value as CreateUserForm["role"],
                                            }))
                                        }
                                    >
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </label>
                            </div>

                            <div className="admin-form-actions">
                                <button type="submit" disabled={creatingUser}>
                                    {creatingUser
                                        ? "Creating..."
                                        : "Create User"}
                                </button>
                            </div>

                            {createUserError && (
                                <p className="admin-feedback error">
                                    {createUserError}
                                </p>
                            )}
                            {createUserSuccess && (
                                <p className="admin-feedback success">
                                    {createUserSuccess}
                                </p>
                            )}
                        </form>
                    </section>

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

                    <section className="admin-section">
                        <h2>Server Folder Photos</h2>
                        <div className="admin-photo-grid">
                            {data.serverPhotos.map((photo) => (
                                <div
                                    key={photo.relativePath}
                                    className="admin-photo"
                                >
                                    <img
                                        src={`/uploads/${photo.relativePath}`}
                                        alt={photo.fileName}
                                    />
                                    <div className="admin-photo-meta">
                                        <p>{photo.fileName}</p>
                                        <p>Folder: {photo.folder}</p>
                                        <a
                                            href={`/uploads/${photo.relativePath}`}
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
