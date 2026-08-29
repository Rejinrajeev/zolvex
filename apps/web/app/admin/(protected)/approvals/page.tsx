"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";

interface PendingRecord {
  id: string;
  entity: string;
  createdAt?: string;
  [key: string]: unknown;
}

// Maps Express entity names → URL type slugs used by Plan 3b content BFF
const ENTITY_TO_TYPE: Record<string, string> = {
  Service: "service",
  BlogPost: "blog-post",
  Testimonial: "testimonial",
  Faq: "faq",
  InstagramPost: "instagram-post",
};

// Primary identifying text field per entity
const ENTITY_LABEL_FIELD: Record<string, string> = {
  Service: "name",
  BlogPost: "title",
  Testimonial: "name",
  Faq: "question",
  InstagramPost: "permalink",
};

export default function ApprovalsPage() {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const [approvalRes, meRes] = await Promise.all([
      fetch("/admin/api/dashboard/approvals"),
      fetch("/admin/api/auth/me"),
    ]);
    if (!approvalRes.ok) {
      setError("Could not load pending approvals.");
      setLoading(false);
      return;
    }
    setRecords(await approvalRes.json());
    if (meRes.ok) {
      const me = await meRes.json();
      setRole(me?.role ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(record: PendingRecord) {
    const type = ENTITY_TO_TYPE[record.entity];
    if (!type) return;
    setSubmitting(true);
    const res = await fetch(`/admin/api/content/${type}/${record.id}/approve`, {
      method: "POST",
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(
        data?.error === "invalid_state"
          ? "This record was already handled by another admin."
          : data?.message ?? "Could not approve."
      );
      if (res.status === 409) load();
      return;
    }
    load();
  }

  async function handleReject() {
    if (!rejectTarget) return;
    const type = ENTITY_TO_TYPE[rejectTarget.entity];
    if (!type) return;
    setSubmitting(true);
    const res = await fetch(
      `/admin/api/content/${type}/${rejectTarget.id}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      }
    );
    setSubmitting(false);
    setRejectTarget(null);
    setRejectReason("");
    if (!res.ok) {
      const data = await res.json();
      setError(
        data?.error === "invalid_state"
          ? "This record was already handled by another admin."
          : data?.message ?? "Could not reject."
      );
      if (res.status === 409) load();
      return;
    }
    load();
  }

  const isSuperadmin = role === "superadmin";

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">Pending approvals</h1>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : records.length === 0 ? (
        <p className="font-body text-sm text-slate">
          No records pending approval.
        </p>
      ) : (
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left">
              <th className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
                Type
              </th>
              <th className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
                Record
              </th>
              <th className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
                Submitted
              </th>
              {isSuperadmin && <th className="py-2" />}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const labelField = ENTITY_LABEL_FIELD[record.entity] ?? "id";
              return (
                <tr
                  key={`${record.entity}-${record.id}`}
                  className="border-b border-ink/10"
                >
                  <td className="py-3 pr-4 text-ink">{record.entity}</td>
                  <td className="py-3 pr-4 text-ink">
                    {String(record[labelField] ?? record.id)}
                  </td>
                  <td className="py-3 pr-4 text-slate">
                    {record.createdAt
                      ? new Date(record.createdAt as string).toLocaleDateString()
                      : "—"}
                  </td>
                  {isSuperadmin && (
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleApprove(record)}
                          className="font-body text-sm text-olive-ink underline disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setRejectTarget(record)}
                          className="font-body text-sm text-ink underline disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rejectTarget && (
        <Modal
          title={`Reject ${rejectTarget.entity}`}
          onClose={() => {
            setRejectTarget(null);
            setRejectReason("");
          }}
        >
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
            <button
              type="button"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              className="border border-ink/20 px-4 py-2 font-body text-sm text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
              className="bg-ink px-4 py-2 font-body text-sm text-paper disabled:opacity-50"
            >
              {submitting ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
