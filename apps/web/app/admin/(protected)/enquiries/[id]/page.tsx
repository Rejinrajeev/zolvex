"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Panel, SkeletonRows } from "@/components/admin/ui";
import { IconArrow } from "@/components/icons";
import { adminFetch } from "@/lib/admin/fetch";

interface EnquiryDetail {
  id: string;
  serviceName: string;
  serviceId: string | null;
  name: string;
  phone: string;
  place: string;
  preferredDate: string | null;
  status: string;
  crmResponse: unknown;
  ipAddress: string | null;
  attemptCount: number;
  createdAt: string;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-ink/8 py-3 last:border-0 sm:flex-row sm:gap-6">
      <dt className="font-sora text-xs font-semibold uppercase tracking-wide text-moss sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="font-sora text-sm text-ink">{value ?? "—"}</dd>
    </div>
  );
}

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch(`/admin/api/enquiries/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("not_found");
        if (!res.ok) throw new Error("load_failed");
        return res.json() as Promise<EnquiryDetail>;
      })
      .then((data) => {
        setEnquiry(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message === "not_found" ? "Enquiry not found." : "Could not load enquiry.");
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="max-w-xl">
      <button
        type="button"
        onClick={() => router.push("/admin/enquiries")}
        className="mb-6 inline-flex items-center gap-1.5 font-sora text-sm font-semibold text-green-ink"
      >
        <IconArrow aria-hidden className="h-4 w-4 rotate-180" />
        Back to enquiries
      </button>
      <h1 className="mb-6 font-sora text-2xl font-bold tracking-tight text-ink">Enquiry</h1>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : enquiry ? (
        <Panel>
          <dl>
            <Row label="Client name" value={enquiry.name} />
            <Row label="Phone" value={enquiry.phone} />
            <Row label="Service" value={enquiry.serviceName} />
            <Row label="Place" value={enquiry.place} />
            <Row
              label="Preferred date"
              value={
                enquiry.preferredDate
                  ? new Date(enquiry.preferredDate).toLocaleDateString()
                  : null
              }
            />
            <Row label="Status" value={enquiry.status.replace(/_/g, " ")} />
            <Row label="Submitted" value={new Date(enquiry.createdAt).toLocaleString()} />
            <Row label="Attempts" value={String(enquiry.attemptCount)} />
            {enquiry.crmResponse != null && (
              <div className="border-b border-ink/8 py-3 last:border-0">
                <dt className="font-sora text-xs font-semibold uppercase tracking-wide text-moss">
                  CRM response
                </dt>
                <dd className="mt-1.5">
                  <pre className="overflow-x-auto rounded-lg bg-mist p-3 font-mono text-xs text-ink">
                    {JSON.stringify(enquiry.crmResponse, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
        </Panel>
      ) : null}
    </div>
  );
}
