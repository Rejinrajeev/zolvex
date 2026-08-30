"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  entity: string;
  entityId: string;
  diff: unknown;
  ipAddress: string | null;
  timestamp: string;
}

const ENTITY_OPTIONS = [
  "",
  "Service",
  "BlogPost",
  "Testimonial",
  "Faq",
  "InstagramPost",
  "Place",
  "PageContent",
  "Admin",
] as const;

function AuditLogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entity = searchParams.get("entity") ?? "";
  const adminId = searchParams.get("adminId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (entity) qs.set("entity", entity);
    if (adminId) qs.set("adminId", adminId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const qstr = qs.toString();
    fetch(`/admin/api/audit-log${qstr ? `?${qstr}` : ""}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load_failed");
        return res.json() as Promise<AuditLogEntry[]>;
      })
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load audit log.");
        setLoading(false);
      });
  }, [entity, adminId, from, to]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`/admin/audit-log?${params.toString()}`);
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">Audit Log</h1>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={entity}
          onChange={(e) => updateParam("entity", e.target.value)}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-sm text-ink focus:border-olive-ink focus:outline-none"
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All entities" : opt}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Admin ID"
          value={adminId}
          onChange={(e) => updateParam("adminId", e.target.value)}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-sm text-ink placeholder:text-slate focus:border-olive-ink focus:outline-none"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => updateParam("from", e.target.value)}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-sm text-ink focus:border-olive-ink focus:outline-none"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => updateParam("to", e.target.value)}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-sm text-ink focus:border-olive-ink focus:outline-none"
        />
      </div>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="font-body text-sm text-slate">No audit log entries.</p>
      ) : (
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left">
              {["Time", "Action", "Entity", "Admin", "Changes"].map((h) => (
                <th
                  key={h}
                  className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const diffStr = JSON.stringify(log.diff);
              return (
                <tr key={log.id} className="border-b border-ink/10 align-top">
                  <td className="py-3 pr-4 text-slate">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-stamp text-[0.65rem] uppercase tracking-wide text-ink">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate">
                    {log.entity}
                    <span className="ml-1 font-mono text-[0.65rem] text-slate/60">
                      {log.entityId.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate">
                    {log.adminId.slice(0, 8)}…
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      title={diffStr}
                      className="cursor-default font-mono text-xs text-slate"
                    >
                      {diffStr.length > 80
                        ? `${diffStr.slice(0, 80)}…`
                        : diffStr}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense
      fallback={<p className="font-body text-sm text-slate">Loading…</p>}
    >
      <AuditLogInner />
    </Suspense>
  );
}
