// apps/web/lib/admin-auth/proxy.ts
import { getApiBaseUrl } from "./env";
import { getAccessToken, getRefreshToken, setAccessTokenCookie, clearSessionCookies } from "./cookies";

export class UpstreamUnauthorizedError extends Error {}

/**
 * Proxies a request to the Express backend, attaching the current access
 * token (if any). On a 401 (expired access token), silently refreshes using
 * the relayed refresh-token cookie and retries the original call exactly
 * once. If there's no refresh token, or the refresh call itself fails,
 * clears both session cookies and throws -- the calling Route Handler
 * catches this and responds 401, and the frontend redirects to /admin/login.
 */
export async function callExpress(path: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const accessToken = await getAccessToken();

  const doFetch = (token: string | undefined) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

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
    throw new UpstreamUnauthorizedError("No refresh token available");
  }

  const refreshResponse = await fetch(`${baseUrl}/admin/api/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refresh_token=${refreshToken}` },
  });
  if (!refreshResponse.ok) {
    await clearSessionCookies();
    throw new UpstreamUnauthorizedError("Refresh failed");
  }

  const { accessToken: freshAccessToken } = (await refreshResponse.json()) as { accessToken: string };
  await setAccessTokenCookie(freshAccessToken);

  return doFetch(freshAccessToken);
}
