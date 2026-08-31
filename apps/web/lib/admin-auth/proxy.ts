// apps/web/lib/admin-auth/proxy.ts
import { getApiBaseUrl } from "./env";
import { getAccessToken, getRefreshToken, setAccessTokenCookie, clearSessionCookies } from "./cookies";

/**
 * Kept only so any external reference (a stale import, a lingering
 * instanceof check written against the old contract) fails to compile
 * rather than silently misbehaving. callExpress itself no longer throws
 * this -- see the note below on why.
 */
export class UpstreamUnauthorizedError extends Error {}

/**
 * Proxies a request to the Express backend, attaching the current access
 * token (if any). On a 401 (expired access token), silently refreshes using
 * the relayed refresh-token cookie and retries the original call exactly
 * once. If there's no refresh token, or the refresh call itself fails,
 * clears both session cookies and returns a synthetic 401 Response --
 * NEVER throws. Every Route Handler in this codebase already does
 * `const data = await parseJsonSafe(upstream); return NextResponse.json(data
 * ?? {...}, {status: upstream.status})`, which handles this 401 correctly
 * with no changes needed at any of the ~30 call sites. Throwing instead (the
 * original design) required every one of those call sites to wrap its own
 * callExpress call in try/catch to honor the contract -- none of them did,
 * so a refresh failure crashed the Route Handler with an uncaught exception
 * (a generic 500 with a non-JSON body) instead of the intended clean 401.
 * Found during a post-merge review of Plans 3b/3c; fixed at the source
 * rather than retrofitting ~30 files, each an easy place to forget it again.
 */
export async function callExpress(path: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const accessToken = await getAccessToken();

  const doFetch = (token: string | undefined) => {
    const callerHeaders = (init.headers as Record<string, string> | undefined) ?? {};
    // A caller that explicitly sets its own Authorization header (the 2FA
    // setup/verify/recovery handlers, which must send the pending-2FA token,
    // not whatever's in the access-token cookie) always wins. Without this
    // check, a browser holding a still-valid admin_access_token cookie
    // alongside a fresh admin_pending_2fa_token cookie (e.g. logging in
    // again without logging out first, or a second tab) would have its
    // explicit pending-token header silently overwritten below, since
    // object-spread order previously let the auto-attached token win.
    const hasExplicitAuth = Object.keys(callerHeaders).some((key) => key.toLowerCase() === "authorization");
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...callerHeaders,
        ...(token && !hasExplicitAuth ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  const firstResponse = await doFetch(accessToken);
  // Only a 401 from a call that actually carried an access token means "this
  // session's token expired" -- a 401 with no access token attached (login,
  // or a pending-2FA endpoint) means "wrong password"/"wrong code" and must
  // pass straight through, not trigger a refresh attempt (see this file's
  // Task 3 note on why this guard exists).
  if (firstResponse.status !== 401 || !accessToken) {
    return firstResponse;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearSessionCookies();
    return unauthorizedResponse();
  }

  const refreshResponse = await fetch(`${baseUrl}/admin/api/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refresh_token=${refreshToken}` },
  });
  if (!refreshResponse.ok) {
    await clearSessionCookies();
    return unauthorizedResponse();
  }

  const { accessToken: freshAccessToken } = (await refreshResponse.json()) as { accessToken: string };
  await setAccessTokenCookie(freshAccessToken);

  return doFetch(freshAccessToken);
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Parses a Response body as JSON, returning null instead of throwing if the
 * body isn't valid JSON. Every Route Handler in this plan calls this (not
 * `response.json()` directly) on whatever `callExpress` returns, because
 * Express's rate limiters (express-rate-limit) respond to a throttled
 * request with a plain-text body, not JSON -- `response.json()` on that
 * body throws a SyntaxError, which would otherwise surface as an uncaught
 * exception (a generic 500, masking the real 429) the first time a client
 * actually trips one of Express's login/2FA rate limiters.
 */
export async function parseJsonSafe(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
