import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { getPending2FAToken } from "@/lib/admin-auth/cookies";

export async function POST(request: Request) {
  const pendingToken = await getPending2FAToken();
  if (!pendingToken) {
    return NextResponse.json({ error: "no_pending_login" }, { status: 401 });
  }

  // See Task 4's note on why this header is relayed: without it, Express's
  // rate limiter keys every real client to this Next.js server's own address.
  const forwardedFor = request.headers.get("x-forwarded-for");

  const upstream = await callExpress("/admin/api/auth/2fa/setup", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pendingToken}`,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
  });

  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
