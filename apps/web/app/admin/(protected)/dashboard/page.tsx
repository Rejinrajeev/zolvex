"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, SkeletonRows, Notice } from "@/components/admin/ui";
import { IconArrow } from "@/components/icons";
import { adminFetch } from "@/lib/admin/fetch";

const SHORTCUTS = [
  { label: "Services", href: "/admin/content/service", hint: "What the site says you do" },
  { label: "Blog Posts", href: "/admin/content/blog-post", hint: "Instagram-linked updates" },
  { label: "Testimonials", href: "/admin/content/testimonial", hint: "Client reviews" },
  { label: "FAQs", href: "/admin/content/faq", hint: "Questions on the site" },
  { label: "Enquiries", href: "/admin/enquiries", hint: "Walkthrough requests" },
  { label: "Approvals", href: "/admin/approvals", hint: "Waiting for a decision" },
];

export default function DashboardPage() {
  const [pending, setPending] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch("/admin/api/dashboard/approvals");
        if (res.ok) {
          const list = await res.json();
          setPending(Array.isArray(list) ? list.length : 0);
        }
      } catch {
        setError("Could not reach the server. Some numbers may be missing.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Everything the public site shows is published from here. Changes go live within a couple of minutes."
      />

      {error && (
        <div className="mb-6">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {loading ? (
        <div className="mb-8">
          <SkeletonRows rows={2} />
        </div>
      ) : (
        <Link
          href="/admin/approvals"
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl bg-forest px-6 py-5 text-cream transition-transform hover:-translate-y-0.5"
        >
          <div>
            <p className="font-sora text-sm text-cream/70">
              {pending === 1 ? "1 record waiting for approval" : `${pending ?? 0} records waiting for approval`}
            </p>
            <p className="mt-1 font-sora text-lg font-semibold">
              {pending ? "Review them before they can go live." : "You're all caught up."}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green px-4 py-2 font-sora text-sm font-semibold text-forest">
            Open approvals
            <IconArrow aria-hidden className="h-4 w-4" />
          </span>
        </Link>
      )}

      <h2 className="mb-3 font-sora text-sm font-semibold uppercase tracking-wide text-moss">
        Jump to
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-2xl bg-paper p-5 shadow-[0_18px_44px_-30px_rgba(12,58,44,0.3)] ring-1 ring-ink/5 transition-transform hover:-translate-y-1"
          >
            <p className="flex items-center justify-between font-sora text-base font-semibold text-ink">
              {s.label}
              <IconArrow
                aria-hidden
                className="h-4 w-4 text-green-ink transition-transform group-hover:translate-x-1"
              />
            </p>
            <p className="mt-1 font-sora text-sm text-moss">{s.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
