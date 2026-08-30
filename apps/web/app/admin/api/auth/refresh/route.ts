import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/admin-auth/env";
import { getRefreshToken, setAccessTokenCookie, clearSessionCookies } from "@/lib/admin-auth/cookies";

export async function POST(request: Request) {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // See Task 4's note: relay the real client's address so Express's
  // authFlowRateLimit() doesn't key every caller to this Next.js server's
  // own address.
  const forwardedFor = request.headers.get("x-forwarded-for");

  const upstream = await fetch(`${getApiBaseUrl()}/admin/api/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `refresh_token=${refreshToken}`,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
  });

  if (!upstream.ok) {
    await clearSessionCookies();
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { accessToken } = (await upstream.json()) as { accessToken: string };
  await setAccessTokenCookie(accessToken);
  return NextResponse.json({ ok: true }, { status: 200 });
}
