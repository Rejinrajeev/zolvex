"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-ink/10 py-3">
      <dt className="font-stamp text-[0.65rem] uppercase tracking-wide text-slate">
        {label}
      </dt>
      <dd className="mt-0.5 font-body text-sm text-ink">{value ?? "—"}</dd>
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
    fetch(`/admin/api/enquiries/${id}`)
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
        setError(
          err.message === "not_found"
            ? "Enquiry not found."
            : "Could not load enquiry."
        );
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="font-body text-sm text-slate">Loading…</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!enquiry) return null;

  return (
    <div className="max-w-xl">
      <button
        type="button"
        onClick={() => router.push("/admin/enquiries")}
        className="mb-6 font-body text-sm text-olive-ink underline"
      >
        ← Back to enquiries
      </button>
      <h1 className="mb-6 font-display text-3xl text-ink">Enquiry</h1>
      <dl>
        <Field label="Client name" value={enquiry.name} />
        <Field label="Phone" value={enquiry.phone} />
        <Field label="Service" value={enquiry.serviceName} />
        <Field label="Place" value={enquiry.place} />
        <Field
          label="Preferred date"
          value={
            enquiry.preferredDate
              ? new Date(enquiry.preferredDate).toLocaleDateString()
              : null
          }
        />
        <Field label="Status" value={enquiry.status.replace(/_/g, " ")} />
        <Field
          label="Submitted"
          value={new Date(enquiry.createdAt).toLocaleString()}
        />
        <Field label="Attempt count" value={String(enquiry.attemptCount)} />
        {enquiry.crmResponse != null && (
          <div className="border-b border-ink/10 py-3">
            <dt className="font-stamp text-[0.65rem] uppercase tracking-wide text-slate">
              CRM response
            </dt>
            <dd className="mt-0.5">
              <pre className="overflow-x-auto bg-paper-dim p-3 font-body text-xs text-ink">
                {JSON.stringify(enquiry.crmResponse, null, 2)}
              </pre>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
