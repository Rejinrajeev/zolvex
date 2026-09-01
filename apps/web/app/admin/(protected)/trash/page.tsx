"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Table } from "@/components/admin/Table";
import { PageHeader, SkeletonRows, EmptyState } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin/fetch";

interface TrashRecord {
  id: string;
  entity: string;
  deletedAt: string;
  [key: string]: unknown;
}

const ENTITY_TO_TYPE: Record<string, string> = {
  Service: "service",
  BlogPost: "blog-post",
  Testimonial: "testimonial",
  Faq: "faq",
  InstagramPost: "instagram-post",
  Place: "place",
};

const ENTITY_LABEL_FIELD: Record<string, string> = {
  Service: "name",
  BlogPost: "title",
  Testimonial: "name",
  Faq: "question",
  InstagramPost: "permalink",
  Place: "name",
};

const ENTITY_DISPLAY: Record<string, string> = {
  Service: "Services",
  BlogPost: "Blog Posts",
  Testimonial: "Testimonials",
  Faq: "FAQs",
  InstagramPost: "Instagram Posts",
  Place: "Places",
};

const ENTITY_ORDER = ["Service", "BlogPost", "Testimonial", "Faq", "InstagramPost", "Place"];

export default function TrashPage() {
  const [records, setRecords] = useState<TrashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/admin/api/trash");
      if (!res.ok) {
        setError("Could not load trash.");
        return;
      }
      setRecords(await res.json());
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRestore(record: TrashRecord) {
    setRestoreError(null);
    const type = ENTITY_TO_TYPE[record.entity];
    if (!type) return;
    const res = await adminFetch(`/admin/api/trash/${type}/${record.id}/restore`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      if (data?.error === "slug_conflict") {
        setRestoreError(
          "Cannot restore: another live record already uses the same slug. Rename or delete that record first."
        );
      } else if (data?.error === "forbidden") {
        setRestoreError("You don't have permission to restore this record.");
      } else {
        setRestoreError(data?.message ?? "Could not restore this record.");
      }
      return;
    }
    load();
  }

  const grouped = records.reduce<Record<string, TrashRecord[]>>((acc, r) => {
    (acc[r.entity] ??= []).push(r);
    return acc;
  }, {});
  for (const entity of Object.keys(grouped)) {
    grouped[entity].sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }

  return (
    <div>
      <PageHeader title="Trash" description="Deleted records, grouped by type. Restore brings one back live." />
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {restoreError && (
        <div className="mb-4">
          <ErrorBanner message={restoreError} />
        </div>
      )}
      {loading ? (
        <SkeletonRows />
      ) : records.length === 0 ? (
        <EmptyState title="Trash is empty." />
      ) : (
        <div className="flex flex-col gap-8">
          {ENTITY_ORDER.filter((entity) => grouped[entity]?.length).map((entity) => (
            <section key={entity}>
              <h2 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-moss">
                {ENTITY_DISPLAY[entity] ?? entity}
              </h2>
              <Table
                columns={[
                  {
                    key: "record",
                    label: "Record",
                    render: (r) => String(r[ENTITY_LABEL_FIELD[entity] ?? "id"] ?? r.id),
                  },
                  {
                    key: "deletedAt",
                    label: "Deleted",
                    render: (r) => new Date(r.deletedAt).toLocaleString(),
                  },
                ]}
                rows={grouped[entity]}
                renderActions={(r) => (
                  <button
                    type="button"
                    onClick={() => handleRestore(r)}
                    className="font-sora text-sm font-semibold text-green-ink underline underline-offset-4 transition-colors hover:text-forest"
                  >
                    Restore
                  </button>
                )}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
