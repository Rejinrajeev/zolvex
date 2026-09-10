"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Table } from "@/components/admin/Table";
import {
  Button,
  PageHeader,
  SkeletonRows,
  TextField,
  SelectField,
  Notice,
} from "@/components/admin/ui";
import { isEmail, isFilled } from "@/lib/admin/validate";
import { adminFetch } from "@/lib/admin/fetch";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "editor";
  isActive: boolean;
  twoFAEnabled: boolean;
  lastLogin: string | null;
}

const MIN_PASSWORD_LENGTH = 12;

interface CreateForm {
  name: string;
  email: string;
  role: "editor" | "superadmin";
  password: string;
}

const EMPTY_CREATE: CreateForm = { name: "", email: "", role: "editor", password: "" };

/** The two confirmations this screen asks for, each carrying its subject. */
type PendingAction =
  | { kind: "active"; user: AdminUser }
  | { kind: "role"; user: AdminUser };

function nextRoleFor(user: AdminUser): "editor" | "superadmin" {
  return user.role === "editor" ? "superadmin" : "editor";
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [createErrors, setCreateErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // After a successful create: { tempPassword } if we generated one, else the
  // superadmin set it themselves.
  const [created, setCreated] = useState<{ tempPassword: string | null } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [working, setWorking] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/admin/api/users");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error === "forbidden"
            ? "You don't have permission to manage users."
            : "Could not load users."
        );
        return;
      }
      setUsers(await res.json());
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    const next: { name?: string; email?: string; password?: string } = {};
    if (!isFilled(createForm.name)) next.name = "Enter a name.";
    if (!isFilled(createForm.email)) next.email = "Enter an email.";
    else if (!isEmail(createForm.email)) next.email = "Enter a valid email address.";
    if (createForm.password && createForm.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters, or leave blank.`;
    }
    setCreateErrors(next);
    if (Object.keys(next).length > 0) return;

    setCreating(true);
    setCreateError(null);
    const body: Record<string, string> = {
      name: createForm.name,
      email: createForm.email,
      role: createForm.role,
    };
    if (createForm.password) body.password = createForm.password;

    const res = await adminFetch("/admin/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setCreating(false);
    const data = await res.json();
    if (!res.ok) {
      setCreateError(
        data?.error === "email_taken"
          ? "That email is already in use."
          : data?.error === "forbidden"
            ? "You don't have permission to create users."
            : data?.error === "invalid_request"
              ? "Check the details and try again."
              : data?.message ?? "Could not create user."
      );
      return;
    }
    setCreated({ tempPassword: (data.tempPassword as string | null) ?? null });
    setShowCreate(false);
    setCreateForm(EMPTY_CREATE);
    load();
  }

  function ask(action: PendingAction) {
    setPendingError(null);
    setPending(action);
  }

  async function runPending() {
    if (!pending) return;
    const { kind, user } = pending;
    const body =
      kind === "active"
        ? { isActive: !user.isActive }
        : { role: nextRoleFor(user) };

    setWorking(true);
    setPendingError(null);
    const res = await adminFetch(`/admin/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setWorking(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setPendingError(
        data?.error === "forbidden"
          ? kind === "active"
            ? "You don't have permission to update users."
            : "You don't have permission to change roles."
          : data?.message ??
              (kind === "active" ? "Could not update user." : "Could not change role.")
      );
      return;
    }
    setPending(null);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Admin and editor accounts. Give a new user a password (or let one be generated), then they sign in, set up 2FA and choose their own password."
        action={
          <Button
            onClick={() => {
              setShowCreate(true);
              setCreateForm(EMPTY_CREATE);
              setCreateErrors({});
              setCreateError(null);
            }}
          >
            New user
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {created && (
        <div className="mb-6">
          <Notice tone="success">
            {created.tempPassword ? (
              <>
                <p className="font-semibold">
                  User created. Send them this one-time password — it&apos;s shown once:
                </p>
                <p className="mt-1 font-mono text-base text-forest">{created.tempPassword}</p>
              </>
            ) : (
              <p className="font-semibold">
                User created. They can sign in with the password you set.
              </p>
            )}
            <p className="mt-1.5 text-xs text-moss">
              They&apos;ll be asked to choose their own password right after signing in.
            </p>
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="mt-2 font-sora text-xs font-semibold text-green-ink underline underline-offset-2"
            >
              Dismiss
            </button>
          </Notice>
        </div>
      )}

      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email", render: (u) => <span className="text-moss">{u.email}</span> },
            { key: "role", label: "Role", render: (u) => <span className="text-moss">{u.role}</span> },
            {
              key: "isActive",
              label: "Status",
              render: (u) => (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                    u.isActive ? "bg-green/18 text-green-ink" : "bg-ink/8 text-moss"
                  }`}
                >
                  {u.isActive ? "Active" : "Deactivated"}
                </span>
              ),
            },
            {
              key: "twoFAEnabled",
              label: "2FA",
              render: (u) => <span className="text-moss">{u.twoFAEnabled ? "Enabled" : "Not set"}</span>,
            },
          ]}
          rows={users}
          renderActions={(user) => (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => ask({ kind: "active", user })}
                className="font-sora text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-danger"
              >
                {user.isActive ? "Deactivate" : "Reactivate"}
              </button>
              <button
                type="button"
                onClick={() => ask({ kind: "role", user })}
                className="font-sora text-sm font-semibold text-green-ink underline underline-offset-4 transition-colors hover:text-forest"
              >
                Make {nextRoleFor(user)}
              </button>
            </div>
          )}
          emptyMessage="No users yet."
        />
      )}

      {showCreate && (
        <Modal title="New user" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
            {createError && <Notice tone="error">{createError}</Notice>}
            <TextField
              id="user-name"
              label="Name"
              required
              value={createForm.name}
              onChange={(e) => {
                setCreateForm((f) => ({ ...f, name: e.target.value }));
                setCreateErrors((p) => ({ ...p, name: undefined }));
              }}
              error={createErrors.name}
            />
            <TextField
              id="user-email"
              label="Email"
              type="email"
              required
              value={createForm.email}
              onChange={(e) => {
                setCreateForm((f) => ({ ...f, email: e.target.value }));
                setCreateErrors((p) => ({ ...p, email: undefined }));
              }}
              error={createErrors.email}
            />
            <TextField
              id="user-password"
              label="Initial password"
              type="password"
              autoComplete="new-password"
              value={createForm.password}
              onChange={(e) => {
                setCreateForm((f) => ({ ...f, password: e.target.value }));
                setCreateErrors((p) => ({ ...p, password: undefined }));
              }}
              error={createErrors.password}
              help={`At least ${MIN_PASSWORD_LENGTH} characters. Leave blank to generate a one-time password.`}
            />
            <SelectField
              id="user-role"
              label="Role"
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, role: e.target.value as "editor" | "superadmin" }))
              }
            >
              <option value="editor">Editor</option>
              <option value="superadmin">Superadmin</option>
            </SelectField>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Create user
            </Button>
          </div>
        </Modal>
      )}

      {pending && (
        <ConfirmDialog
          open
          title={
            pending.kind === "active"
              ? pending.user.isActive
                ? "Deactivate this user?"
                : "Reactivate this user?"
              : "Change this user's role?"
          }
          message={
            pending.kind === "active" ? (
              pending.user.isActive ? (
                <>
                  Do you want to deactivate{" "}
                  <strong className="font-semibold text-ink">{pending.user.name}</strong>? They will
                  no longer be able to sign in to the admin panel.
                </>
              ) : (
                <>
                  Do you want to reactivate{" "}
                  <strong className="font-semibold text-ink">{pending.user.name}</strong>? They will
                  be able to sign in again.
                </>
              )
            ) : (
              <>
                Do you want to change{" "}
                <strong className="font-semibold text-ink">{pending.user.name}</strong>&apos;s role to{" "}
                <strong className="font-semibold text-ink">{nextRoleFor(pending.user)}</strong>? This
                revokes all of their active sessions.
              </>
            )
          }
          confirmLabel={
            pending.kind === "active"
              ? pending.user.isActive
                ? "Deactivate user"
                : "Reactivate user"
              : `Make ${nextRoleFor(pending.user)}`
          }
          tone={pending.kind === "active" && pending.user.isActive ? "danger" : "primary"}
          busy={working}
          error={pendingError}
          onConfirm={runPending}
          onCancel={() => {
            setPending(null);
            setPendingError(null);
          }}
        />
      )}
    </div>
  );
}
