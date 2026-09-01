"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Table } from "@/components/admin/Table";
import { PageHeader, SelectField, TextField, SkeletonRows } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin/fetch";

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
    adminFetch(`/admin/api/audit-log${qstr ? `?${qstr}` : ""}`)
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
      <PageHeader title="Audit log" description="Every change staff made, newest first. Filter to narrow it down." />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          id="entity"
          label="Entity"
          value={entity}
          onChange={(e) => updateParam("entity", e.target.value)}
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All entities" : opt}
            </option>
          ))}
        </SelectField>
        <TextField
          id="adminId"
          label="Admin ID"
          placeholder="Any"
          value={adminId}
          onChange={(e) => updateParam("adminId", e.target.value)}
        />
        <TextField
          id="from"
          label="From"
          type="date"
          value={from}
          onChange={(e) => updateParam("from", e.target.value)}
        />
        <TextField
          id="to"
          label="To"
          type="date"
          value={to}
          onChange={(e) => updateParam("to", e.target.value)}
        />
      </div>

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
              key: "timestamp",
              label: "Time",
              render: (l) => new Date(l.timestamp).toLocaleString(),
            },
            {
              key: "action",
              label: "Action",
              render: (l) => (
                <span className="font-sora text-xs font-semibold uppercase tracking-wide text-ink">
                  {l.action}
                </span>
              ),
            },
            {
              key: "entity",
              label: "Entity",
              render: (l) => (
                <span>
                  {l.entity}{" "}
                  <span className="font-mono text-xs text-moss/70">{l.entityId.slice(0, 8)}…</span>
                </span>
              ),
            },
            {
              key: "adminId",
              label: "Admin",
              render: (l) => <span className="font-mono text-xs text-moss">{l.adminId.slice(0, 8)}…</span>,
            },
            {
              key: "diff",
              label: "Changes",
              render: (l) => {
                const s = JSON.stringify(l.diff);
                return (
                  <span title={s} className="font-mono text-xs text-moss">
                    {s.length > 80 ? `${s.slice(0, 80)}…` : s}
                  </span>
                );
              },
            },
          ]}
          rows={logs}
          emptyMessage="No audit log entries."
        />
      )}
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <AuditLogInner />
    </Suspense>
  );
}
