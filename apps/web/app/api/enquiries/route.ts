import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/admin-auth/env";

/**
 * Public BFF proxy for the "Book a visit" form. The modal is a client
 * component and must not talk to the Express API directly (the API base URL
 * is server-only and may be network-internal), so the browser posts here and
 * this handler forwards it on.
 *
 * Deliberately does NOT relay `x-forwarded-for` / `x-real-ip`: those are
 * client-controllable here, and passing them through would let a caller
 * spoof a fresh IP per request and walk around the Express rate limiter
 * (were `TRUST_PROXY` ever enabled). This matches `callExpress`, which
 * likewise leaves client-IP attribution to a real reverse proxy configured
 * end to end. The Express limiter therefore buckets all enquiries by the
 * Next server's address; see the limiter's own note.
 */
export async function POST(request: Request) {
  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${getApiBaseUrl()}/api/enquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent": request.headers.get("user-agent") ?? "",
      },
      body,
    });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }

  const data = await upstream.json().catch(() => null);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
