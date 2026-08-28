// apps/web/lib/admin-auth/proxy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

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

process.env.API_BASE_URL = "http://test-backend.internal";

const { callExpress, UpstreamUnauthorizedError } = await import("./proxy.js");
const { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } = await import("./cookies.js");

beforeEach(() => {
  store.clear();
  vi.restoreAllMocks();
});

describe("callExpress", () => {
  it("attaches the access token and returns the response on success", async () => {
    store.set(ACCESS_TOKEN_COOKIE, { value: "valid-token" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    const res = await callExpress("/admin/api/content/faq");

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://test-backend.internal/admin/api/content/faq");
    expect((init?.headers as Record<string, string>)?.Authorization).toBe("Bearer valid-token");
  });

  it("makes the call with no Authorization header when there is no access token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    await callExpress("/admin/api/auth/login", { method: "POST", body: "{}" });

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it("passes a 401 through untouched when no access token was attached (e.g. a wrong-password login attempt) -- must NOT attempt a refresh or throw", async () => {
    // No ACCESS_TOKEN_COOKIE set at all -- this is the login/pending-2FA case.
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_credentials" }), { status: 401 })
      );

    const res = await callExpress("/admin/api/auth/login", { method: "POST", body: "{}" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh attempt was made
  });

  it("refreshes once and retries on a 401, returning the retried response", async () => {
    store.set(ACCESS_TOKEN_COOKIE, { value: "expired-token" });
    store.set(REFRESH_TOKEN_COOKIE, { value: "real-refresh-token" });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 401 })) // original attempt
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "fresh-token" }), { status: 200 })) // refresh call
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 })); // retry

    const res = await callExpress("/admin/api/content/faq");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1];
    expect(String(refreshUrl)).toBe("http://test-backend.internal/admin/api/auth/refresh");
    expect((refreshInit?.headers as Record<string, string>)?.Cookie).toBe("refresh_token=real-refresh-token");

    const [, retryInit] = fetchMock.mock.calls[2];
    expect((retryInit?.headers as Record<string, string>)?.Authorization).toBe("Bearer fresh-token");

    expect(await getAccessTokenFromStore()).toBe("fresh-token");

    async function getAccessTokenFromStore() {
      const { getAccessToken } = await import("./cookies.js");
      return getAccessToken();
    }
  });

  it("clears session cookies and throws UpstreamUnauthorizedError when refresh itself fails", async () => {
    store.set(ACCESS_TOKEN_COOKIE, { value: "expired-token" });
    store.set(REFRESH_TOKEN_COOKIE, { value: "bad-refresh-token" });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 401 })); // refresh fails too

    await expect(callExpress("/admin/api/content/faq")).rejects.toBeInstanceOf(UpstreamUnauthorizedError);
    expect(store.has(ACCESS_TOKEN_COOKIE)).toBe(false);
    expect(store.has(REFRESH_TOKEN_COOKIE)).toBe(false);
  });

  it("throws immediately, without attempting a refresh call, when there is no refresh token", async () => {
    store.set(ACCESS_TOKEN_COOKIE, { value: "expired-token" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 401 }));

    await expect(callExpress("/admin/api/content/faq")).rejects.toBeInstanceOf(UpstreamUnauthorizedError);
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the original attempt, no refresh call
  });
});
