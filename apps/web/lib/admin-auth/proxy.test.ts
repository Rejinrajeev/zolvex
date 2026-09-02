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

const { callExpress } = await import("./proxy.js");
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

  it("refreshes and retries a protected-route 401 even when the access-token cookie is gone (dropped after its 15-min max-age) as long as a refresh token remains", async () => {
    // No ACCESS_TOKEN_COOKIE -- the common "admin came back after being idle
    // 15+ minutes" case. The session is NOT over: the 30-day refresh cookie
    // is still there.
    store.set(REFRESH_TOKEN_COOKIE, { value: "real-refresh-token" });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })) // original, no token
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "fresh-token" }), { status: 200 })) // refresh
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 })); // retry

    const res = await callExpress("/admin/api/content/faq");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [, retryInit] = fetchMock.mock.calls[2];
    expect((retryInit?.headers as Record<string, string>)?.Authorization).toBe("Bearer fresh-token");
  });

  it("does NOT refresh a 401 from an /admin/api/auth/* endpoint even if a refresh token happens to be present", async () => {
    store.set(REFRESH_TOKEN_COOKIE, { value: "real-refresh-token" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "invalid_credentials" }), { status: 401 }));

    const res = await callExpress("/admin/api/auth/login", { method: "POST", body: "{}" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("clears session cookies and returns a 401 JSON response when refresh itself fails -- never throws", async () => {
    store.set(ACCESS_TOKEN_COOKIE, { value: "expired-token" });
    store.set(REFRESH_TOKEN_COOKIE, { value: "bad-refresh-token" });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 401 })); // refresh fails too

    const res = await callExpress("/admin/api/content/faq");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(store.has(ACCESS_TOKEN_COOKIE)).toBe(false);
    expect(store.has(REFRESH_TOKEN_COOKIE)).toBe(false);
  });

  it("returns a 401 JSON response immediately, without attempting a refresh call or throwing, when there is no refresh token", async () => {
    store.set(ACCESS_TOKEN_COOKIE, { value: "expired-token" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 401 }));

    const res = await callExpress("/admin/api/content/faq");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the original attempt, no refresh call
  });

  it("a Route Handler's existing parseJsonSafe + NextResponse.json(data, {status}) pattern needs no changes to handle this 401 correctly", async () => {
    // This is the regression guard for the actual bug: every real Route
    // Handler in this codebase does `const data = await parseJsonSafe(upstream);
    // return NextResponse.json(data ?? {...}, {status: upstream.status})` with
    // NO try/catch. Before this fix, a refresh failure threw here, which none
    // of those ~30 call sites caught -- an uncaught exception, not a clean 401.
    store.set(ACCESS_TOKEN_COOKIE, { value: "expired-token" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 401 }));

    const { parseJsonSafe } = await import("./proxy.js");
    const upstream = await callExpress("/admin/api/content/faq");
    const data = await parseJsonSafe(upstream);

    expect(data).toEqual({ error: "unauthorized" });
    expect(upstream.status).toBe(401);
  });

  it("lets a caller-supplied Authorization header win over the auto-attached access token (the 2FA setup/verify/recovery handlers rely on this)", async () => {
    // A browser can hold a still-valid admin_access_token cookie (15-min TTL)
    // at the same time as a fresh admin_pending_2fa_token cookie -- e.g.
    // logging in again without logging out first, or a second tab. The
    // pending-2FA handlers explicitly set their own Authorization header;
    // callExpress must not silently overwrite it with the access token.
    store.set(ACCESS_TOKEN_COOKIE, { value: "stale-access-token" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    await callExpress("/admin/api/auth/2fa/setup", {
      method: "POST",
      headers: { Authorization: "Bearer pending-token" },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer pending-token");
  });
});
