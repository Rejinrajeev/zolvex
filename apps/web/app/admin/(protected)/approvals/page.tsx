"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";
import { Table } from "@/components/admin/Table";
import { adminFetch } from "@/lib/admin/fetch";
import {
  Button,
  PageHeader,
  SkeletonRows,
  EmptyState,
  TextAreaField,
} from "@/components/admin/ui";

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
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [approvalRes, meRes] = await Promise.all([
        adminFetch("/admin/api/dashboard/approvals"),
        adminFetch("/admin/api/auth/me"),
      ]);
      if (!approvalRes.ok) {
        setError("Could not load pending approvals.");
        return;
      }
      setRecords(await approvalRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setRole(me?.role ?? null);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(record: PendingRecord) {
    const type = ENTITY_TO_TYPE[record.entity];
    if (!type) return;
    setSubmitting(true);
    const res = await adminFetch(`/admin/api/content/${type}/${record.id}/approve`, {
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
    if (!rejectReason.trim()) {
      setRejectError("Give a reason so the editor knows what to fix.");
      return;
    }
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
    setRejectError(null);
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
      <PageHeader
        title="Pending approvals"
        description={
          isSuperadmin
            ? "Content editors submitted these. Approve to publish, or reject with a note."
            : "Content waiting for a superadmin to review."
        }
      />
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <SkeletonRows />
      ) : records.length === 0 ? (
        <EmptyState title="Nothing waiting for approval.">
          Submitted content shows up here for review.
        </EmptyState>
      ) : (
        <Table
          columns={[
            { key: "entity", label: "Type" },
            {
              key: "record",
              label: "Record",
              render: (r) =>
                String(r[ENTITY_LABEL_FIELD[r.entity] ?? "id"] ?? r.id),
            },
            {
              key: "createdAt",
              label: "Submitted",
              render: (r) =>
                r.createdAt ? new Date(r.createdAt as string).toLocaleDateString() : "—",
            },
          ]}
          rows={records.map((r): PendingRecord => ({ ...r, id: `${r.entity}-${r.id}` }))}
          renderActions={
            isSuperadmin
              ? (r) => {
                  const original = { ...r, id: (r.id as string).replace(`${r.entity}-`, "") };
                  return (
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleApprove(original)}
                        className="font-sora text-sm font-semibold text-green-ink underline underline-offset-4 transition-colors hover:text-forest disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setRejectTarget(original);
                          setRejectError(null);
                        }}
                        className="font-sora text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-danger disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  );
                }
              : undefined
          }
        />
      )}

      {rejectTarget && (
        <Modal
          title={`Reject ${rejectTarget.entity}`}
          onClose={() => {
            setRejectTarget(null);
            setRejectReason("");
            setRejectError(null);
          }}
        >
          <TextAreaField
            id="approval-reject-reason"
            label="Reason"
            required
            rows={3}
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              setRejectError(null);
            }}
            error={rejectError ?? undefined}
          />
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
                setRejectError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={submitting}>
              {submitting ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
