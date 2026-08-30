import { describe, it, expect, vi, beforeEach } from "vitest";

// next/headers' cookies() only works inside a real Next.js request context;
// this fake is a minimal in-memory stand-in exercising the same get/set/
// delete shape this module actually calls.
const store = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => store.get(name),
    set: (name: string, value: string) => {
      store.set(name, { value });
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

const {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  PENDING_2FA_COOKIE,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setPending2FACookie,
  getAccessToken,
  getRefreshToken,
  getPending2FAToken,
  clearSessionCookies,
  clearPending2FACookie,
} = await import("./cookies.js");

beforeEach(() => store.clear());

describe("access token cookie", () => {
  it("round-trips", async () => {
    await setAccessTokenCookie("abc123");
    expect(await getAccessToken()).toBe("abc123");
    expect(store.get(ACCESS_TOKEN_COOKIE)?.value).toBe("abc123");
  });

  it("returns undefined when never set", async () => {
    expect(await getAccessToken()).toBeUndefined();
  });
});

describe("refresh token cookie", () => {
  it("round-trips", async () => {
    await setRefreshTokenCookie("refresh-xyz");
    expect(await getRefreshToken()).toBe("refresh-xyz");
    expect(store.get(REFRESH_TOKEN_COOKIE)?.value).toBe("refresh-xyz");
  });
});

describe("pending 2FA cookie", () => {
  it("round-trips", async () => {
    await setPending2FACookie("pending-jwt");
    expect(await getPending2FAToken()).toBe("pending-jwt");
    expect(store.get(PENDING_2FA_COOKIE)?.value).toBe("pending-jwt");
  });
});

describe("clearSessionCookies", () => {
  it("removes both access and refresh, leaves pending-2FA untouched", async () => {
    await setAccessTokenCookie("a");
    await setRefreshTokenCookie("r");
    await setPending2FACookie("p");

    await clearSessionCookies();

    expect(await getAccessToken()).toBeUndefined();
    expect(await getRefreshToken()).toBeUndefined();
    expect(await getPending2FAToken()).toBe("p");
  });
});

describe("clearPending2FACookie", () => {
  it("removes only the pending-2FA cookie", async () => {
    await setAccessTokenCookie("a");
    await setPending2FACookie("p");

    await clearPending2FACookie();

    expect(await getPending2FAToken()).toBeUndefined();
    expect(await getAccessToken()).toBe("a");
  });
});
