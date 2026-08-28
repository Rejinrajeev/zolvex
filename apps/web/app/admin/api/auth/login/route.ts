import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { setPending2FACookie } from "@/lib/admin-auth/cookies";

export async function POST(request: Request) {
  const body = await request.text();
  // Express's login rate limiter (express-rate-limit) keys on req.ip. Without
  // this, every request arrives at Express from this Next.js server's own
  // address, collapsing every real client into one shared rate-limit bucket --
  // an attacker's traffic and legitimate admins' traffic would count against
  // the same pool. Relay whatever the actual edge (reverse proxy/CDN) put in
  // this header so Express can key the limiter on the real client again.
  const forwardedFor = request.headers.get("x-forwarded-for");

  const upstream = await callExpress("/admin/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body,
  });

  const data = await parseJsonSafe(upstream);

  if (upstream.status === 200 && typeof data?.pendingToken === "string") {
    await setPending2FACookie(data.pendingToken);
    // Never echo the pending token itself back to the browser -- the
    // browser only needs to know whether 2FA is already enabled, to decide
    // which UI branch to render next.
    return NextResponse.json({ twoFAEnabled: data.twoFAEnabled }, { status: 200 });
  }

  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
