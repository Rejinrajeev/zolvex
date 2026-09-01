"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { configFor } from "@/lib/admin-content/configs";
import { Table } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";
import {
  Button,
  LinkButton,
  PageHeader,
  SkeletonRows,
  EmptyState,
  TextField,
  SelectField,
  TextAreaField,
  Notice,
} from "@/components/admin/ui";
import { IconDragHandle } from "@/components/icons";
import { adminFetch } from "@/lib/admin/fetch";

interface ContentRecord {
  id: string;
  approvalStatus: string;
  rejectionReason?: string | null;
  [key: string]: unknown;
}

const STATUS_OPTIONS = ["", "draft", "pending_approval", "published", "rejected"] as const;

function isReorderable(fields: { name: string }[]): boolean {
  return fields.some((f) => f.name === "order");
}

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
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const isSuperadmin = role === "superadmin";

  const fetchRecords = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    try {
      const res = await adminFetch(`/admin/api/content/${type}${qs.toString() ? `?${qs}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error === "forbidden"
            ? "You don't have permission for this action."
            : "Could not load records."
        );
        setRecords([]);
      } else {
        setRecords(data as ContentRecord[]);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [config, type, status, q]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    (async () => {
      const res = await adminFetch("/admin/api/auth/me");
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
    const res = await adminFetch(`/admin/api/content/${type}/${record.id}/approve`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(
        data?.error === "forbidden"
          ? "You don't have permission for this action."
          : data?.message ?? "Could not approve this record."
      );
      if (res.status === 409) fetchRecords();
      return;
    }
    fetchRecords();
  }

  async function handleReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError("Give a reason so the editor knows what to fix.");
      return;
    }
    const res = await adminFetch(`/admin/api/content/${type}/${rejectTarget.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setRejectTarget(null);
    setRejectReason("");
    setRejectError(null);
    if (!res.ok) {
      const data = await res.json();
      setError(
        data?.error === "forbidden"
          ? "You don't have permission for this action."
          : data?.message ?? "Could not reject this record."
      );
      if (res.status === 409) fetchRecords();
      return;
    }
    fetchRecords();
  }

  async function handleDelete(record: ContentRecord) {
    if (
      !window.confirm(
        `Delete this ${config?.displayName.toLowerCase()}? It can be restored from Trash later.`
      )
    )
      return;
    const res = await adminFetch(`/admin/api/content/${type}/${record.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(
        data?.error === "forbidden"
          ? "You don't have permission for this action."
          : "Could not delete this record."
      );
      return;
    }
    fetchRecords();
  }

  const canReorder = isSuperadmin && isReorderable(config?.fields ?? []) && !status && !q;

  async function handleDrop(targetId: string) {
    if (!canReorder || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const fromIndex = records.findIndex((r) => r.id === draggedId);
    const toIndex = records.findIndex((r) => r.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      return;
    }
    const reordered = [...records];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setRecords(reordered);
    setDraggedId(null);

    const res = await adminFetch(`/admin/api/content/${type}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: reordered.map((r, i) => ({ id: r.id, order: i })) }),
    });
    if (!res.ok) {
      setError("Could not save the new order. Reloading the list.");
      fetchRecords();
    }
  }

  if (!config) {
    return <ErrorBanner message={`Unknown content type "${type}".`} />;
  }

  const filterActive = Boolean(status || q);

  function rowActions(row: ContentRecord) {
    return (
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/admin/content/${type}/${row.id}`)}
          className="font-sora text-sm font-semibold text-green-ink underline underline-offset-4 transition-colors hover:text-forest"
        >
          Edit
        </button>
        {isSuperadmin && row.approvalStatus === "pending_approval" && (
          <>
            <button
              type="button"
              onClick={() => handleApprove(row)}
              className="font-sora text-sm font-semibold text-green-ink underline underline-offset-4 transition-colors hover:text-forest"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                setRejectTarget(row);
                setRejectError(null);
              }}
              className="font-sora text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-danger"
            >
              Reject
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => handleDelete(row)}
          className="font-sora text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-danger"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={config.displayNamePlural}
        action={
          <LinkButton href={`/admin/content/${type}/new`}>
            New {config.displayName.toLowerCase()}
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <TextField
          id="search"
          label="Search"
          type="search"
          placeholder="Filter by text…"
          defaultValue={q}
          wrapperClassName="w-56"
          onBlur={(e) => updateFilter("q", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("q", (e.target as HTMLInputElement).value);
          }}
        />
        <SelectField
          id="status-filter"
          label="Status"
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All statuses" : opt.replace("_", " ")}
            </option>
          ))}
        </SelectField>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {isSuperadmin && isReorderable(config.fields) && filterActive && (
        <p className="mb-3 font-sora text-sm text-moss">
          Clear the filters to drag-and-drop reorder — reordering works on the full list only.
        </p>
      )}

      {loading ? (
        <SkeletonRows />
      ) : canReorder ? (
        records.length === 0 ? (
          <EmptyState title={`No ${config.displayNamePlural.toLowerCase()} yet.`} />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-paper shadow-[0_18px_44px_-28px_rgba(12,58,44,0.28)] ring-1 ring-ink/5">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sora text-sm">
                <thead>
                  <tr className="bg-mist text-left">
                    <th className="px-4 py-3" />
                    {config.listColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-moss"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-moss">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {records.map((row) => (
                    <tr
                      key={row.id}
                      draggable
                      onDragStart={() => setDraggedId(row.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(row.id)}
                      className={`transition-colors ${
                        draggedId === row.id ? "opacity-60" : "hover:bg-mist/50"
                      }`}
                    >
                      <td className="cursor-grab px-4 py-3.5 text-moss">
                        <IconDragHandle className="h-5 w-5" />
                      </td>
                      {config.listColumns.map((col) => (
                        <td key={col.key} className="px-4 py-3.5 align-top text-ink">
                          {String(row[col.key] ?? "")}
                        </td>
                      ))}
                      <td className="px-4 py-3.5 align-top">
                        <StatusBadge status={row.approvalStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-right">{rowActions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
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
          renderActions={rowActions}
          emptyMessage={`No ${config.displayNamePlural.toLowerCase()} yet.`}
        />
      )}

      {rejectTarget && (
        <Modal
          title={`Reject this ${config.displayName.toLowerCase()}`}
          onClose={() => setRejectTarget(null)}
        >
          <div className="flex flex-col gap-4">
            <TextAreaField
              id="reject-reason"
              label="Reason"
              required
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError(null);
              }}
              error={rejectError ?? undefined}
              rows={3}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Reject
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ContentListPage() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <ContentListForType />
    </Suspense>
  );
}
