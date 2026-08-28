# Gate 2 Frontend — Auth UI & Admin Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin login flow (password → mandatory TOTP 2FA setup/verify → session) and the authenticated admin shell in `apps/web`, establishing the Next.js↔Express proxy pattern every later Gate 2 frontend plan (3b: generic content CRUD UI, 3c: bespoke governance screens) will reuse.

**Architecture:** `apps/web` (Next.js App Router) never lets the browser talk to the Express API (`apps/api`) directly. Every admin action goes through a Next.js Route Handler under `/admin/api/**` that calls Express server-side and re-mints the resulting tokens as its own httpOnly cookies — the browser only ever holds opaque, httpOnly cookies scoped to the Next.js origin, never a raw JWT or Express's own refresh-token cookie. A single shared proxy helper (`lib/admin-auth/proxy.ts`) attaches the access token to every proxied call and silently refreshes-and-retries once on a 401, used by every Route Handler in this plan and every later one.

**Tech Stack:** Next.js 16.3.2 (App Router, Route Handlers, Middleware), React 19.2.8, TypeScript, vitest (newly added to `apps/web` — it has no test runner yet).

**Spec:** `docs/superpowers/specs/2026-08-25-gate-2-admin-panel-design.md` — this plan implements its "Auth & 2FA" section's frontend half (the backend is already built and merged) and the "Architecture & layout" section's Route-Handler-proxy design. Also implements the admin-nav shell skeleton from "Bespoke screens" (full nav content — Content/Enquiries/Governance/Users groups — is filled in by Plans 3b/3c; this plan only builds the shell and a placeholder landing page).

## Global Constraints

- The browser must never receive a raw Express JWT (access token) or Express's own `refresh_token` cookie value. Every session artifact the browser holds is one of THIS plan's own httpOnly cookies (`admin_access_token`, `admin_refresh_token`, `admin_pending_2fa_token`), never readable by client JS (`httpOnly: true` on all three, always).
- **Ground-truth correction to the spec's own notation**: the spec writes `app/(admin)/` using Next.js's route-group parenthesis syntax — but a parenthesized path segment is excluded from the URL, so taken literally this would produce `/login`/`/api/auth/login` rather than the `/admin/login`/`/admin/api/auth/login` URLs the spec clearly intends (mirroring Express's own `/admin/api/*` convention). This plan uses a literal `app/admin/` folder for the URL prefix instead, with a `(protected)` route group used only where a URL segment is genuinely NOT wanted (the authenticated pages share a layout without a `/protected/` segment appearing in the URL). Confirmed via `find app -type f` against the real `apps/web/app/` directory before writing this plan — no existing `/admin` or `/api` routes exist yet, so there is no collision either way.
- `cookies()` from `next/headers` is `async` in this Next.js version (returns `Promise<ReadonlyRequestCookies>`) — always `await` it. Confirmed against the installed `next@16.3.2` package's own type declarations before writing this plan, not assumed from memory.
- All cookie-setting helpers use one shared options object: `httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/"` — never construct cookie options inline at a call site.
- `API_BASE_URL` (server-side only env var, no `NEXT_PUBLIC_` prefix — it must never reach the browser bundle) points at the Express API. Every Route Handler in this plan reaches Express only through `callExpress()` (Task 3), never a bare `fetch` call.
- Per the spec's own "Testing" section, this plan follows the same split as the rest of Gate 2: pure server-side logic (`lib/admin-auth/*.ts`) gets real automated tests; page components (forms, visual layout) are manually verified per this plan's Final Verification checklist, not unit-tested — matching the spec's explicit decision not to over-automate UI that's still changing fast. Visual polish/branding is explicitly out of scope for this plan; it targets functional correctness of the auth flow only.

---

## Task 1: `apps/web` test harness + `getApiBaseUrl()` helper

**Files:**
- Modify: `apps/web/package.json` (add `vitest`, a `test` script)
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/lib/admin-auth/env.ts`
- Test: `apps/web/lib/admin-auth/env.test.ts`

**Interfaces:**
- Produces: `getApiBaseUrl(): string` — consumed by Task 3's `callExpress`.

`apps/web` currently has no test runner at all (`package.json` only has `dev`/`build`/`start`/`lint`) — this task establishes one, proven by a real, useful first test rather than a throwaway smoke test.

- [ ] **Step 1: Add the dependency and test script**

Run: `npm install --workspace=apps/web -D vitest`

Add to `apps/web/package.json`'s `"scripts"` block (merge into the existing object, don't replace it):

```json
"test": "vitest run"
```

- [ ] **Step 2: Add the vitest config**

```ts
// apps/web/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment, not jsdom: this plan's automated tests cover pure
    // server-side logic (cookie/proxy helpers), never React component
    // rendering — see this plan's Global Constraints on the manual-vs-
    // automated testing split.
    environment: "node",
  },
});
```

- [ ] **Step 3: Write the failing test**

```ts
// apps/web/lib/admin-auth/env.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { getApiBaseUrl } from "./env.js";

