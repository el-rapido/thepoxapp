"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
    const [deletingImagePath, setDeletingImagePath] = useState("");
    const [selectedImagePaths, setSelectedImagePaths] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

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
            setSelectedImagePaths((previous) => {
                const availablePaths = new Set<string>([
                    ...payload.predictions.map((entry) => entry.imagePath),
                    ...payload.uploads.map((entry) => entry.imagePath),
                    ...payload.serverPhotos.map((entry) => entry.relativePath),
                ]);

                return previous.filter((entry) => availablePaths.has(entry));
            });
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

    function buildUploadUrl(relativePath: string) {
        const encodedPath = relativePath
            .split("/")
            .filter(Boolean)
            .map((part) => encodeURIComponent(part))
            .join("/");

        return `/uploads/${encodedPath}`;
    }

    async function handleDeleteImage(relativePath: string) {
        const shouldDelete = window.confirm(
            `Delete image "${relativePath}" from server?`
        );
        if (!shouldDelete) {
            return;
        }

        setDeletingImagePath(relativePath);
        try {
            const result = await fetch("/api/admin/images", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ relativePath }),
            });

            const payload = await result.json().catch(() => null);
            if (!result.ok) {
                throw new Error(payload?.error ?? "Failed to delete image.");
            }

            await loadAdminData();
            setSelectedImagePaths((previous) =>
                previous.filter((entry) => entry !== relativePath)
            );
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : "Failed to delete image."
            );
        } finally {
            setDeletingImagePath("");
        }
    }

    async function handleBulkDeleteImages() {
        if (selectedImagePaths.length === 0) {
            return;
        }

        const shouldDelete = window.confirm(
            `Delete ${selectedImagePaths.length} selected image(s)?`
        );
        if (!shouldDelete) {
            return;
        }

        setIsBulkDeleting(true);
        setError("");

        try {
            const result = await fetch("/api/admin/images", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ relativePaths: selectedImagePaths }),
            });

            const payload = await result.json().catch(() => null);
            if (!result.ok) {
                throw new Error(payload?.error ?? "Bulk delete failed.");
            }

            if (Array.isArray(payload?.failed) && payload.failed.length > 0) {
                const failedPreview = payload.failed
                    .slice(0, 3)
                    .map((entry: { path: string }) => entry.path)
                    .join(", ");
                setError(
                    `Some images could not be deleted: ${failedPreview}${
                        payload.failed.length > 3 ? "..." : ""
                    }`
                );
            }

            setSelectedImagePaths([]);
            await loadAdminData();
        } catch (bulkDeleteError) {
            setError(
                bulkDeleteError instanceof Error
                    ? bulkDeleteError.message
                    : "Bulk delete failed."
            );
        } finally {
            setIsBulkDeleting(false);
        }
    }

    function toggleImageSelection(relativePath: string) {
        setSelectedImagePaths((previous) => {
            if (previous.includes(relativePath)) {
                return previous.filter((entry) => entry !== relativePath);
            }

            return [...previous, relativePath];
        });
    }

    function toggleFolder(folderName: string) {
        setOpenFolders((previous) => {
            const next = new Set(previous);
            if (next.has(folderName)) {
                next.delete(folderName);
            } else {
                next.add(folderName);
            }
            return next;
        });
    }

    function ImageActions({ relativePath }: { relativePath: string }) {
        const imageUrl = buildUploadUrl(relativePath);
        const isDeleting = deletingImagePath === relativePath;

        return (
            <div className="admin-image-actions">
                <a
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-icon-button"
                    title="Open image"
                >
                    <Image
                        src="/assets/icons/aperture.svg"
                        alt="Open"
                        width={12}
                        height={12}
                    />
                </a>
                <a
                    href={imageUrl}
                    download
                    className="admin-icon-button"
                    title="Download image"
                >
                    <Image
                        src="/assets/icons/down.png"
                        alt="Download"
                        width={12}
                        height={12}
                    />
                </a>
                <button
                    type="button"
                    className="admin-icon-button admin-icon-delete"
                    title="Delete image"
                    onClick={() => handleDeleteImage(relativePath)}
                    disabled={isDeleting}
                >
                    <Image
                        src="/assets/icons/delete.png"
                        alt="Delete"
                        width={12}
                        height={12}
                    />
                </button>
            </div>
        );
    }

    const allImagePaths = useMemo(() => {
        if (!data) {
            return [];
        }

        return Array.from(
            new Set<string>([
                ...data.predictions.map((entry) => entry.imagePath),
                ...data.uploads.map((entry) => entry.imagePath),
                ...data.serverPhotos.map((entry) => entry.relativePath),
            ])
        );
    }, [data]);

    const folderGroups = useMemo(() => {
        if (!data) return [];
        const map = new Map<string, typeof data.serverPhotos>();
        for (const photo of data.serverPhotos) {
            const list = map.get(photo.folder) ?? [];
            list.push(photo);
            map.set(photo.folder, list);
        }
        return Array.from(map.entries()).map(([folder, photos]) => ({
            folder,
            photos,
        }));
    }, [data]);

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

                    {/* Prediction Photos — shown first */}
                    <section className="admin-section">
                        <h2>Prediction Photos</h2>
                        <div className="admin-bulk-actions">
                            <p>{selectedImagePaths.length} selected</p>
                            <div className="admin-bulk-actions-buttons">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedImagePaths(allImagePaths)
                                    }
                                    disabled={allImagePaths.length === 0}
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedImagePaths([])}
                                    disabled={selectedImagePaths.length === 0}
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    className="danger"
                                    onClick={handleBulkDeleteImages}
                                    disabled={
                                        selectedImagePaths.length === 0 ||
                                        isBulkDeleting
                                    }
                                >
                                    {isBulkDeleting
                                        ? "Deleting..."
                                        : "Delete Selected"}
                                </button>
                            </div>
                        </div>
                        <div className="admin-photo-grid">
                            {data.predictions.map((prediction) => (
                                <div
                                    key={prediction.id}
                                    className={`admin-photo ${
                                        selectedImagePaths.includes(
                                            prediction.imagePath
                                        )
                                            ? "selected"
                                            : ""
                                    }`}
                                >
                                    <img
                                        src={buildUploadUrl(prediction.imagePath)}
                                        alt={prediction.predictedClass}
                                    />
                                    <label className="admin-select-toggle">
                                        <input
                                            type="checkbox"
                                            checked={selectedImagePaths.includes(
                                                prediction.imagePath
                                            )}
                                            onChange={() =>
                                                toggleImageSelection(
                                                    prediction.imagePath
                                                )
                                            }
                                        />
                                        <span>Select</span>
                                    </label>
                                    <div className="admin-photo-meta">
                                        <p>{prediction.user.name}</p>
                                        <p>
                                            Predicted:{" "}
                                            {prediction.predictedClass}
                                        </p>
                                        <p>Final: {prediction.finalClass}</p>
                                        <p>{dateLabel(prediction.createdAt)}</p>
                                        <ImageActions
                                            relativePath={prediction.imagePath}
                                        />
                                    </div>
                                </div>
                            ))}
                            {data.predictions.length === 0 && (
                                <p className="admin-empty">No prediction photos yet.</p>
                            )}
                        </div>
                    </section>

                    {/* Server Folders — clickable to expand and view photos */}
                    <section className="admin-section">
                        <h2>Server Folders</h2>
                        <div className="admin-folder-list">
                            {folderGroups.length === 0 && (
                                <p className="admin-empty">No folders found.</p>
                            )}
                            {folderGroups.map(({ folder, photos }) => {
                                const isOpen = openFolders.has(folder);
                                return (
                                    <div key={folder} className="admin-folder">
                                        <button
                                            type="button"
                                            className="admin-folder-header"
                                            onClick={() => toggleFolder(folder)}
                                        >
                                            <span className="admin-folder-icon">
                                                {isOpen ? "📂" : "📁"}
                                            </span>
                                            <span className="admin-folder-name">
                                                {folder}
                                            </span>
                                            <span className="admin-folder-count">
                                                {photos.length} photo{photos.length !== 1 ? "s" : ""}
                                            </span>
                                            <span className="admin-folder-chevron">
                                                {isOpen ? "▲" : "▼"}
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <div className="admin-folder-photos">
                                                <div className="admin-photo-grid">
                                                    {photos.map((photo) => (
                                                        <div
                                                            key={photo.relativePath}
                                                            className={`admin-photo ${
                                                                selectedImagePaths.includes(
                                                                    photo.relativePath
                                                                )
                                                                    ? "selected"
                                                                    : ""
                                                            }`}
                                                        >
                                                            <img
                                                                src={buildUploadUrl(
                                                                    photo.relativePath
                                                                )}
                                                                alt={photo.fileName}
                                                            />
                                                            <label className="admin-select-toggle">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedImagePaths.includes(
                                                                        photo.relativePath
                                                                    )}
                                                                    onChange={() =>
                                                                        toggleImageSelection(
                                                                            photo.relativePath
                                                                        )
                                                                    }
                                                                />
                                                                <span>Select</span>
                                                            </label>
                                                            <div className="admin-photo-meta">
                                                                <p>{photo.fileName}</p>
                                                                <ImageActions
                                                                    relativePath={
                                                                        photo.relativePath
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Admin management sections */}
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
                </>
            )}
        </div>
    );
}
