import { NextResponse } from "next/server";
import { callExpress } from "@/lib/admin-auth/proxy";
import { setPending2FACookie } from "@/lib/admin-auth/cookies";

export async function POST(request: Request) {
  const body = await request.text();

  const upstream = await callExpress("/admin/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await upstream.json();

  if (upstream.status === 200 && typeof data.pendingToken === "string") {
    await setPending2FACookie(data.pendingToken);
    // Never echo the pending token itself back to the browser -- the
    // browser only needs to know whether 2FA is already enabled, to decide
    // which UI branch to render next.
    return NextResponse.json({ twoFAEnabled: data.twoFAEnabled }, { status: 200 });
  }

  return NextResponse.json(data, { status: upstream.status });
}