const original = process.env.API_BASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.API_BASE_URL;
  else process.env.API_BASE_URL = original;
});

describe("getApiBaseUrl", () => {
  it("returns the configured value", () => {
    process.env.API_BASE_URL = "http://localhost:4000";
    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });

  it("throws a clear error when unset", () => {
    delete process.env.API_BASE_URL;
    expect(() => getApiBaseUrl()).toThrow(/API_BASE_URL/);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm run test --workspace=apps/web`
Expected: FAIL — `Cannot find module './env.js'`.

- [ ] **Step 5: Implement `env.ts`**

```ts
// apps/web/lib/admin-auth/env.ts
export function getApiBaseUrl(): string {
  const value = process.env.API_BASE_URL;
  if (!value) {
    throw new Error("API_BASE_URL is not set");
  }
  return value;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test --workspace=apps/web`
Expected: PASS, 2 tests.

- [ ] **Step 7: Add the env var to a local `.env` for `apps/web` and document it**

Create `apps/web/.env.local` (gitignored — confirm `.env*.local` is already in the repo's `.gitignore`; if not, add it) with:

```
API_BASE_URL="http://localhost:4000"
```

Create `apps/web/.env.example` (committed) with:

```
API_BASE_URL="http://localhost:4000"
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/vitest.config.ts apps/web/lib/admin-auth/env.ts apps/web/lib/admin-auth/env.test.ts apps/web/.env.example
git commit -m "feat(web): add vitest harness to apps/web; add getApiBaseUrl() helper"
```

(Do not add `apps/web/.env.local` — confirm it's gitignored before committing, don't force-add it.)

---

## Task 2: Session cookie helpers

**Files:**
- Create: `apps/web/lib/admin-auth/cookies.ts`
- Test: `apps/web/lib/admin-auth/cookies.test.ts`

**Interfaces:**
- Produces: `ACCESS_TOKEN_COOKIE`, `REFRESH_TOKEN_COOKIE`, `PENDING_2FA_COOKIE` (string constants); `setAccessTokenCookie(token)`, `setRefreshTokenCookie(token)`, `setPending2FACookie(token)`, `getAccessToken()`, `getRefreshToken()`, `getPending2FAToken()`, `clearSessionCookies()`, `clearPending2FACookie()` — all consumed by Task 3 (proxy) and every Route Handler task (4-7).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/admin-auth/cookies.test.ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cookies.ts`**

```ts
// apps/web/lib/admin-auth/cookies.ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/web`
Expected: PASS, 6 new tests (8 total with Task 1's 2).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin-auth/cookies.ts apps/web/lib/admin-auth/cookies.test.ts
git commit -m "feat(web): add session cookie helpers (access/refresh/pending-2FA)"
```

---

## Task 3: `callExpress` proxy helper

**Files:**
- Create: `apps/web/lib/admin-auth/proxy.ts`
- Test: `apps/web/lib/admin-auth/proxy.test.ts`

**Interfaces:**
- Consumes: `getApiBaseUrl` (Task 1); `getAccessToken`, `getRefreshToken`, `setAccessTokenCookie`, `clearSessionCookies` (Task 2).
- Produces: `callExpress(path: string, init?: RequestInit): Promise<Response>`, `UpstreamUnauthorizedError` — consumed by every Route Handler task in this plan (4-7) and by Plans 3b/3c.

This is the single most important piece of this plan: it attaches the current access token to every proxied call, and on a 401 **from a call that had a real access token attached** (meaning: an established session's token expired), silently calls Express's `/admin/api/auth/refresh` using the relayed refresh token, mints a fresh access-token cookie, and retries the original call exactly once. If there's no refresh token, or refresh itself fails, it clears both session cookies and throws — the calling Route Handler catches this and returns 401, and the frontend redirects to `/admin/login`.

**A 401 from a call made with NO access token attached must pass through untouched, not trigger a refresh attempt.** Login (`/admin/api/auth/login`) and the pending-2FA endpoints (Tasks 5-6) never have a real access token — a 401 from either of them means "wrong password" or "wrong 2FA code," a completely different situation from "this session's token expired," and Express's specific error body (`{error: "invalid_credentials"}`, `{error: "account_locked", lockedUntil}`, etc.) is exactly what the calling Route Handler needs to relay to the frontend. Triggering the refresh logic anyway would find no refresh token (there's no session at all yet), throw `UpstreamUnauthorizedError`, and turn a clean, informative 401 into an uncaught exception. The implementation below guards the entire refresh branch behind "did we actually attach an access token in the first place" for exactly this reason — this is not an incidental detail, it's the difference between a working login form and a broken one.

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `proxy.ts`**

```ts
// apps/web/lib/admin-auth/proxy.ts
import { getApiBaseUrl } from "./env.js";
import { getAccessToken, getRefreshToken, setAccessTokenCookie, clearSessionCookies } from "./cookies.js";

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/web`
Expected: PASS, 6 new tests (14 total).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin-auth/proxy.ts apps/web/lib/admin-auth/proxy.test.ts
git commit -m "feat(web): add callExpress proxy helper with refresh-and-retry on 401"
```

---

## Task 4: Login Route Handler

**Files:**
- Create: `apps/web/app/admin/api/auth/login/route.ts`

**Interfaces:**
- Consumes: `callExpress` (Task 3); `setPending2FACookie` (Task 2).
- Produces: `POST /admin/api/login` — wait, the real path is `POST /admin/api/auth/login` (matches Express's own path exactly, one-to-one, for every Route Handler in this plan — this is the established convention: the Next.js proxy surface mirrors Express's path structure exactly).

- [ ] **Step 1: Implement the Route Handler**

```ts
// apps/web/app/admin/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { callExpress } from "../../../../../lib/admin-auth/proxy.js";
import { setPending2FACookie } from "../../../../../lib/admin-auth/cookies.js";

export async function POST(request: Request) {
  const body = await request.text();
  // Express's login rate limiter (express-rate-limit) keys on req.ip. Without
  // this, every request arrives at Express from this Next.js server's own
  // address, collapsing every real client into one shared rate-limit bucket --
  // an attacker's traffic and legitimate admins' traffic would count against
  // the same pool. Relay whatever the actual edge (reverse proxy/CDN) put in
  // this header so Express can key the limiter on the real client again.
  const forwardedFor = request.headers.get("x-forwarded-for");

  const upstream = await callExpress("/admin/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body,
  });

  const data = await upstream.json();

  if (upstream.status === 200 && typeof data.pendingToken === "string") {
    await setPending2FACookie(data.pendingToken);
    // Never echo the pending token itself back to the browser -- the
    // browser only needs to know whether 2FA is already enabled, to decide
    // which UI branch to render next.
    return NextResponse.json({ twoFAEnabled: data.twoFAEnabled }, { status: 200 });
  }

  return NextResponse.json(data, { status: upstream.status });
}
```

Note the relative import depth (`../../../../../lib/...`) — count the actual path segments from `apps/web/app/admin/api/auth/login/route.ts` to `apps/web/lib/admin-auth/` when you create the file (5 levels up: `login` → `auth` → `api` → `admin` → `app` → `apps/web`, i.e. `../../../../lib/admin-auth/...` from inside `login/`, adjust to whatever `apps/web/tsconfig.json`'s path aliases already establish if one exists — check the file first; if `apps/web/tsconfig.json` already has a `@/*` alias mapped to `apps/web/*`, use `@/lib/admin-auth/proxy.js` instead of a relative path, matching the project's existing convention rather than inventing a new one).

- [ ] **Step 2: Manually verify**

This task has no automated test (Route Handlers wiring together already-tested logic is thin enough, and full verification requires a running Express backend — covered by this plan's Final Verification checklist). Confirm the file compiles: run `npm run build --workspace=apps/web` and expect no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/api/auth/login/route.ts
git commit -m "feat(web): add login Route Handler proxying to Express"
```

---

## Task 5: 2FA setup + setup-verify Route Handlers

**Files:**
- Create: `apps/web/app/admin/api/auth/2fa/setup/route.ts`
- Create: `apps/web/app/admin/api/auth/2fa/setup/verify/route.ts`

**Interfaces:**
- Consumes: `callExpress` (Task 3); `getPending2FAToken` (Task 2).
- Produces: `POST /admin/api/auth/2fa/setup`, `POST /admin/api/auth/2fa/setup/verify`.

Both of these use the PENDING-2FA token (not a real access token) as their Bearer auth — `callExpress` always attaches whatever's in the access-token cookie, which is empty at this point in the flow, so these two handlers pass the pending token explicitly via their own `Authorization` header rather than relying on `callExpress`'s automatic attachment.

- [ ] **Step 1: Implement both Route Handlers**

```ts
// apps/web/app/admin/api/auth/2fa/setup/route.ts
import { NextResponse } from "next/server";
import { callExpress } from "../../../../../../lib/admin-auth/proxy.js";
import { getPending2FAToken } from "../../../../../../lib/admin-auth/cookies.js";

export async function POST(request: Request) {
  const pendingToken = await getPending2FAToken();
  if (!pendingToken) {
    return NextResponse.json({ error: "no_pending_login" }, { status: 401 });
  }

  // See Task 4's note on why this header is relayed: without it, Express's
  // rate limiter keys every real client to this Next.js server's own address.
  const forwardedFor = request.headers.get("x-forwarded-for");

  const upstream = await callExpress("/admin/api/auth/2fa/setup", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pendingToken}`,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
```

```ts
// apps/web/app/admin/api/auth/2fa/setup/verify/route.ts
import { NextResponse } from "next/server";
import { callExpress } from "../../../../../../../lib/admin-auth/proxy.js";
import { getPending2FAToken } from "../../../../../../../lib/admin-auth/cookies.js";

export async function POST(request: Request) {
  const pendingToken = await getPending2FAToken();
  if (!pendingToken) {
    return NextResponse.json({ error: "no_pending_login" }, { status: 401 });
  }

  const body = await request.text();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const upstream = await callExpress("/admin/api/auth/2fa/setup/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pendingToken}`,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body,
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
```

As in Task 4, verify the exact relative import depth against the real file location when you create each file (or use the `@/*` alias if `apps/web/tsconfig.json` already defines one). Also as in Task 4, relay the incoming request's `x-forwarded-for` header to Express as `X-Forwarded-For` on every `callExpress` call in this task — both handlers sit behind Express's `authFlowRateLimit()`, which has the identical req.ip-collapsing problem Task 4's note describes.

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/api/auth/2fa/setup
git commit -m "feat(web): add 2FA setup and setup-verify Route Handlers"
```

---

## Task 6: 2FA login-verify + recovery-code Route Handlers

**Files:**
- Create: `apps/web/app/admin/api/auth/2fa/login/verify/route.ts`
- Create: `apps/web/app/admin/api/auth/2fa/recovery/route.ts`

**Interfaces:**
- Consumes: `callExpress` (Task 3); `getPending2FAToken`, `setAccessTokenCookie`, `setRefreshTokenCookie`, `clearPending2FACookie` (Task 2).
- Produces: `POST /admin/api/auth/2fa/login/verify`, `POST /admin/api/auth/2fa/recovery` — both mint the real session on success.

Both of Express's equivalent endpoints return `{ accessToken }` in the JSON body and set a `refresh_token` cookie of their OWN (scoped to Express's origin, which the browser never talks to) via `Set-Cookie` — since Next.js's `fetch` call to Express is server-to-server, that `Set-Cookie` header arrives in the upstream `Response` object, not on the browser. These two handlers must read the raw Express refresh-token value out of that header themselves (there's no cookie jar doing it automatically across a manual `fetch`), then re-mint it as this app's own `admin_refresh_token` cookie.

- [ ] **Step 1: Implement both Route Handlers**

```ts
// apps/web/app/admin/api/auth/2fa/login/verify/route.ts
import { NextResponse } from "next/server";
import { callExpress } from "../../../../../../../lib/admin-auth/proxy.js";
import {
  getPending2FAToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearPending2FACookie,
} from "../../../../../../../lib/admin-auth/cookies.js";

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

  const data = await upstream.json();

  if (upstream.status === 200 && typeof data.accessToken === "string") {
    const refreshToken = extractRefreshToken(upstream.headers.get("set-cookie"));
    if (refreshToken) {
      await setRefreshTokenCookie(refreshToken);
    }
    await setAccessTokenCookie(data.accessToken);
    await clearPending2FACookie();
    // Never echo the raw accessToken to the browser -- it already lives in
    // this app's own httpOnly cookie, which the browser can't read anyway.
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json(data, { status: upstream.status });
}
```

```ts
// apps/web/app/admin/api/auth/2fa/recovery/route.ts
import { NextResponse } from "next/server";
import { callExpress } from "../../../../../../lib/admin-auth/proxy.js";
import {
  getPending2FAToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearPending2FACookie,
} from "../../../../../../lib/admin-auth/cookies.js";

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
  const upstream = await callExpress("/admin/api/auth/2fa/recovery", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pendingToken}`,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body,
  });

  const data = await upstream.json();

  if (upstream.status === 200 && typeof data.accessToken === "string") {
    const refreshToken = extractRefreshToken(upstream.headers.get("set-cookie"));
    if (refreshToken) {
      await setRefreshTokenCookie(refreshToken);
    }
    await setAccessTokenCookie(data.accessToken);
    await clearPending2FACookie();
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json(data, { status: upstream.status });
}
```

Both handlers relay the incoming request's `x-forwarded-for` header to Express as `X-Forwarded-For` on their `callExpress` call, for the same reason given in Task 4's note — these two endpoints sit behind Express's `authFlowRateLimit()`, which has the identical req.ip-collapsing problem.

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors. Confirm the `extractRefreshToken` regex actually matches the real cookie shape: read `apps/api/src/controllers/admin/auth.controller.ts`'s `REFRESH_COOKIE_OPTS`/`res.cookie(REFRESH_COOKIE, ...)` call to confirm the cookie name really is `refresh_token` (it should be — `const REFRESH_COOKIE = "refresh_token";`), and that no other cookie attribute value could ever legitimately contain the literal substring `refresh_token=` before the real one, which would break the naive regex (it shouldn't, since this handler controls the only `Set-Cookie` header on this response, but confirm by reading the actual current file rather than trusting this description).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/api/auth/2fa/login apps/web/app/admin/api/auth/2fa/recovery
git commit -m "feat(web): add 2FA login-verify and recovery-code Route Handlers"
```

---

## Task 7: Refresh + logout Route Handlers

**Files:**
- Create: `apps/web/app/admin/api/auth/refresh/route.ts`
- Create: `apps/web/app/admin/api/auth/logout/route.ts`

**Interfaces:**
- Consumes: `getRefreshToken`, `setAccessTokenCookie`, `clearSessionCookies` (Task 2).
- Produces: `POST /admin/api/auth/refresh` (a thin client-callable wrapper the frontend can hit directly to proactively refresh, distinct from `callExpress`'s own internal automatic refresh-on-401), `POST /admin/api/auth/logout`.

Neither of these two goes through `callExpress` — `refresh` doesn't have an access token to attach in the first place (that's the whole point of it), and `logout` needs to reach Express's logout endpoint using the raw relayed refresh-token cookie value directly, which `callExpress` doesn't handle (it only knows how to attach an access token).

- [ ] **Step 1: Implement both Route Handlers**

```ts
// apps/web/app/admin/api/auth/refresh/route.ts
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "../../../../../lib/admin-auth/env.js";
import { getRefreshToken, setAccessTokenCookie, clearSessionCookies } from "../../../../../lib/admin-auth/cookies.js";

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
```

```ts
// apps/web/app/admin/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "../../../../../lib/admin-auth/env.js";
import { getRefreshToken, clearSessionCookies } from "../../../../../lib/admin-auth/cookies.js";

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
```

As in Task 4, relay the incoming request's `x-forwarded-for` header to Express as `X-Forwarded-For` on both of this task's upstream calls — both endpoints sit behind Express's `authFlowRateLimit()`.

Note `logout` clears local session cookies unconditionally, even if the upstream call fails or there was no refresh token to begin with — a logout must always succeed from the browser's point of view; a failed best-effort upstream revocation shouldn't leave the user stuck in an authenticated-looking state client-side.

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/api/auth/refresh apps/web/app/admin/api/auth/logout
git commit -m "feat(web): add refresh and logout Route Handlers"
```

---

## Task 8: Login page

**Files:**
- Create: `apps/web/app/admin/login/layout.tsx`
- Create: `apps/web/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `POST /admin/api/auth/login` (Task 4).
- Produces: `/admin/login` — on success, navigates to `/admin/login/verify` (Task 9), passing `twoFAEnabled` via a query param so the next page knows which branch to render.

- [ ] **Step 1: Implement the unauthenticated layout**

```tsx
// apps/web/app/admin/login/layout.tsx
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>{children}</div>
    </div>
  );
}
```

(Inline styles here are deliberate and temporary — this plan targets functional correctness only, per its Global Constraints; visual design is a separate later pass, not part of this plan.)

- [ ] **Step 2: Implement the login page**

```tsx
// apps/web/app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/admin/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.status === 200) {
        router.push(`/admin/login/verify?setup=${data.twoFAEnabled ? "0" : "1"}`);
        return;
      }
      if (res.status === 423) {
        setError(`Account locked. Try again after ${new Date(data.lockedUntil).toLocaleTimeString()}.`);
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Admin login</h1>
      <label>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors. This page's real behavior (submitting real credentials against a running Express backend) is covered by this plan's Final Verification checklist, once Task 9's follow-on page exists to navigate to.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/login/layout.tsx apps/web/app/admin/login/page.tsx
git commit -m "feat(web): add admin login page"
```

---

## Task 9: 2FA setup/verify/recovery page

**Files:**
- Create: `apps/web/app/admin/login/verify/page.tsx`

**Interfaces:**
- Consumes: `POST /admin/api/auth/2fa/setup`, `POST /admin/api/auth/2fa/setup/verify` (Task 5); `POST /admin/api/auth/2fa/login/verify`, `POST /admin/api/auth/2fa/recovery` (Task 6).
- Produces: `/admin/login/verify` — on final success, navigates to `/admin/dashboard` (Task 11).

This page has two entry modes, chosen by the `?setup=` query param Task 8 sets:
- **`setup=1`** (this admin's `twoFAEnabled` was `false`): on mount, calls `2fa/setup` to get the QR code (`otpauthUrl`) and one-time recovery codes, renders both, and asks for a code from an authenticator app. Submitting that code calls `2fa/setup/verify`. On success, `twoFAEnabled` is now `true` server-side, but **no session was created yet** (`verifyTwoFASetup` only flips the flag — it doesn't log the admin in) — the page must then prompt for a SECOND, freshly-generated code and submit it to `2fa/login/verify` to actually complete login. Transition the UI into "setup" mode's step 2 for this rather than bouncing the admin back to a separate page.
- **`setup=0`** (already has 2FA): just shows a code-entry form submitting straight to `2fa/login/verify`, plus a "use a recovery code instead" toggle that switches the same input to submit to `2fa/recovery` instead.

- [ ] **Step 1: Implement the page**

```tsx
// apps/web/app/admin/login/verify/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Phase = "loading-setup" | "enter-setup-code" | "setup-done-enter-login-code" | "enter-login-code";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const needsSetup = searchParams.get("setup") === "1";

  const [phase, setPhase] = useState<Phase>(needsSetup ? "loading-setup" : "enter-login-code");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!needsSetup) return;
    (async () => {
      const res = await fetch("/admin/api/auth/2fa/setup", { method: "POST" });
      if (res.status !== 200) {
        setError("Could not start 2FA setup. Please log in again.");
        return;
      }
      const data = await res.json();
      setOtpauthUrl(data.otpauthUrl);
      setRecoveryCodes(data.recoveryCodes);
      setPhase("enter-setup-code");
    })();
  }, [needsSetup]);

  async function handleSetupCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/admin/api/auth/2fa/setup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 200) {
        setCode("");
        setPhase("setup-done-enter-login-code");
      } else {
        setError("That code didn't match. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoginCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const path = useRecoveryCode ? "/admin/api/auth/2fa/recovery" : "/admin/api/auth/2fa/login/verify";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 200) {
        router.push("/admin/dashboard");
        return;
      }
      if (res.status === 423) {
        setError("Account locked due to too many failed attempts. Try again later.");
      } else {
        setError("That code didn't work. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "loading-setup") {
    return <p>Setting up two-factor authentication…</p>;
  }

  if (phase === "enter-setup-code" || phase === "setup-done-enter-login-code") {
    return (
      <div>
        <h1>Set up two-factor authentication</h1>
        {phase === "enter-setup-code" && otpauthUrl && (
          <>
            <p>Scan this in your authenticator app:</p>
            <code style={{ wordBreak: "break-all" }}>{otpauthUrl}</code>
            {recoveryCodes && (
              <>
                <p>Save these recovery codes somewhere safe — they will not be shown again:</p>
                <ul>
                  {recoveryCodes.map((rc) => (
                    <li key={rc}>
                      <code>{rc}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <form onSubmit={handleSetupCodeSubmit}>
              <label>
                Enter the 6-digit code from your app
                <input
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              {error && <p role="alert">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? "Verifying…" : "Enable 2FA"}
              </button>
            </form>
          </>
        )}
        {phase === "setup-done-enter-login-code" && (
          <>
            <p>2FA is now enabled. Enter a fresh code from your app to finish signing in.</p>
            <form onSubmit={handleLoginCodeSubmit}>
              <label>
                6-digit code
                <input
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              {error && <p role="alert">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? "Verifying…" : "Finish signing in"}
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1>Two-factor authentication</h1>
      <form onSubmit={handleLoginCodeSubmit}>
        <label>
          {useRecoveryCode ? "Recovery code" : "6-digit code"}
          <input required value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </form>
      <button type="button" onClick={() => setUseRecoveryCode((v) => !v)}>
        {useRecoveryCode ? "Use an authenticator code instead" : "Use a recovery code instead"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors. Full behavioral verification (both the first-time-setup branch and the already-enabled branch, including the recovery-code toggle) happens in this plan's Final Verification checklist against a real running backend.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/login/verify/page.tsx
git commit -m "feat(web): add 2FA setup/verify/recovery page"
```

---

## Task 10: Route-protection middleware

**Files:**
- Create: `apps/web/middleware.ts`

**Interfaces:**
- Consumes: `ACCESS_TOKEN_COOKIE`, `REFRESH_TOKEN_COOKIE` (Task 2).
- Produces: redirects an unauthenticated request for any `/admin/**` page (other than the login flow itself) to `/admin/login`.

This is a cheap, cookie-*presence* check only — not real token validation (that happens per-request via `callExpress`'s own attach/refresh logic when a page's Route Handler calls Express). Its only job is to stop an obviously-logged-out browser from ever rendering a protected page's shell before redirecting.

- [ ] **Step 1: Implement the middleware**

```ts
// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./lib/admin-auth/cookies.js";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login flow and the auth Route Handlers themselves must stay
  // reachable without an existing session -- that's the whole point of them.
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/api/auth")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE) || request.cookies.has(REFRESH_TOKEN_COOKIE);
  if (!hasSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

Confirm `ACCESS_TOKEN_COOKIE`/`REFRESH_TOKEN_COOKIE` are plain string constants (not functions) importable into an Edge-compatible middleware file without pulling in `next/headers`'s `cookies()` function itself (middleware uses `request.cookies`, a different API, not the `cookies()` helper from Task 2's own module) — `cookies.ts` exports both the constants and the `cookies()`-based helper functions from the same file; importing only the constants here is fine and doesn't pull the Node-only parts into the Edge runtime, but confirm this by actually running the build in Step 2 rather than assuming it.

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no errors, including no Edge-runtime-compatibility warnings about the import in `middleware.ts`. If the build warns about pulling in Node-only code, extract `ACCESS_TOKEN_COOKIE`/`REFRESH_TOKEN_COOKIE` into their own tiny module with no other exports and import from that instead, updating Task 2's `cookies.ts` to re-export them from there for backward compatibility with the rest of this plan's imports.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): add route-protection middleware for /admin/**"
```

---

## Task 11: Authenticated admin shell + placeholder dashboard

**Files:**
- Create: `apps/web/app/admin/(protected)/layout.tsx`
- Create: `apps/web/app/admin/(protected)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `POST /admin/api/auth/logout` (Task 7).
- Produces: `/admin/dashboard` — the landing page after a successful login. The shell (nav placeholder) is a skeleton other Gate 2 frontend plans (3b/3c) will extend with real navigation entries (Content, Enquiries & Approvals, Governance, Users) — this task only builds the structure and a working logout, not the nav's actual content.

The `(protected)` segment here IS a genuine Next.js route group (parenthesized, no URL segment) — unlike this plan's top-level `admin/` folder, which deliberately is NOT a route group (see this plan's Global Constraints). The distinction: `admin/` needs to appear in the URL (`/admin/dashboard`); `(protected)` deliberately must NOT (`/admin/dashboard`, not `/admin/protected/dashboard`) while still sharing one layout across every authenticated page.

- [ ] **Step 1: Implement the protected layout**

```tsx
// apps/web/app/admin/(protected)/layout.tsx
"use client";

import { useRouter } from "next/navigation";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/admin/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 220, borderRight: "1px solid #ddd", padding: 16 }}>
        {/* Placeholder shell -- Plans 3b/3c add real nav entries here
            (Content, Enquiries & Approvals, Governance, Users) per the
            spec's "Admin nav" grouping. */}
        <p>Zolvex Admin</p>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Implement the placeholder dashboard**

```tsx
// apps/web/app/admin/(protected)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>You're logged in. Content management screens land in a later plan.</p>
    </div>
  );
}
```

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/admin/(protected)"
git commit -m "feat(web): add authenticated admin shell and placeholder dashboard"
```

---

## Final verification (do this once, after all 11 tasks)

- [ ] Run `npm run test --workspace=apps/web` — every test passing.
- [ ] Run `npm run build --workspace=apps/web` — compiles cleanly, no TypeScript errors, no Edge-runtime warnings from `middleware.ts`.
- [ ] Run `npm run typecheck --workspace=apps/api` and `npm run test --workspace=apps/api` too — confirm this plan didn't touch or break the backend (it shouldn't have modified any `apps/api` file).
- [ ] Start the real Express backend (`npm run dev --workspace=apps/api`) and the real Next.js dev server (`npm run dev --workspace=apps/web`), with `apps/web/.env.local`'s `API_BASE_URL` pointed at the running Express instance.
- [ ] Manually walk the full flow end to end: visit `/admin/dashboard` while logged out → confirm redirect to `/admin/login`. Log in as an existing admin with `twoFAEnabled: false` (e.g. a freshly-seeded superadmin) → confirm the setup-QR/recovery-codes screen appears → scan the QR (or manually extract the secret from the `otpauth://` URL) → submit a real TOTP code → confirm the "enter a fresh code to finish signing in" step appears → submit a second fresh code → confirm landing on `/admin/dashboard`. Click "Log out" → confirm redirect to `/admin/login` and that `/admin/dashboard` is unreachable again without logging back in. Log in again as the now-2FA-enabled admin (`twoFAEnabled: true` this time) → confirm the plain code-entry screen appears (no setup step) → verify the "use a recovery code instead" toggle works with one of the codes shown earlier → confirm it's rejected on a second attempt (recovery codes are single-use, per the already-tested backend behavior).
- [ ] Confirm via browser devtools that no cookie visible to the page (`document.cookie`) ever contains `admin_access_token`, `admin_refresh_token`, or `admin_pending_2fa_token` — they must show as `HttpOnly` in the Application/Storage panel's cookie list, never appear in `document.cookie`'s output.
- [ ] Push the branch and open a PR against `gate-2-admin-panel` using `gh pr create`.
