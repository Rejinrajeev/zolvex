"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

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
      const res = await fetch("/admin/api/sessions");
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
    const res = await fetch(`/admin/api/sessions/${session.id}/revoke`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.message ?? "Could not revoke session.");
      return;
    }
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">Active sessions</h1>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="font-body text-sm text-slate">No active sessions.</p>
      ) : (
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left">
              {["Admin", "IP", "Last active", "Expires"].map((h) => (
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
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-ink/10">
                <td className="py-3 pr-4 text-ink">
                  <div>{session.admin.name}</div>
                  <div className="font-body text-xs text-slate">
                    {session.admin.email}
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate">
                  {session.ipAddress ?? "—"}
                </td>
                <td className="py-3 pr-4 text-slate">
                  {new Date(session.lastActiveAt).toLocaleString()}
                </td>
                <td className="py-3 pr-4 text-slate">
                  {new Date(session.expiresAt).toLocaleString()}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleRevoke(session)}
                    className="font-body text-sm text-ink underline"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
