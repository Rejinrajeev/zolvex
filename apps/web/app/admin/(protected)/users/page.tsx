"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "editor";
  isActive: boolean;
  twoFAEnabled: boolean;
  lastLogin: string | null;
}

interface CreateForm {
  name: string;
  email: string;
  role: "editor" | "superadmin";
}

const EMPTY_CREATE: CreateForm = { name: "", email: "", role: "editor" };

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Plaintext temp password shown once after creation, then cleared on dismiss
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/admin/api/users");
    if (!res.ok) {
      setError("Could not load users.");
      setLoading(false);
      return;
    }
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/admin/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setCreating(false);
    const data = await res.json();
    if (!res.ok) {
      setCreateError(
        data?.error === "email_taken"
          ? "That email is already in use."
          : data?.message ?? "Could not create user."
      );
      return;
    }
    setTempPassword(data.tempPassword as string);
    setShowCreate(false);
    setCreateForm(EMPTY_CREATE);
    load();
  }

  async function toggleActive(user: AdminUser) {
    const next = !user.isActive;
    if (
      !window.confirm(
        `${next ? "Reactivate" : "Deactivate"} ${user.name}?`
      )
    )
      return;
    const res = await fetch(`/admin/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.message ?? "Could not update user.");
      return;
    }
    load();
  }

  async function toggleRole(user: AdminUser) {
    const next: "editor" | "superadmin" =
      user.role === "editor" ? "superadmin" : "editor";
    if (
      !window.confirm(
        `Change ${user.name}'s role to ${next}? This will revoke all their active sessions.`
      )
    )
      return;
    const res = await fetch(`/admin/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.message ?? "Could not change role.");
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Users</h1>
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setCreateForm(EMPTY_CREATE);
            setCreateError(null);
          }}
          className="bg-gold px-5 py-2.5 font-display text-sm text-ink"
        >
          New user
        </button>
      </div>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {tempPassword && (
        <div className="mb-6 border border-olive-ink/40 bg-olive-ink/5 px-5 py-4">
          <p className="mb-1 font-display text-sm text-ink">
            User created. Temporary password — shown once, copy it now:
          </p>
          <p className="font-mono text-base text-ink">{tempPassword}</p>
          <button
            type="button"
            onClick={() => setTempPassword(null)}
            className="mt-3 border border-ink/20 px-3 py-1.5 font-body text-xs text-ink"
          >
            Dismiss
          </button>
        </div>
      )}
      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : users.length === 0 ? (
        <p className="font-body text-sm text-slate">No users yet.</p>
      ) : (
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left">
              {["Name", "Email", "Role", "Status", "2FA"].map((h) => (
                <th
                  key={h}
                  className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate"
                >
                  {h}
                </th>
              ))}
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-ink/10">
                <td className="py-3 pr-4 text-ink">{user.name}</td>
                <td className="py-3 pr-4 text-slate">{user.email}</td>
                <td className="py-3 pr-4 text-slate">{user.role}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`font-stamp text-[0.65rem] uppercase tracking-wide ${
                      user.isActive ? "text-olive-ink" : "text-slate"
                    }`}
                  >
                    {user.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate">
                  {user.twoFAEnabled ? "Enabled" : "Not set"}
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(user)}
                      className="font-body text-sm text-ink underline"
                    >
                      {user.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRole(user)}
                      className="font-body text-sm text-slate underline"
                    >
                      Make {user.role === "editor" ? "superadmin" : "editor"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <Modal title="New user" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
            {createError && <ErrorBanner message={createError} />}
            <div>
              <label className="mb-1 block font-body text-sm text-ink">
                Name *
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className="block h-11 w-full border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-sm text-ink">
                Email *
              </label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className="block h-11 w-full border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-sm text-ink">
                Role
              </label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    role: e.target.value as "editor" | "superadmin",
                  }))
                }
                className="block h-11 w-full border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink focus:outline-none"
              >
                <option value="editor">Editor</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-ink/20 px-4 py-2 font-body text-sm text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={
                creating ||
                !createForm.name.trim() ||
                !createForm.email.trim()
              }
              className="bg-gold px-4 py-2 font-display text-sm text-ink disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create user"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
