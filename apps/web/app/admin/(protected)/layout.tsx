"use client";

import { useRouter } from "next/navigation";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/admin/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 220, borderRight: "1px solid #ddd", padding: 16 }}>
        {/* Placeholder shell -- Plans 3b/3c add real nav entries here
            (Content, Enquiries & Approvals, Governance, Users) per the
            spec's "Admin nav" grouping. */}
        <p>Zolvex Admin</p>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
