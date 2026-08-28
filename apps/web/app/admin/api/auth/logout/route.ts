import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/admin-auth/env";
import { getRefreshToken, clearSessionCookies } from "@/lib/admin-auth/cookies";

export async function POST(request: Request) {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    try {
      await fetch(`${getApiBaseUrl()}/admin/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
          ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
        },
      });
    } catch {
      // Best-effort upstream revocation -- a network error/timeout here must
      // never block the local logout below. The user is done either way;
      // Express's own refresh-token expiry is the backstop if this call
      // never reached it.
    }
  }
  await clearSessionCookies();
  // A 204 response must not carry a body -- the Response constructor throws
  // ("Invalid response status code 204") if one is given. This was caught
  // by an actual live end-to-end run, not by build/typecheck/unit tests,
  // none of which invoke this handler at runtime.
  return new NextResponse(null, { status: 204 });
}
