import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import {
  getPending2FAToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearPending2FACookie,
} from "@/lib/admin-auth/cookies";
import { decodeJwtPayload } from "@/lib/admin-auth/jwt";

/** Pulls the raw refresh-token value out of Express's own Set-Cookie header. */
function extractRefreshToken(setCookieHeader: string | null): string | undefined {
  if (!setCookieHeader) return undefined;
  const match = /refresh_token=([^;]+)/.exec(setCookieHeader);
  return match?.[1];
}

export async function POST(request: Request) {
  const pendingToken = await getPending2FAToken();
  if (!pendingToken) {
    return NextResponse.json({ error: "no_pending_login" }, { status: 401 });
  }

  const body = await request.text();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const upstream = await callExpress("/admin/api/auth/2fa/login/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pendingToken}`,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body,
  });

  const data = await parseJsonSafe(upstream);

  if (upstream.status === 200 && typeof data?.accessToken === "string") {
    const refreshToken = extractRefreshToken(upstream.headers.get("set-cookie"));
    if (refreshToken) {
      await setRefreshTokenCookie(refreshToken);
    }
    await setAccessTokenCookie(data.accessToken);
    await clearPending2FACookie();
    // Never echo the raw accessToken to the browser -- it already lives in
    // this app's own httpOnly cookie, which the browser can't read anyway.
    // The one bit the client does need: whether this account is still on its
    // generated temp password, so the verify page can route straight to the
    // change-password screen instead of the dashboard.
    const mustChangePassword = decodeJwtPayload(data.accessToken)?.mustChangePassword === true;
    return NextResponse.json({ ok: true, mustChangePassword }, { status: 200 });
  }

  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
