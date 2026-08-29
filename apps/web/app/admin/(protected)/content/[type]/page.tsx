"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { configFor } from "@/lib/admin-content/configs";
import { Table } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";

interface ContentRecord {
  id: string;
  approvalStatus: string;
  rejectionReason?: string | null;
  [key: string]: unknown;
}

const STATUS_OPTIONS = ["", "draft", "pending_approval", "published", "rejected"] as const;

function ContentListForType() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = params.type;
  const config = configFor(type);

  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  const [role, setRole] = useState<string | null>(null);
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ContentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRecords = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    const res = await fetch(`/admin/api/content/${type}${qs.toString() ? `?${qs}` : ""}`);
    const data = await res.json();
    if (!res.ok) {
      // On a non-ok response, `data` is always the error object (never the
      // records array) -- res.ok being false is exactly what routes here.
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : "Could not load records.");
      setRecords([]);
    } else {
      setRecords(data as ContentRecord[]);
    }
    setLoading(false);
  }, [config, type, status, q]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/admin/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
      }
    })();
  }, []);

  function updateFilter(key: "status" | "q", value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    router.push(`/admin/content/${type}?${qs.toString()}`);
  }

  async function handleApprove(record: ContentRecord) {
    const res = await fetch(`/admin/api/content/${type}/${record.id}/approve`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : data?.message ?? "Could not approve this record.");
      if (res.status === 409) fetchRecords();
      return;
    }
    fetchRecords();
  }

  async function handleReject() {
    if (!rejectTarget) return;
    const res = await fetch(`/admin/api/content/${type}/${rejectTarget.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setRejectTarget(null);
    setRejectReason("");
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : data?.message ?? "Could not reject this record.");
      if (res.status === 409) fetchRecords();
      return;
    }
    fetchRecords();
  }

  async function handleDelete(record: ContentRecord) {
    if (!window.confirm(`Delete this ${config?.displayName.toLowerCase()}? It can be restored from Trash later.`)) return;
    const res = await fetch(`/admin/api/content/${type}/${record.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : "Could not delete this record.");
      return;
    }
    fetchRecords();
  }

  if (!config) {
    return <ErrorBanner message={`Unknown content type "${type}".`} />;
  }

  const isSuperadmin = role === "superadmin";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">{config.displayNamePlural}</h1>
        <Link
          href={`/admin/content/${type}/new`}
          className="border-2 border-ink px-6 py-3 font-display text-ink hover:bg-ink hover:text-paper"
        >
          New {config.displayName.toLowerCase()}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search..."
          defaultValue={q}
          onBlur={(e) => updateFilter("q", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("q", (e.target as HTMLInputElement).value);
          }}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-ink"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All statuses" : opt.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : (
        <Table
          columns={[
            ...config.listColumns.map((col) => ({ key: col.key, label: col.label })),
            {
              key: "approvalStatus",
              label: "Status",
              render: (row: ContentRecord) => <StatusBadge status={row.approvalStatus} />,
            },
          ]}
          rows={records}
          renderActions={(row) => (
            <div className="flex justify-end gap-2">
              <Link href={`/admin/content/${type}/${row.id}`} className="font-body text-sm text-olive-ink underline">
                Edit
              </Link>
              {isSuperadmin && row.approvalStatus === "pending_approval" && (
                <>
                  <button type="button" onClick={() => handleApprove(row)} className="font-body text-sm text-olive-ink underline">
                    Approve
                  </button>
                  <button type="button" onClick={() => setRejectTarget(row)} className="font-body text-sm text-ink underline">
                    Reject
                  </button>
                </>
              )}
              <button type="button" onClick={() => handleDelete(row)} className="font-body text-sm text-ink underline">
                Delete
              </button>
            </div>
          )}
          emptyMessage={`No ${config.displayNamePlural.toLowerCase()} yet.`}
        />
      )}

      {rejectTarget && (
        <Modal title={`Reject this ${config.displayName.toLowerCase()}`} onClose={() => setRejectTarget(null)}>
          <label className="mb-4 block font-body text-sm text-ink">
            Reason
            <textarea
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1 block w-full border border-ink/20 bg-paper p-3 font-body text-ink focus:border-olive-ink focus:outline-none"
              rows={3}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRejectTarget(null)} className="border-2 border-ink px-6 py-3 font-display text-ink">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={!rejectReason}
              className="bg-gold px-6 py-3 font-display text-ink disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ContentListPage() {
  return (
    <Suspense fallback={<p className="font-body text-sm text-slate">Loading…</p>}>
      <ContentListForType />
    </Suspense>
  );
}
