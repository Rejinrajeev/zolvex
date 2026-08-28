import { cookies } from "next/headers";

export const ACCESS_TOKEN_COOKIE = "admin_access_token";
export const REFRESH_TOKEN_COOKIE = "admin_refresh_token";
export const PENDING_2FA_COOKIE = "admin_pending_2fa_token";

const BASE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setAccessTokenCookie(token: string): Promise<void> {
  (await cookies()).set(ACCESS_TOKEN_COOKIE, token, { ...BASE_OPTS, maxAge: 15 * 60 });
}

export async function setRefreshTokenCookie(token: string): Promise<void> {
  (await cookies()).set(REFRESH_TOKEN_COOKIE, token, { ...BASE_OPTS, maxAge: 30 * 24 * 60 * 60 });
}

export async function setPending2FACookie(token: string): Promise<void> {
  (await cookies()).set(PENDING_2FA_COOKIE, token, { ...BASE_OPTS, maxAge: 2 * 60 });
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function getPending2FAToken(): Promise<string | undefined> {
  return (await cookies()).get(PENDING_2FA_COOKIE)?.value;
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function clearPending2FACookie(): Promise<void> {
  (await cookies()).delete(PENDING_2FA_COOKIE);
}
