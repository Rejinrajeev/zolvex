"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Table } from "@/components/admin/Table";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PageHeader, SkeletonRows } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin/fetch";

interface AdminSession {
  id: string;
  adminId: string;
  admin: { name: string; email: string };
  ipAddress: string | null;
  deviceInfo: string | null;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminSession | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/admin/api/sessions");
      if (!res.ok) {
        setError("Could not load sessions.");
        return;
      }
      setSessions(await res.json());
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError(null);
    const res = await adminFetch(`/admin/api/sessions/${revokeTarget.id}/revoke`, {
      method: "POST",
    });
    setRevoking(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRevokeError(data?.message ?? "Could not revoke session. Please try again.");
      return;
    }
    setRevokeTarget(null);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Active sessions"
        description="Every signed-in admin device. Revoke one to sign that device out."
      />
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          columns={[
            {
              key: "admin",
              label: "Admin",
              render: (s) => (
                <div>
                  <div className="font-medium text-ink">{s.admin.name}</div>
                  <div className="font-sora text-xs text-moss">{s.admin.email}</div>
                </div>
              ),
            },
            { key: "ipAddress", label: "IP", render: (s) => s.ipAddress ?? "—" },
            {
              key: "lastActiveAt",
              label: "Last active",
              render: (s) => new Date(s.lastActiveAt).toLocaleString(),
            },
            {
              key: "expiresAt",
              label: "Expires",
              render: (s) => new Date(s.expiresAt).toLocaleString(),
            },
          ]}
          rows={sessions}
          renderActions={(s) => (
            <button
              type="button"
              onClick={() => {
                setRevokeError(null);
                setRevokeTarget(s);
              }}
              className="font-sora text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-danger"
            >
              Revoke
            </button>
          )}
          emptyMessage="No active sessions."
        />
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revoke this session?"
        message={
          <>
            Do you want to revoke the session for{" "}
            <strong className="font-semibold text-ink">{revokeTarget?.admin.name}</strong>? They will
            be signed out on their next action and will have to sign in again.
          </>
        }
        confirmLabel={revoking ? "Revoking…" : "Revoke session"}
        busy={revoking}
        error={revokeError}
        onConfirm={confirmRevoke}
        onCancel={() => {
          setRevokeTarget(null);
          setRevokeError(null);
        }}
      />
    </div>
  );
}
