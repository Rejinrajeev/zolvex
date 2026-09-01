"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Table } from "@/components/admin/Table";
import { PageHeader, SelectField, SkeletonRows } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin/fetch";

interface Enquiry {
  id: string;
  serviceName: string;
  name: string;
  phone: string;
  place: string;
  preferredDate: string | null;
  status: string;
  createdAt: string;
}

const STATUS_OPTIONS = ["", "new", "pushed_to_crm", "failed", "needs_manual_push"] as const;

function EnquiriesListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    adminFetch(`/admin/api/enquiries${qs}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load_failed");
        return res.json() as Promise<Enquiry[]>;
      })
      .then((data) => {
        setEnquiries(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load enquiries.");
        setLoading(false);
      });
  }, [status]);

  function setStatusFilter(s: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (s) params.set("status", s);
    else params.delete("status");
    router.replace(`/admin/enquiries?${params.toString()}`);
  }

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="Walkthrough requests submitted from the site, and how each one moved to the CRM."
      />

      <div className="mb-5 max-w-xs">
        <SelectField
          id="status"
          label="Status"
          value={status}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All statuses" : opt.replace(/_/g, " ")}
            </option>
          ))}
        </SelectField>
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
            { key: "name", label: "Client" },
            { key: "serviceName", label: "Service" },
            { key: "phone", label: "Phone" },
            { key: "place", label: "Place" },
            { key: "status", label: "Status", render: (r) => r.status.replace(/_/g, " ") },
            {
              key: "createdAt",
              label: "Date",
              render: (r) => new Date(r.createdAt).toLocaleDateString(),
            },
          ]}
          rows={enquiries}
          renderActions={(r) => (
            <button
              type="button"
              onClick={() => router.push(`/admin/enquiries/${r.id}`)}
              className="font-sora text-sm font-semibold text-green-ink underline underline-offset-4 transition-colors hover:text-forest"
            >
              Open
            </button>
          )}
          emptyMessage="No enquiries yet."
        />
      )}
    </div>
  );
}

export default function EnquiriesPage() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <EnquiriesListInner />
    </Suspense>
  );
}
