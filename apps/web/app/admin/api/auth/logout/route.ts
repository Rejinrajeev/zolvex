import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/admin-auth/env";
import { getRefreshToken, clearSessionCookies } from "@/lib/admin-auth/cookies";

export async function POST(request: Request) {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    await fetch(`${getApiBaseUrl()}/admin/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
        ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
      },
    });
  }
  await clearSessionCookies();
  return NextResponse.json({ ok: true }, { status: 204 });
}
