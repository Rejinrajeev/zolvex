import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { clearSessionCookies } from "@/lib/admin-auth/cookies";

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await callExpress("/admin/api/account/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await parseJsonSafe(upstream);

  // Express revoked every session for the account on a successful change, so
  // this app's own session cookies are now dead too — drop them and let the
  // client send the admin to the login screen to sign in with the new one.
  if (upstream.ok) {
    await clearSessionCookies();
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
