"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Table } from "@/components/admin/Table";
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

  async function handleRevoke(session: AdminSession) {
    if (
      !window.confirm(
        `Revoke session for ${session.admin.name}? They will be signed out on their next action.`
      )
    )
      return;
    const res = await adminFetch(`/admin/api/sessions/${session.id}/revoke`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.message ?? "Could not revoke session.");
      return;
    }
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
              onClick={() => handleRevoke(s)}
              className="font-sora text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-danger"
            >
              Revoke
            </button>
          )}
          emptyMessage="No active sessions."
        />
      )}
    </div>
  );
}
