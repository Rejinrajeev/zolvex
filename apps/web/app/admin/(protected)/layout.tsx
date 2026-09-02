"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { IconMenu, IconClose } from "@/components/icons";
import { adminFetch } from "@/lib/admin/fetch";

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
    <div className="mb-6">
      <p className="mb-2 px-3 font-sora text-xs font-semibold uppercase tracking-[0.14em] text-cream/45">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 font-sora text-sm transition-colors ${
        active
          ? "bg-green/15 font-semibold text-green"
          : "text-cream/70 hover:bg-cream/5 hover:text-cream"
      }`}
    >
      {children}
    </Link>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    adminFetch("/admin/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setRole(d?.role ?? null);
        setMustChangePassword(d?.mustChangePassword === true);
      })
      .catch(() => setRole(null));
  }, []);

  // A new admin on a temp password is locked to the change-password screen
  // until they've set their own.
  useEffect(() => {
    if (mustChangePassword && !pathname.startsWith("/admin/account")) {
      router.replace("/admin/account");
    }
  }, [mustChangePassword, pathname, router]);

  async function handleLogout() {
    await adminFetch("/admin/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const isSuperadmin = role === "superadmin";
  const close = () => setMenuOpen(false);

  const nav = (
    <>
      <NavGroup title="Content">
        {CONTENT_TYPES.map((ct) => (
          <NavLink key={ct.href} href={ct.href} onNavigate={close}>
            {ct.label}
          </NavLink>
        ))}
        <NavLink href="/admin/places" onNavigate={close}>
          Places
        </NavLink>
      </NavGroup>
      {isSuperadmin && (
        <NavGroup title="Pages">
          {PAGE_KEYS.map((pk) => (
            <NavLink key={pk.href} href={pk.href} onNavigate={close}>
              {pk.label}
            </NavLink>
          ))}
        </NavGroup>
      )}
      <NavGroup title="Enquiries & Approvals">
        <NavLink href="/admin/enquiries" onNavigate={close}>
          Enquiries
        </NavLink>
        <NavLink href="/admin/approvals" onNavigate={close}>
          Approvals
        </NavLink>
      </NavGroup>
      {isSuperadmin && (
        <NavGroup title="Governance">
          <NavLink href="/admin/audit-log" onNavigate={close}>
            Audit Log
          </NavLink>
          <NavLink href="/admin/sessions" onNavigate={close}>
            Sessions
          </NavLink>
          <NavLink href="/admin/trash" onNavigate={close}>
            Trash
          </NavLink>
        </NavGroup>
      )}
      {isSuperadmin && (
        <NavGroup title="Users">
          <NavLink href="/admin/users" onNavigate={close}>
            Users
          </NavLink>
        </NavGroup>
      )}
      <NavGroup title="Account">
        <NavLink href="/admin/account" onNavigate={close}>
          Your account
        </NavLink>
      </NavGroup>
    </>
  );

  return (
    <div className="on-forest flex min-h-screen bg-cream">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink/10 bg-cream px-4 lg:hidden">
        <Link href="/admin/dashboard" className="font-anton text-lg uppercase tracking-tight text-ink">
          Zolvex
        </Link>
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink"
        >
          {menuOpen ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-forest/40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-forest transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-cream/10 px-5 py-5">
          <Link href="/admin/dashboard" className="font-anton text-xl uppercase tracking-tight text-cream">
            Zolvex <span className="text-green">Admin</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">{nav}</div>
        <div className="border-t border-cream/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-cream/15 px-3 py-2 font-sora text-sm text-cream/80 transition-colors hover:border-cream/40 hover:text-cream"
          >
            Log out
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-x-hidden px-5 pb-16 pt-20 sm:px-8 lg:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
