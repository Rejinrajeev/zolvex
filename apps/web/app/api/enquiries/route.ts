import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/admin-auth/env";

/**
 * Public BFF proxy for the "Book a walkthrough" form. The modal is a client
 * component and must not talk to the Express API directly (the API base URL
 * is server-only and may be network-internal), so the browser posts here and
 * this handler forwards it on, passing the visitor's IP through for the
 * API's rate limiter and enquiry record.
 */
export async function POST(request: Request) {
  const body = await request.text();

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";

  let upstream: Response;
  try {
    upstream = await fetch(`${getApiBaseUrl()}/api/enquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
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
