"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

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

const STATUS_OPTIONS = [
  "",
  "new",
  "pushed_to_crm",
  "failed",
  "needs_manual_push",
] as const;

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
    fetch(`/admin/api/enquiries${qs}`)
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
      <h1 className="mb-6 font-display text-3xl text-ink">Enquiries</h1>
      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-sm text-ink focus:border-olive-ink focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All statuses" : opt.replace(/_/g, " ")}
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
      ) : enquiries.length === 0 ? (
        <p className="font-body text-sm text-slate">No enquiries found.</p>
      ) : (
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left">
              {["Client", "Service", "Phone", "Place", "Status", "Date"].map(
                (h) => (
                  <th
                    key={h}
                    className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enq) => (
              <tr
                key={enq.id}
                onClick={() => router.push(`/admin/enquiries/${enq.id}`)}
                className="cursor-pointer border-b border-ink/10 hover:bg-paper-dim"
              >
                <td className="py-3 pr-4 text-ink">{enq.name}</td>
                <td className="py-3 pr-4 text-slate">{enq.serviceName}</td>
                <td className="py-3 pr-4 text-slate">{enq.phone}</td>
                <td className="py-3 pr-4 text-slate">{enq.place}</td>
                <td className="py-3 pr-4 text-slate">
                  {enq.status.replace(/_/g, " ")}
                </td>
                <td className="py-3 pr-4 text-slate">
                  {new Date(enq.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function EnquiriesPage() {
  return (
    <Suspense
      fallback={<p className="font-body text-sm text-slate">Loading…</p>}
    >
      <EnquiriesListInner />
    </Suspense>
  );
}
