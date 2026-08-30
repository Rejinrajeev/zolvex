"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

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

const ENTITY_ORDER = [
  "Service",
  "BlogPost",
  "Testimonial",
  "Faq",
  "InstagramPost",
  "Place",
];

export default function TrashPage() {
  const [records, setRecords] = useState<TrashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/admin/api/trash");
    if (!res.ok) {
      setError("Could not load trash.");
      setLoading(false);
      return;
    }
    setRecords(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRestore(record: TrashRecord) {
    setRestoreError(null);
    const type = ENTITY_TO_TYPE[record.entity];
    if (!type) return;
    const res = await fetch(
      `/admin/api/trash/${type}/${record.id}/restore`,
      { method: "POST" }
    );
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

  // Group records by entity, then sort within each group by deletedAt DESC
  const grouped = records.reduce<Record<string, TrashRecord[]>>((acc, r) => {
    (acc[r.entity] ??= []).push(r);
    return acc;
  }, {});
  for (const entity of Object.keys(grouped)) {
    grouped[entity].sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">Trash</h1>
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
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : records.length === 0 ? (
        <p className="font-body text-sm text-slate">Trash is empty.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {ENTITY_ORDER.filter((entity) => grouped[entity]?.length).map(
            (entity) => (
              <section key={entity}>
                <h2 className="mb-3 font-display text-lg text-ink">
                  {ENTITY_DISPLAY[entity] ?? entity}
                </h2>
                <table className="w-full border-collapse font-body text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-left">
                      <th className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
                        Record
                      </th>
                      <th className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
                        Deleted
                      </th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[entity].map((record) => {
                      const labelField = ENTITY_LABEL_FIELD[entity] ?? "id";
                      return (
                        <tr key={record.id} className="border-b border-ink/10">
                          <td className="py-3 pr-4 text-ink">
                            {String(record[labelField] ?? record.id)}
                          </td>
                          <td className="py-3 pr-4 text-slate">
                            {new Date(record.deletedAt).toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRestore(record)}
                              className="font-body text-sm text-olive-ink underline"
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}
