"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const CONTENT_TYPES = [
  { label: "Services", href: "/admin/content/service" },
  { label: "Blog Posts", href: "/admin/content/blog-post" },
  { label: "Testimonials", href: "/admin/content/testimonial" },
  { label: "FAQs", href: "/admin/content/faq" },
  { label: "Instagram Posts", href: "/admin/content/instagram-post" },
];

const PAGE_KEYS = [
  { label: "Hero", href: "/admin/pages/hero" },
  { label: "Footer", href: "/admin/pages/footer" },
  { label: "WhatsApp", href: "/admin/pages/whatsapp" },
  { label: "Google Review", href: "/admin/pages/google-review" },
];

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 font-stamp text-[0.6rem] uppercase tracking-widest text-slate">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      className={`block border-l-2 px-3 py-1.5 font-body text-sm transition-colors ${
        active
          ? "border-gold bg-gold/10 text-ink"
          : "border-transparent text-slate hover:border-ink/20 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/admin/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  async function handleLogout() {
    await fetch("/admin/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const isSuperadmin = role === "superadmin";

  return (
    <div className="flex min-h-screen bg-paper-dim">
      <nav className="flex w-56 shrink-0 flex-col border-r border-ink/10 bg-paper">
        <div className="border-b border-ink/10 px-4 py-4">
          <Link href="/admin/dashboard" className="font-display text-base text-ink">
            Zolvex Admin
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-0 py-4">
          <NavGroup title="Content">
            {CONTENT_TYPES.map((ct) => (
              <NavLink key={ct.href} href={ct.href}>{ct.label}</NavLink>
            ))}
            <NavLink href="/admin/places">Places</NavLink>
          </NavGroup>
          {isSuperadmin && (
            <NavGroup title="Pages">
              {PAGE_KEYS.map((pk) => (
                <NavLink key={pk.href} href={pk.href}>{pk.label}</NavLink>
              ))}
            </NavGroup>
          )}
          <NavGroup title="Enquiries & Approvals">
            <NavLink href="/admin/enquiries">Enquiries</NavLink>
            <NavLink href="/admin/approvals">Approvals</NavLink>
          </NavGroup>
          {isSuperadmin && (
            <NavGroup title="Governance">
              <NavLink href="/admin/audit-log">Audit Log</NavLink>
              <NavLink href="/admin/sessions">Sessions</NavLink>
              <NavLink href="/admin/trash">Trash</NavLink>
            </NavGroup>
          )}
          {isSuperadmin && (
            <NavGroup title="Users">
              <NavLink href="/admin/users">Users</NavLink>
            </NavGroup>
          )}
        </div>
        <div className="border-t border-ink/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full border border-ink/20 px-3 py-2 font-body text-sm text-ink hover:border-ink"
          >
            Log out
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
