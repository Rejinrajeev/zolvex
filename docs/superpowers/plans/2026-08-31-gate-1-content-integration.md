# Gate 1 — Public Site Content Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the public marketing site's hardcoded content sections (Services, Blog, Testimonials, FAQ, Instagram, Hero/Footer/WhatsApp/Google-Review) to the real, already-built, already-tested Gate 2 backend, with genuine empty states and no admin-authenticated data ever reaching the public.

**Architecture:** A new public (no-auth), read-only Express API surface, hardcoded to `published`+`isActive` content only, feeding a Next.js Server Component page that fetches once and passes data down to the existing (now-presentational) components.

**Tech Stack:** Express 4 + Prisma 6 (backend, already built — this plan adds routes/views only, no schema changes), Next.js 16.3.2 App Router (Server Components), React 19.2.8, vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-gate-1-content-integration-design.md`.

## Global Constraints

- **The public content route must never accept a client-controlled `status` filter.** `status: "published"` is hardcoded inside the controller. This is the one security-relevant property in this whole plan — get it wrong and draft/pending/rejected content becomes publicly readable.
- **`publicContentView` strips workflow-internal fields** (`submittedBy`, `approvedBy`, `approvedAt`, `rejectionReason`, `deletedAt`) from every record before it leaves the API. Never relay the admin's raw `contentRecordView` pass-through to a public route.
- **No Prisma schema changes.** Every field this plan reads already exists (ground-truthed against `apps/api/src/controllers/admin/content.schemas.ts` and `apps/api/prisma/schema.prisma`). Where a hardcoded UI element has no backing field (Blog's excerpt/tag, FeaturedService's checklist), the UI is simplified to fit the real data — never add a column to make old UI fit.
- **Server Components fetch; page.tsx fetches once, not per-section.** Every content section becomes a plain function taking data as props — no section does its own `fetch`. `apps/web/app/(site)/page.tsx` is the only place data is fetched, in parallel, then passed down through `HomePageClient`.
- **`getApiBaseUrl()`** (already exists, `apps/web/lib/admin-auth/env.ts`) is reused for the public fetch helpers too — same env var, same server-only guarantee (no `NEXT_PUBLIC_` prefix), no new env var needed.
- **Revalidation window is 90 seconds** (`next: { revalidate: 90 }`) on every public fetch — confirmed acceptable freshness during brainstorming.
- **Every empty/unreachable-API state renders the page, never crashes it.** A marketing site must never show a stack trace to a visitor — every fetch helper below returns a safe empty value (`[]` or `null`) on any failure, never throws.
- **Route group note**: `(site)` is a Next.js route group — parenthesized, excluded from the URL. `/`, `/privacy`, `/terms` keep their exact current URLs after the move into `app/(site)/`.

---

## Task 1: `ApprovableResourceService.list()` gains an `isActive` filter

**Files:**
- Modify: `apps/api/src/lib/services/approvable-resource.ts`
- Modify: `apps/api/src/lib/services/approvable-resource.test.ts`

**Interfaces:**
- Produces: `list(filter?: { status?: ApprovalStatus; search?: string; isActive?: boolean })` — the new `isActive` param is optional and additive; every existing caller (the admin `list` controller) passes none of the three fields it doesn't already use, so this is fully backward-compatible.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/lib/services/approvable-resource.test.ts` (find the existing `describe("list", ...)` block — if none exists, add one near the other method-specific `describe` blocks, following the file's existing style of creating real Prisma rows and asserting on the returned array):

```ts
describe("list — isActive filter", () => {
  it("filters by isActive when the option is passed", async () => {
    const service = new ApprovableResourceService(prisma, "faq");
    await prisma.faq.create({
      data: { question: "Active", answer: "A", approvalStatus: "published", isActive: true },
    });
    await prisma.faq.create({
      data: { question: "Inactive", answer: "A", approvalStatus: "published", isActive: false },
    });

    const activeOnly = await service.list({ isActive: true });
    expect(activeOnly.map((r) => r.question)).toEqual(["Active"]);

    const inactiveOnly = await service.list({ isActive: false });
    expect(inactiveOnly.map((r) => r.question)).toEqual(["Inactive"]);
  });

  it("does not filter by isActive when the option is omitted (existing behavior unchanged)", async () => {
    const service = new ApprovableResourceService(prisma, "faq");
    await prisma.faq.create({
      data: { question: "Active", answer: "A", approvalStatus: "published", isActive: true },
    });
    await prisma.faq.create({
      data: { question: "Inactive", answer: "A", approvalStatus: "published", isActive: false },
    });

    const all = await service.list({});
    expect(all.map((r) => r.question).sort()).toEqual(["Active", "Inactive"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- approvable-resource.test.ts`
Expected: FAIL on the first assertion (both records returned regardless of the `isActive` option, since the filter doesn't exist yet).

- [ ] **Step 3: Implement the filter**

In `apps/api/src/lib/services/approvable-resource.ts`, find the existing `list` method (currently `async list(filter?: { status?: ApprovalStatus; search?: string })`) and change it to:

```ts
  async list(filter?: { status?: ApprovalStatus; search?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter?.status) where.approvalStatus = filter.status;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    if (filter?.search) {
      where[SEARCH_FIELDS[this.delegateName]] = { contains: filter.search, mode: "insensitive" };
    }
    const orderBy = ORDERABLE[this.delegateName] ? { order: "asc" as const } : { createdAt: "desc" as const };
    return this.delegate(this.prisma).findMany({ where, orderBy });
  }
```

(Only the new `if (filter?.isActive !== undefined) where.isActive = filter.isActive;` line is added — everything else in the method is unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- approvable-resource.test.ts`
Expected: PASS, 2 new tests. Also run the full `apps/api` suite once (`npm run test --workspace=apps/api`) to confirm this additive change didn't affect any existing test relying on `list()`'s prior behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/services/approvable-resource.ts apps/api/src/lib/services/approvable-resource.test.ts
git commit -m "feat(api): add optional isActive filter to ApprovableResourceService.list()"
```

---

## Task 2: Public content API (`GET /api/content/:type`)

**Files:**
- Create: `apps/api/src/views/public/content.view.ts`
- Create: `apps/api/src/controllers/public/content.controller.ts`
- Create: `apps/api/src/routes/public/content.routes.ts`
- Test: `apps/api/src/controllers/public/content.controller.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `ApprovableResourceService`, `CONTENT_TYPES`/`TYPE_TO_DELEGATE` (`apps/api/src/controllers/admin/content.schemas.ts` — reused directly, not redefined), `prisma` (`apps/api/src/db/prisma.js`).
- Produces: `GET /api/content/:type` → an array of workflow-field-stripped, `published`+`isActive`-only records (or `400 {error:"invalid_type"}` for an unknown type).

This is the security-critical task in this plan. `status` is never read from the request — it is a hardcoded literal in the controller.

- [ ] **Step 1: Write the public view**

```ts
// apps/api/src/views/public/content.view.ts
/**
 * Strips workflow-internal fields before a content record ever reaches the
 * public API. The public has no business knowing who submitted/approved a
 * record, when, or why something was rejected -- unlike the admin API's
 * contentRecordView, which is a deliberate pass-through for authenticated
 * staff only.
 */
const WORKFLOW_FIELDS = ["submittedBy", "approvedBy", "approvedAt", "rejectionReason", "deletedAt"] as const;

export function publicContentView(record: Record<string, unknown>): Record<string, unknown> {
  const view = { ...record };
  for (const field of WORKFLOW_FIELDS) {
    delete view[field];
  }
  return view;
}

export function publicContentListView(records: Record<string, unknown>[]): Record<string, unknown>[] {
  return records.map(publicContentView);
}
```

- [ ] **Step 2: Write the controller**

```ts
// apps/api/src/controllers/public/content.controller.ts
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ApprovableResourceService } from "../../lib/services/approvable-resource.js";
import { CONTENT_TYPES, TYPE_TO_DELEGATE, type ContentType } from "../admin/content.schemas.js";
import { publicContentListView } from "../../views/public/content.view.js";
import { prisma } from "../../db/prisma.js";

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

const serviceCache = new Map<ContentType, ApprovableResourceService>();
function serviceFor(type: ContentType): ApprovableResourceService {
  if (!serviceCache.has(type)) {
    serviceCache.set(type, new ApprovableResourceService(prisma as PrismaClient, TYPE_TO_DELEGATE[type]));
  }
  return serviceCache.get(type)!;
}

export async function list(req: Request, res: Response) {
  const { type } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  // status is a hardcoded literal, never read from the request -- this is
  // the one property in this whole plan that must never change. A public
  // caller has no way to ask for draft/pending_approval/rejected content.
  const records = await serviceFor(type).list({ status: "published", isActive: true });
  res.status(200).json(publicContentListView(records));
}
```

- [ ] **Step 3: Write the route**

```ts
// apps/api/src/routes/public/content.routes.ts
import { Router } from "express";
import * as publicContentController from "../../controllers/public/content.controller.js";

export const publicContentRouter = Router();

publicContentRouter.get("/:type", publicContentController.list);
```

- [ ] **Step 4: Write the tests**

```ts
// apps/api/src/controllers/public/content.controller.test.ts
import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

afterEach(async () => {
  await prisma.faq.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/content/:type", () => {
  it("returns 400 for an unknown content type", async () => {
    const res = await request(app).get("/api/content/not-a-real-type");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid_type" });
  });

  it("requires no authentication", async () => {
    const res = await request(app).get("/api/content/faq");
    expect(res.status).toBe(200);
  });

  it("returns only published, active, non-deleted records", async () => {
    await prisma.faq.create({ data: { question: "Published", answer: "A", approvalStatus: "published", isActive: true } });
    await prisma.faq.create({ data: { question: "Pending", answer: "A", approvalStatus: "pending_approval", isActive: true } });
    await prisma.faq.create({ data: { question: "Rejected", answer: "A", approvalStatus: "rejected", isActive: true } });
    await prisma.faq.create({ data: { question: "Draft", answer: "A", approvalStatus: "draft", isActive: true } });
    await prisma.faq.create({ data: { question: "Inactive", answer: "A", approvalStatus: "published", isActive: false } });
    await prisma.faq.create({
      data: { question: "Deleted", answer: "A", approvalStatus: "published", isActive: true, deletedAt: new Date() },
    });

    const res = await request(app).get("/api/content/faq");
    expect(res.status).toBe(200);
    expect(res.body.map((r: { question: string }) => r.question)).toEqual(["Published"]);
  });

  it("ignores a client-supplied status query param entirely -- status is always published", async () => {
    await prisma.faq.create({ data: { question: "Pending", answer: "A", approvalStatus: "pending_approval", isActive: true } });

    const res = await request(app).get("/api/content/faq?status=pending_approval");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("strips workflow-internal fields from the response", async () => {
    await prisma.faq.create({
      data: {
        question: "Q",
        answer: "A",
        approvalStatus: "published",
        isActive: true,
        submittedBy: "some-admin-id",
      },
    });

    const res = await request(app).get("/api/content/faq");
    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty("submittedBy");
    expect(res.body[0]).not.toHaveProperty("approvedBy");
    expect(res.body[0]).not.toHaveProperty("approvedAt");
    expect(res.body[0]).not.toHaveProperty("rejectionReason");
    expect(res.body[0]).not.toHaveProperty("deletedAt");
    expect(res.body[0]).toHaveProperty("question", "Q");
  });
});
```

- [ ] **Step 5: Mount the route**

In `apps/api/src/app.ts`, add the import after the last existing router import (`import { adminEnquiriesRouter } from "./routes/admin/enquiries.routes.js";`):

```ts
import { publicContentRouter } from "./routes/public/content.routes.js";
```

And add the mount line immediately after `app.use("/admin/api/enquiries", adminEnquiriesRouter);` and before the `app.get("/health", ...)` block:

```ts
  app.use("/api/content", publicContentRouter);
```

No admin-only middleware runs before this in the file (`express.json()`/`cookieParser()` are the only global middleware, both harmless to a public GET route), so this route needs no auth guard added — none exists to bypass.

- [ ] **Step 6: Run the tests**

Run: `npm run test --workspace=apps/api -- src/controllers/public/content.controller.test.ts` (the full relative path, not just the bare filename — vitest's CLI filter is a substring match, and the admin `content.controller.test.ts` in a different directory shares that same filename)
Expected: PASS, 5 new tests. Then run the full suite: `npm run test --workspace=apps/api`.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck --workspace=apps/api`
Expected: clean, no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/views/public apps/api/src/controllers/public/content.controller.ts apps/api/src/controllers/public/content.controller.test.ts apps/api/src/routes/public/content.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add public read-only content API (published+active only, workflow fields stripped)"
```

---

## Task 3: Public pages API (`GET /api/pages/:pageKey`)

**Files:**
- Create: `apps/api/src/controllers/public/pages.controller.ts`
- Create: `apps/api/src/routes/public/pages.routes.ts`
- Test: `apps/api/src/controllers/public/pages.controller.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `prisma` (`apps/api/src/db/prisma.js`).
- Produces: `GET /api/pages/:pageKey` → `{ data: unknown }` (the stored JSON) or `404 {error: "not_found"}` if that key has never been configured. No allowlist of known keys here (unlike the admin editor's known keys) — this route is a generic `PageContent` reader; the frontend (Task 4) is what only ever asks for the 4 known keys.

- [ ] **Step 1: Write the controller**

```ts
// apps/api/src/controllers/public/pages.controller.ts
import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";

export async function get(req: Request, res: Response) {
  const { pageKey } = req.params;
  const record = await prisma.pageContent.findUnique({ where: { pageKey } });
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(200).json({ data: record.data });
}
```

- [ ] **Step 2: Write the route**

```ts
// apps/api/src/routes/public/pages.routes.ts
import { Router } from "express";
import * as publicPagesController from "../../controllers/public/pages.controller.js";

export const publicPagesRouter = Router();

publicPagesRouter.get("/:pageKey", publicPagesController.get);
```

- [ ] **Step 3: Write the tests**

```ts
// apps/api/src/controllers/public/pages.controller.test.ts
import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

afterEach(async () => {
  await prisma.pageContent.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/pages/:pageKey", () => {
  it("requires no authentication", async () => {
    const res = await request(app).get("/api/pages/hero");
    // 404 (not configured yet) is a valid, non-auth-gated response
    expect([200, 404]).toContain(res.status);
  });

  it("returns 404 when the key has never been configured", async () => {
    const res = await request(app).get("/api/pages/hero");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("returns the stored JSON data when configured", async () => {
    await prisma.pageContent.create({
      data: { pageKey: "hero", data: { headline: "Real headline", subheadline: "Real sub" } },
    });

    const res = await request(app).get("/api/pages/hero");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { headline: "Real headline", subheadline: "Real sub" } });
  });
});
```

- [ ] **Step 4: Mount the route**

In `apps/api/src/app.ts`, add the import immediately after Task 2's `import { publicContentRouter } from "./routes/public/content.routes.js";`:

```ts
import { publicPagesRouter } from "./routes/public/pages.routes.js";
```

And the mount line immediately after Task 2's `app.use("/api/content", publicContentRouter);`, still before the `app.get("/health", ...)` block:

```ts
  app.use("/api/pages", publicPagesRouter);
```

- [ ] **Step 5: Run the tests**

Run: `npm run test --workspace=apps/api -- src/controllers/public/pages.controller.test.ts`
Expected: PASS, 3 new tests. Then the full suite.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck --workspace=apps/api`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/public/pages.controller.ts apps/api/src/controllers/public/pages.controller.test.ts apps/api/src/routes/public/pages.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add public read-only PageContent API"
```

---

## Task 4: Frontend public data-fetching helpers

**Files:**
- Create: `apps/web/lib/public-content/fetch.ts`
- Test: `apps/web/lib/public-content/fetch.test.ts`

**Interfaces:**
- Consumes: `getApiBaseUrl` (`apps/web/lib/admin-auth/env.ts`, already exists).
- Produces: `getPublicContent<T>(type: string): Promise<T[]>`, `getPageContent<T>(pageKey: string): Promise<T | null>` — both consumed by every task from Task 6 onward.

Both functions must never throw — a marketing page must render (with an empty/fallback state) even if the API is unreachable.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/lib/public-content/fetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.API_BASE_URL = "http://test-backend.internal";

const { getPublicContent, getPageContent } = await import("./fetch.js");

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getPublicContent", () => {
  it("returns the parsed array on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ id: "1" }]), { status: 200 })
    );
    const result = await getPublicContent("faq");
    expect(result).toEqual([{ id: "1" }]);
  });

  it("requests the correct URL with the revalidate option", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200 }));
    await getPublicContent("faq");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://test-backend.internal/api/content/faq");
    expect((init as { next?: { revalidate: number } })?.next?.revalidate).toBe(90);
  });

  it("returns an empty array on a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });

  it("returns an empty array when fetch itself rejects (network error)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });

  it("returns an empty array when the response body isn't valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not json", { status: 200 }));
    const result = await getPublicContent("faq");
    expect(result).toEqual([]);
  });
});

describe("getPageContent", () => {
  it("returns the parsed data on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { headline: "Hi" } }), { status: 200 })
    );
    const result = await getPageContent("hero");
    expect(result).toEqual({ headline: "Hi" });
  });

  it("returns null on a 404 (not yet configured)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));
    const result = await getPageContent("hero");
    expect(result).toBeNull();
  });

  it("returns null when fetch itself rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const result = await getPageContent("hero");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/web -- fetch.test.ts`
Expected: FAIL — `Cannot find module './fetch.js'`.

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/public-content/fetch.ts
import { getApiBaseUrl } from "@/lib/admin-auth/env";

const REVALIDATE_SECONDS = 90;

/**
 * Fetches a public content-type list from the backend. Never throws --
 * a marketing page must render (with an empty state) even if the API is
 * unreachable or returns something unexpected.
 */
export async function getPublicContent<T = Record<string, unknown>>(type: string): Promise<T[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${`/api/content/${type}`}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

/**
 * Fetches one PageContent key's stored data. Returns null both when the
 * key has never been configured (404) and on any failure -- callers treat
 * both the same way: fall back to a default.
 */
export async function getPageContent<T = Record<string, unknown>>(pageKey: string): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${`/api/pages/${pageKey}`}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: T };
    return body.data;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/web -- fetch.test.ts`
Expected: PASS, 8 new tests.

- [ ] **Step 5: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/public-content
git commit -m "feat(web): add public content/pages fetch helpers with graceful fallback"
```

---

## Task 5: Service icon-mapping module

**Files:**
- Create: `apps/web/lib/service-icons.ts`
- Test: `apps/web/lib/service-icons.test.ts`

**Interfaces:**
- Consumes: `IconOffice`, `IconCarpet`, `IconWindow`, `IconPostConstruction`, `IconFloor`, `IconSanitize` (`apps/web/components/icons.tsx`, already exist).
- Produces: `iconForServiceKey(key: string | null | undefined): ComponentType<SVGProps<SVGSVGElement>>` — consumed by Task 7 (Services).

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/lib/service-icons.test.ts
import { describe, it, expect } from "vitest";
import { iconForServiceKey } from "./service-icons.js";
import { IconOffice, IconCarpet, IconSanitize } from "@/components/icons";

describe("iconForServiceKey", () => {
  it("maps each known key to its icon", () => {
    expect(iconForServiceKey("office")).toBe(IconOffice);
    expect(iconForServiceKey("carpet")).toBe(IconCarpet);
    expect(iconForServiceKey("sanitize")).toBe(IconSanitize);
  });

  it("falls back to IconOffice for an unrecognized key", () => {
    expect(iconForServiceKey("not-a-real-key")).toBe(IconOffice);
  });

  it("falls back to IconOffice for a blank/missing key", () => {
    expect(iconForServiceKey(undefined)).toBe(IconOffice);
    expect(iconForServiceKey(null)).toBe(IconOffice);
    expect(iconForServiceKey("")).toBe(IconOffice);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/web -- service-icons.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/service-icons.ts
import type { ComponentType, SVGProps } from "react";
import {
  IconOffice,
  IconCarpet,
  IconWindow,
  IconPostConstruction,
  IconFloor,
  IconSanitize,
} from "@/components/icons";

const ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  office: IconOffice,
  carpet: IconCarpet,
  window: IconWindow,
  "post-construction": IconPostConstruction,
  floor: IconFloor,
  sanitize: IconSanitize,
};

const DEFAULT_ICON = IconOffice;

/**
 * Service.icon is a free-text field an admin types into; it must never
 * crash the page if the value is blank or doesn't match a known key.
 */
export function iconForServiceKey(key: string | null | undefined): ComponentType<SVGProps<SVGSVGElement>> {
  if (!key) return DEFAULT_ICON;
  return ICON_MAP[key] ?? DEFAULT_ICON;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/web -- service-icons.test.ts`
Expected: PASS, 3 new tests.

- [ ] **Step 5: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/service-icons.ts apps/web/lib/service-icons.test.ts
git commit -m "feat(web): add Service.icon string-to-component lookup with safe fallback"
```

---

## Task 6: Route-group restructure + Hero wiring

**Files:**
- Create: `apps/web/app/(site)/page.tsx` (new Server Component; replaces the old `apps/web/app/page.tsx`)
- Create: `apps/web/app/(site)/HomePageClient.tsx`
- Create: `apps/web/app/(site)/layout.tsx`
- Move: `apps/web/app/privacy/page.tsx` → `apps/web/app/(site)/privacy/page.tsx` (no content change)
- Move: `apps/web/app/terms/page.tsx` → `apps/web/app/(site)/terms/page.tsx` (no content change)
- Delete: `apps/web/app/page.tsx` (its content moves into the new `page.tsx` + `HomePageClient.tsx` split below)
- Modify: `apps/web/components/Hero.tsx`
- Create: `apps/web/lib/split-last-word.ts`
- Test: `apps/web/lib/split-last-word.test.ts`

**Interfaces:**
- Consumes: `getPageContent` (Task 4).
- Produces: `HomePageClient`'s prop shape, which Tasks 7-13 each add one more field to as they wire up their own section.

This task moves the existing three public pages into a route group with no other change to their behavior first (verify that in isolation), then wires only Hero's data through the new split. Every other section (`Services`, `WhyUs`, `FeaturedService`, `Blog`, `FAQ`, `Testimonials`, `InstagramFeed`, `Footer`) still renders with its current hardcoded content in this task — Tasks 7-13 wire them one at a time.

- [ ] **Step 1: Write the failing test for the headline-splitting helper**

```ts
// apps/web/lib/split-last-word.test.ts
import { describe, it, expect } from "vitest";
import { splitLastWord } from "./split-last-word.js";

describe("splitLastWord", () => {
  it("splits a multi-word string into everything-but-last and the last word", () => {
    expect(splitLastWord("Commercial cleaning you can set your clock to.")).toEqual({
      rest: "Commercial cleaning you can set your clock ",
      last: "to.",
    });
  });

  it("treats a single-word string as entirely the last word", () => {
    expect(splitLastWord("Hello")).toEqual({ rest: "", last: "Hello" });
  });

  it("treats an empty string as an empty last word", () => {
    expect(splitLastWord("")).toEqual({ rest: "", last: "" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/web -- split-last-word.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// apps/web/lib/split-last-word.ts
/**
 * Splits a string into everything up to (and including trailing whitespace
 * before) its last word, and the last word itself. Used so the Hero
 * headline's gold underline flourish can apply to whatever the actual last
 * word of an admin-edited headline is, instead of a hand-drawn SVG path
 * hardcoded under the literal word "clock".
 */
export function splitLastWord(text: string): { rest: string; last: string } {
  const lastSpaceIndex = text.lastIndexOf(" ");
  if (lastSpaceIndex === -1) {
    return { rest: "", last: text };
  }
  return { rest: text.slice(0, lastSpaceIndex + 1), last: text.slice(lastSpaceIndex + 1) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/web -- split-last-word.test.ts`
Expected: PASS, 3 new tests.

- [ ] **Step 5: Move the three public pages into the new route group**

```bash
mkdir -p "apps/web/app/(site)/privacy" "apps/web/app/(site)/terms"
git mv apps/web/app/privacy/page.tsx "apps/web/app/(site)/privacy/page.tsx"
git mv apps/web/app/terms/page.tsx "apps/web/app/(site)/terms/page.tsx"
```

Do not edit either file's contents — this step only moves them. Delete the now-empty `apps/web/app/privacy/` and `apps/web/app/terms/` directories if `git mv` doesn't already clean them up.

- [ ] **Step 6: Create the route group's layout**

```tsx
// apps/web/app/(site)/layout.tsx
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

(This is intentionally a bare pass-through for now — Task 13 adds the floating WhatsApp button here, fetching `whatsapp` PageContent once for every public page.)

- [ ] **Step 7: Update Hero to accept props instead of hardcoding copy**

Replace the hardcoded `<h1>` block in `apps/web/components/Hero.tsx`. The file currently is:

```tsx
"use client";

import { useEffect, useState } from "react";
import { IconClock, IconArrow } from "./icons";

function useTodayStamp() {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    setDate(
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date())
    );
  }, []);
  return date;
}

export function Hero({ onBookNow }: { onBookNow: () => void }) {
  const today = useTodayStamp();

  return (
    <section
      id="top"
      className="ledger-ground-dark relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-8 lg:px-12"
    >
      {/* corner vignette so the grid recedes rather than tiling flat */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(238,215,123,0.14), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[90rem]">
        <div className="mb-8 flex flex-wrap items-center gap-3 font-stamp text-[0.72rem] uppercase tracking-wide text-gold/90">
          <span className="tabular" suppressHydrationWarning>
            {today ?? " "}
          </span>
          <span className="h-3 w-px bg-gold/30" aria-hidden />
          <span className="stamp-rotate inline-flex items-center gap-1.5 rounded-sm border border-gold/60 px-2 py-0.5">
            <IconClock className="h-3 w-3" />
            Status: On Duty
          </span>
          <span className="h-3 w-px bg-gold/30" aria-hidden />
          <span className="tabular">Visit Log — Entry Open</span>
        </div>

        <h1 className="balance max-w-4xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] text-paper">
          Commercial cleaning you can set your{" "}
          <span className="relative inline-block">
            clock
            <svg
              viewBox="0 0 300 24"
              className="pointer-events-none absolute -bottom-2 left-0 h-3.5 w-full text-gold sm:h-4"
              aria-hidden
              preserveAspectRatio="none"
            >
              <path
                d="M4 18 C 70 6, 150 22, 230 8 S 285 4, 296 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={1}
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: 1,
                  animation: "draw-underline 1s var(--ease-out-exp) 0.6s forwards",
                }}
              />
            </svg>
          </span>{" "}
          to.
        </h1>
        <style>{`@keyframes draw-underline { to { stroke-dashoffset: 0; } }`}</style>

        <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-paper/80 sm:text-xl">
          Every visit logged, every job on time. Zolvex keeps commercial
          spaces audit-ready — without you lifting a finger.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onBookNow}
            className="group relative inline-flex items-center gap-2 bg-gold px-8 py-4 font-display text-base font-semibold text-ink shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            Book Now
            <IconArrow
              aria-hidden
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </button>
          <a
            href="#services"
            className="font-body text-paper/75 underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold"
          >
            See what we cover
          </a>
        </div>
      </div>
    </section>
  );
}
```

Replace it with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { IconClock, IconArrow } from "./icons";
import { splitLastWord } from "@/lib/split-last-word";

function useTodayStamp() {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    setDate(
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date())
    );
  }, []);
  return date;
}

const DEFAULT_HEADLINE = "Commercial cleaning you can set your clock to.";
const DEFAULT_SUBHEADLINE =
  "Every visit logged, every job on time. Zolvex keeps commercial spaces audit-ready — without you lifting a finger.";

export function Hero({
  onBookNow,
  headline,
  subheadline,
}: {
  onBookNow: () => void;
  headline?: string;
  subheadline?: string;
}) {
  const today = useTodayStamp();
  const { rest, last } = splitLastWord(headline || DEFAULT_HEADLINE);

  return (
    <section
      id="top"
      className="ledger-ground-dark relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-8 lg:px-12"
    >
      {/* corner vignette so the grid recedes rather than tiling flat */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(238,215,123,0.14), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[90rem]">
        <div className="mb-8 flex flex-wrap items-center gap-3 font-stamp text-[0.72rem] uppercase tracking-wide text-gold/90">
          <span className="tabular" suppressHydrationWarning>
            {today ?? " "}
          </span>
          <span className="h-3 w-px bg-gold/30" aria-hidden />
          <span className="stamp-rotate inline-flex items-center gap-1.5 rounded-sm border border-gold/60 px-2 py-0.5">
            <IconClock className="h-3 w-3" />
            Status: On Duty
          </span>
          <span className="h-3 w-px bg-gold/30" aria-hidden />
          <span className="tabular">Visit Log — Entry Open</span>
        </div>

        <h1 className="balance max-w-4xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] text-paper">
          {rest}
          <span className="border-b-4 border-gold">{last}</span>
        </h1>

        <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-paper/80 sm:text-xl">
          {subheadline || DEFAULT_SUBHEADLINE}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onBookNow}
            className="group relative inline-flex items-center gap-2 bg-gold px-8 py-4 font-display text-base font-semibold text-ink shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            Book Now
            <IconArrow
              aria-hidden
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </button>
          <a
            href="#services"
            className="font-body text-paper/75 underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold"
          >
            See what we cover
          </a>
        </div>
      </div>
    </section>
  );
}
```

(The animated hand-drawn SVG underline and its `<style>` keyframe block are removed, replaced by a plain `border-b-4 border-gold` under the dynamic last word — a static equivalent, not a redesign, per this plan's spec.)

- [ ] **Step 8: Create the Server Component page and its client wrapper**

The current `apps/web/app/page.tsx` (read it first to confirm its exact current content matches what's described in this plan's spec) becomes two files. First, the new Server Component:

```tsx
// apps/web/app/(site)/page.tsx
import { getPageContent } from "@/lib/public-content/fetch";
import { HomePageClient } from "./HomePageClient";

interface HeroContent {
  headline?: string;
  subheadline?: string;
}

export default async function Home() {
  const hero = await getPageContent<HeroContent>("hero");

  return <HomePageClient heroHeadline={hero?.headline} heroSubheadline={hero?.subheadline} />;
}
```

Then the client wrapper, holding exactly the interactive state the old `page.tsx` had:

```tsx
// apps/web/app/(site)/HomePageClient.tsx
"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { WhyUs } from "@/components/WhyUs";
import { FeaturedService } from "@/components/FeaturedService";
import { Blog } from "@/components/Blog";
import { FAQ } from "@/components/FAQ";
import { Testimonials } from "@/components/Testimonials";
import { InstagramFeed } from "@/components/InstagramFeed";
import { Footer } from "@/components/Footer";
import { EnquiryModal } from "@/components/EnquiryModal";

export function HomePageClient({
  heroHeadline,
  heroSubheadline,
}: {
  heroHeadline?: string;
  heroSubheadline?: string;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);

  return (
    <>
      <Nav />
      <main id="main">
        <Hero onBookNow={openBooking} headline={heroHeadline} subheadline={heroSubheadline} />
        <Services />
        <WhyUs />
        <FeaturedService onBookNow={openBooking} />
        <Blog />
        <FAQ />
        <Testimonials />
        <InstagramFeed />
      </main>
      <Footer onBookNow={openBooking} />
      <EnquiryModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
```

(Ground-truthed against the real `apps/web/app/page.tsx` during this plan's own writing — `EnquiryModal`'s props are exactly `{open, onClose}`, and there is no section between `InstagramFeed` and `Footer`; the snippet above is complete, not a reconstruction.)

- [ ] **Step 9: Delete the old page.tsx**

```bash
git rm apps/web/app/page.tsx
```

- [ ] **Step 10: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors, and confirm `/`, `/privacy`, `/terms` are all still registered with their exact same URLs (not `/site/...`). Run `npm run test --workspace=apps/web` — confirm all prior tests plus this task's 6 new tests (3 for `splitLastWord`, matching Step 1-4 above) pass.

- [ ] **Step 11: Commit**

```bash
git add "apps/web/app/(site)" apps/web/app/page.tsx apps/web/components/Hero.tsx apps/web/lib/split-last-word.ts apps/web/lib/split-last-word.test.ts
git commit -m "feat(web): move public pages into a (site) route group; wire Hero to real PageContent"
```

---

## Task 7: Wire Services + FeaturedService

**Files:**
- Modify: `apps/web/components/Services.tsx`
- Modify: `apps/web/components/FeaturedService.tsx`
- Modify: `apps/web/app/(site)/page.tsx`
- Modify: `apps/web/app/(site)/HomePageClient.tsx`

**Interfaces:**
- Consumes: `getPublicContent` (Task 4), `iconForServiceKey` (Task 5).
- Produces: `Services`' and `FeaturedService`'s new prop shapes.

- [ ] **Step 1: Define the shared Service shape and update Services.tsx**

Current `apps/web/components/Services.tsx` hardcodes a `SERVICES` array of `{name, icon, rotate}`. Ground-truthed against the real file (reproduced here exactly, not reconstructed) — the card is an `<article>` with a perforated tear-edge decoration and the icon on the right; it does not currently render `shortDescription` at all, and this task doesn't add it (that's a visual-design decision outside this plan's scope of "wire real data in," not "redesign the card"). Replace the whole file:

```tsx
// apps/web/components/Services.tsx
import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { iconForServiceKey } from "@/lib/service-icons";

export interface PublicService {
  id: string;
  name: string;
  shortDescription: string;
  icon?: string | null;
}

const ROTATIONS = ["-rotate-1", "rotate-1"] as const;

export function Services({ services }: { services: PublicService[] }) {
  return (
    <section id="services" className="punch-edge relative bg-ink px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <h2 className="max-w-lg font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
            The jobs on our sheet.
          </h2>
        </Stamped>

        {services.length === 0 ? (
          <p className="mt-14 font-stamp text-sm uppercase tracking-wide text-paper/60">
            On file — pending. Services land here once published from the admin panel.
          </p>
        ) : (
          <div
            role="region"
            aria-label="Services, scroll horizontally for more"
            tabIndex={0}
            className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-4"
          >
            {services.map((service, i) => {
              const Icon = iconForServiceKey(service.icon);
              return (
                <Stamped
                  key={service.id}
                  delayMs={i * 70}
                  className={`w-64 shrink-0 snap-start sm:w-72 ${ROTATIONS[i % 2]}`}
                >
                  <article className="group relative border border-gold/15 bg-ink-soft p-4 pt-6 transition-transform duration-300 hover:-translate-y-1 hover:rotate-0">
                    {/* perforated tear edge at the top of the ticket */}
                    <span
                      aria-hidden
                      className="absolute -top-2 left-0 right-0 h-2 bg-repeat-x"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, var(--color-ink) 3px, transparent 3.1px)",
                        backgroundSize: "1.5rem 100%",
                      }}
                    />
                    <PlaceholderPhoto label={service.name} tone="dark" />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <h3 className="font-body text-lg font-medium text-paper">{service.name}</h3>
                      <Icon className="h-7 w-7 shrink-0 text-gold" />
                    </div>
                  </article>
                </Stamped>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update FeaturedService.tsx**

Current file hardcodes `CHECKLIST` and `"Office Deep Clean"`. Replace:

```tsx
// apps/web/components/FeaturedService.tsx
import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconArrow } from "./icons";
import { iconForServiceKey } from "@/lib/service-icons";
import type { PublicService } from "./Services";

export interface FeaturedServiceRecord extends PublicService {
  fullDescription: string;
}

export function FeaturedService({
  service,
  onBookNow,
}: {
  service: FeaturedServiceRecord | null;
  onBookNow: () => void;
}) {
  if (!service) return null;
  const Icon = iconForServiceKey(service.icon);

  return (
    <section className="bg-paper-dim px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[90rem] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Stamped>
          <PlaceholderPhoto label={service.name} tone="light" size="lg" className="aspect-[5/4]" />
        </Stamped>

        <Stamped delayMs={100}>
          <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 text-olive-ink" />
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              {service.name}
            </h2>
          </div>
          <p className="mt-4 max-w-lg font-body text-lg leading-relaxed text-slate">
            {service.fullDescription}
          </p>
          <button
            type="button"
            onClick={onBookNow}
            className="group mt-8 inline-flex items-center gap-2 border-2 border-ink px-7 py-3.5 font-display font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Book This Service
            <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </Stamped>
      </div>
    </section>
  );
}
```

(The hardcoded `CHECKLIST` bullet list is dropped per this plan's spec — `Service` has no backing field for it; `fullDescription` replaces it as the body copy. The header icon uses the same `iconForServiceKey` lookup as `Services.tsx`, rendering the actual highlighted service's own icon — not a fixed `IconOffice`/`IconCheck` — since this section can now feature any service, not always "Office Deep Clean.")

- [ ] **Step 3: Wire both into the page**

In `apps/web/app/(site)/page.tsx`, add the fetch and the highlighted-service pick:

```tsx
// apps/web/app/(site)/page.tsx
import { getPageContent, getPublicContent } from "@/lib/public-content/fetch";
import { HomePageClient } from "./HomePageClient";
import type { PublicService } from "@/components/Services";
import type { FeaturedServiceRecord } from "@/components/FeaturedService";

interface HeroContent {
  headline?: string;
  subheadline?: string;
}

export default async function Home() {
  const [hero, services] = await Promise.all([
    getPageContent<HeroContent>("hero"),
    getPublicContent<FeaturedServiceRecord & { isHighlighted?: boolean }>("service"),
  ]);

  const highlighted = services.find((s) => s.isHighlighted) ?? null;

  return (
    <HomePageClient
      heroHeadline={hero?.headline}
      heroSubheadline={hero?.subheadline}
      services={services}
      featuredService={highlighted}
    />
  );
}
```

In `apps/web/app/(site)/HomePageClient.tsx`, add the two new props and pass them through:

```tsx
export function HomePageClient({
  heroHeadline,
  heroSubheadline,
  services,
  featuredService,
}: {
  heroHeadline?: string;
  heroSubheadline?: string;
  services: PublicService[];
  featuredService: FeaturedServiceRecord | null;
}) {
```

(Add the matching `import type { PublicService } from "@/components/Services";` and `import type { FeaturedServiceRecord } from "@/components/FeaturedService";` at the top, alongside the existing imports.)

Replace `<Services />` with `<Services services={services} />` and `<FeaturedService onBookNow={openBooking} />` with `<FeaturedService service={featuredService} onBookNow={openBooking} />`.

- [ ] **Step 4: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors. Run `npm run test --workspace=apps/web` — confirm all prior tests still pass (this task adds no new automated tests; the visual result is manually verified in this plan's Final Verification).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/Services.tsx apps/web/components/FeaturedService.tsx "apps/web/app/(site)/page.tsx" "apps/web/app/(site)/HomePageClient.tsx"
git commit -m "feat(web): wire Services and FeaturedService to real backend data"
```

---

## Task 8: Wire Blog

**Files:**
- Modify: `apps/web/components/Blog.tsx`
- Modify: `apps/web/app/(site)/page.tsx`
- Modify: `apps/web/app/(site)/HomePageClient.tsx`

**Interfaces:**
- Consumes: `getPublicContent` (Task 4).

- [ ] **Step 1: Update Blog.tsx**

The current `POSTS` array has `{title, excerpt, tag}` and links to nothing. `BlogPost`'s real schema is `{title, image, instagramUrl, order, isActive}` — no excerpt/tag exist. Replace the whole file:

```tsx
// apps/web/components/Blog.tsx
import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconArrow } from "./icons";

export interface PublicBlogPost {
  id: string;
  title: string;
  image: string;
  instagramUrl: string;
}

export function Blog({ posts }: { posts: PublicBlogPost[] }) {
  return (
    <section className="ledger-ground-dark punch-edge relative px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <h2 className="max-w-lg font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
            From the log book.
          </h2>
        </Stamped>

        {posts.length === 0 ? (
          <p className="mt-14 font-stamp text-sm uppercase tracking-wide text-paper/60">
            On file — pending. Posts land here once published from the admin panel.
          </p>
        ) : (
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {posts.map((post, i) => (
              <Stamped key={post.id} delayMs={i * 90}>
                <a
                  href={post.instagramUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex h-full flex-col"
                >
                  <PlaceholderPhoto label={post.title} tone="dark" />
                  <h3 className="mt-5 font-display text-xl font-medium leading-snug text-paper">
                    {post.title}
                  </h3>
                  <div className="mt-4 flex items-center gap-2.5">
                    <span className="inline-flex w-fit items-center gap-1.5 font-body text-sm text-gold underline decoration-gold/30 underline-offset-4 transition-colors group-hover:decoration-gold">
                      View on Instagram
                      <IconArrow aria-hidden className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              </Stamped>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

(`excerpt` and `tag` are dropped entirely — no backing field exists; the card now links out to `instagramUrl`, matching what the data actually models per this plan's spec.)

- [ ] **Step 2: Wire it into the page**

In `apps/web/app/(site)/page.tsx`, add `getPublicContent<PublicBlogPost>("blog-post")` to the `Promise.all`, add the `import type { PublicBlogPost } from "@/components/Blog";`, and pass `posts={blogPosts}` to `HomePageClient`. In `HomePageClient.tsx`, add the `posts: PublicBlogPost[]` prop and pass it to `<Blog posts={posts} />` (replacing the prop-less `<Blog />`).

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` and `npm run test --workspace=apps/web` — no errors, all prior tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/Blog.tsx "apps/web/app/(site)/page.tsx" "apps/web/app/(site)/HomePageClient.tsx"
git commit -m "feat(web): wire Blog to real backend data, reshaped to match BlogPost's actual fields"
```

---

## Task 9: Wire Testimonials + Google Review button

**Files:**
- Modify: `apps/web/components/Testimonials.tsx`
- Modify: `apps/web/app/(site)/page.tsx`
- Modify: `apps/web/app/(site)/HomePageClient.tsx`

**Interfaces:**
- Consumes: `getPublicContent`, `getPageContent` (Task 4); `safeHref` (Task 8 — added there as a fix-round response to a real stored-XSS finding on Blog's `instagramUrl` link; every admin-entered URL rendered as an `href` on the public site must go through it, not just Blog's).

- [ ] **Step 1: Update Testimonials.tsx**

Replace the hardcoded `PLACEHOLDER_REVIEWS` array and add the new Google Review link — note the `href` uses `safeHref(googleReviewUrl)`, not the raw value, for the same reason as Blog's `instagramUrl` link (Task 8): `google-review`'s URL is admin-entered and only Zod-`.url()`-validated server-side, which doesn't reject `javascript:`/`data:` schemes:

```tsx
// apps/web/components/Testimonials.tsx
import { Stamped } from "./Stamped";
import { IconStar, IconStarOutline } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicTestimonial {
  id: string;
  name: string;
  rating: number;
  message: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < rating ? (
          <IconStar key={i} className="h-4 w-4 text-gold" />
        ) : (
          <IconStarOutline key={i} className="h-4 w-4 text-slate/40" />
        )
      )}
    </div>
  );
}

export function Testimonials({
  testimonials,
  googleReviewUrl,
}: {
  testimonials: PublicTestimonial[];
  googleReviewUrl?: string | null;
}) {
  return (
    <section className="bg-paper-dim px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              On the client’s record.
            </h2>
            {googleReviewUrl && (
              <a
                href={safeHref(googleReviewUrl)}
                target="_blank"
                rel="noreferrer noopener"
                className="border-2 border-ink px-5 py-2.5 font-display text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Read our reviews on Google
              </a>
            )}
          </div>
        </Stamped>

        {testimonials.length === 0 ? (
          <p className="mt-12 font-body text-sm text-slate">
            On file — pending. Real client reviews land here once published from the admin panel.
          </p>
        ) : (
          <div
            role="region"
            aria-label="Client reviews, scroll horizontally for more"
            tabIndex={0}
            className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-4"
          >
            {testimonials.map((review, i) => (
              <Stamped
                key={review.id}
                delayMs={i * 80}
                className="w-80 shrink-0 snap-start sm:w-96"
              >
                <figure className="flex h-full flex-col border border-ink/12 bg-paper p-6">
                  <Stars rating={review.rating} />
                  <blockquote className="mt-4 flex-1 font-body text-lg italic leading-relaxed text-ink">
                    “{review.message}”
                  </blockquote>
                  <figcaption className="mt-5 border-t border-ink/10 pt-4 font-body text-sm text-slate">
                    {review.name}
                  </figcaption>
                </figure>
              </Stamped>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into the page**

In `apps/web/app/(site)/page.tsx`, add `getPublicContent<PublicTestimonial>("testimonial")` and `getPageContent<{ url?: string }>("google-review")` to the `Promise.all`, import `PublicTestimonial` from `@/components/Testimonials`, and pass `testimonials={testimonials}` and `googleReviewUrl={googleReview?.url}` to `HomePageClient`. In `HomePageClient.tsx`, add both props and pass them to `<Testimonials testimonials={testimonials} googleReviewUrl={googleReviewUrl} />`.

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` and `npm run test --workspace=apps/web` — no errors, all prior tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/Testimonials.tsx "apps/web/app/(site)/page.tsx" "apps/web/app/(site)/HomePageClient.tsx"
git commit -m "feat(web): wire Testimonials to real backend data, add Google Review link"
```

---

## Task 10: Wire FAQ

**Files:**
- Modify: `apps/web/components/FAQ.tsx`
- Modify: `apps/web/app/(site)/page.tsx`
- Modify: `apps/web/app/(site)/HomePageClient.tsx`

**Interfaces:**
- Consumes: `getPublicContent` (Task 4).

- [ ] **Step 1: Update FAQ.tsx**

```tsx
// apps/web/components/FAQ.tsx
import { Stamped } from "./Stamped";
import { IconChevron } from "./icons";

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
}

export function FAQ({ faqs }: { faqs: PublicFaq[] }) {
  return (
    <section className="bg-paper px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Questions on the record.
            </h2>

            {faqs.length === 0 ? (
              <p className="mt-12 font-body text-sm text-slate">
                On file — pending. Answers land here once published from the admin panel.
              </p>
            ) : (
              <div className="mt-12 divide-y divide-ink/12 border-t border-ink/12">
                {faqs.map((faq) => (
                  <details key={faq.id} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-body text-lg font-medium text-ink marker:content-none">
                      {faq.question}
                      <IconChevron className="h-5 w-5 shrink-0 text-olive-ink transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 max-w-2xl font-body leading-relaxed text-slate">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </Stamped>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into the page**

Add `getPublicContent<PublicFaq>("faq")` to the `Promise.all` in `page.tsx`, import the type, pass `faqs={faqs}` down; add the prop to `HomePageClient` and use `<FAQ faqs={faqs} />`.

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` and `npm run test --workspace=apps/web`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/FAQ.tsx "apps/web/app/(site)/page.tsx" "apps/web/app/(site)/HomePageClient.tsx"
git commit -m "feat(web): wire FAQ to real backend data"
```

---

## Task 11: Wire InstagramFeed

**Files:**
- Modify: `apps/web/components/InstagramFeed.tsx`
- Modify: `apps/web/app/(site)/page.tsx`
- Modify: `apps/web/app/(site)/HomePageClient.tsx`

**Interfaces:**
- Consumes: `getPublicContent` (Task 4); `safeHref` (Task 8, `apps/web/lib/safe-url.ts`) — `permalink` is an admin-entered URL and must never be rendered as a raw `href`, the same stored-XSS risk found and fixed for Blog's `instagramUrl` in Task 8.

- [ ] **Step 1: Update InstagramFeed.tsx**

```tsx
// apps/web/components/InstagramFeed.tsx
import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconInstagram } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicInstagramPost {
  id: string;
  image: string;
  permalink: string;
}

export function InstagramFeed({ posts }: { posts: PublicInstagramPost[] }) {
  return (
    <section className="ledger-ground-dark px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="flex flex-wrap items-center gap-3">
            <IconInstagram className="h-7 w-7 text-gold" />
            <h2 className="font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
              Follow the crew.
            </h2>
          </div>
        </Stamped>

        {posts.length === 0 ? (
          <p className="mt-12 font-stamp text-sm uppercase tracking-wide text-paper/60">
            On file — pending. Posts land here once published from the admin panel.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {posts.map((post, i) => (
              <Stamped key={post.id} delayMs={i * 60}>
                <a
                  href={safeHref(post.permalink)}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Open this post on Instagram"
                  className="group relative block"
                >
                  <PlaceholderPhoto label={post.image} tone="dark" className="aspect-square" />
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/60 group-hover:opacity-100">
                    <IconInstagram className="h-6 w-6 text-gold" />
                  </span>
                </a>
              </Stamped>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

(`post.image` is passed as `PlaceholderPhoto`'s `label` here only as a fallback while real photography is still pending per `PRODUCT.md`'s "Evidence on Hand" section — once `PlaceholderPhoto` is swapped for a real `<img>` using `post.image` as the URL in a later, photography-focused pass, this label usage is replaced too. This plan does not add real-image rendering — that's outside its scope, which is about wiring the data, not the "real photography" milestone `PRODUCT.md` describes as a separate future event.)

- [ ] **Step 2: Wire it into the page**

Add `getPublicContent<PublicInstagramPost>("instagram-post")` to the `Promise.all`, pass `posts={instagramPosts}` down through `HomePageClient`, use `<InstagramFeed posts={posts} />`.

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` and `npm run test --workspace=apps/web`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/InstagramFeed.tsx "apps/web/app/(site)/page.tsx" "apps/web/app/(site)/HomePageClient.tsx"
git commit -m "feat(web): wire InstagramFeed to real backend data"
```

---

## Task 12: Wire Footer

**Files:**
- Modify: `apps/web/components/Footer.tsx`
- Modify: `apps/web/app/(site)/page.tsx`
- Modify: `apps/web/app/(site)/HomePageClient.tsx`

**Interfaces:**
- Consumes: `getPageContent` (Task 4); `safeHref` (Task 8, `apps/web/lib/safe-url.ts`) — `instagramUrl` is an admin-entered URL and must never be rendered as a raw `href`, the same stored-XSS risk found and fixed for Blog's `instagramUrl` in Task 8.

- [ ] **Step 1: Update Footer.tsx**

Only the tagline paragraph, the Instagram link, and the phone link change — the rest of the Footer (Company/Legal columns, copyright line) stays exactly as-is, matching this plan's spec (only `tagline`, `instagramUrl`, and a `whatsapp`-sourced `phoneNumber` are dynamic).

```tsx
// apps/web/components/Footer.tsx
import { IconPhone, IconInstagram } from "./icons";
import { safeHref } from "@/lib/safe-url";

const DEFAULT_TAGLINE =
  "Commercial cleaning, logged and on time — for offices, retail, and commercial spaces.";

export function Footer({
  onBookNow,
  tagline,
  instagramUrl,
  phoneNumber,
}: {
  onBookNow: () => void;
  tagline?: string;
  instagramUrl?: string;
  phoneNumber?: string;
}) {
  return (
    <footer className="punch-edge relative bg-ink px-5 pb-10 pt-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="#top" className="font-display text-2xl font-semibold text-paper">
              Zolvex
            </a>
            <p className="mt-3 max-w-xs font-body text-sm leading-relaxed text-paper/70">
              {tagline || DEFAULT_TAGLINE}
            </p>
          </div>

          <div>
            <h3 className="font-stamp text-xs uppercase tracking-[0.15em] text-gold/80">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-paper/75">
              <li><a href="#about" className="hover:text-gold">About Us</a></li>
              <li><a href="#services" className="hover:text-gold">Services</a></li>
              <li>
                <button type="button" onClick={onBookNow} className="text-left hover:text-gold">
                  Book Now
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-stamp text-xs uppercase tracking-[0.15em] text-gold/80">
              Contact
            </h3>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-paper/75">
              {phoneNumber && (
                <li className="flex items-center gap-2">
                  <IconPhone className="h-4 w-4 text-gold" />
                  <a href={`tel:${phoneNumber}`} className="hover:text-gold">
                    Call for a quote
                  </a>
                </li>
              )}
              {instagramUrl && (
                <li className="flex items-center gap-2">
                  <IconInstagram className="h-4 w-4 text-gold" />
                  <a href={safeHref(instagramUrl)} target="_blank" rel="noreferrer noopener" className="hover:text-gold">
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-stamp text-xs uppercase tracking-[0.15em] text-gold/80">
              Legal
            </h3>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-paper/75">
              <li><a href="/terms" className="hover:text-gold">Terms & Conditions</a></li>
              <li><a href="/privacy" className="hover:text-gold">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-gold/10 pt-6 font-body text-xs text-paper/70 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Zolvex. All rights reserved.</span>
          <span className="font-stamp uppercase tracking-wide">Every visit, on the record.</span>
        </div>
      </div>
    </footer>
  );
}
```

(The phone and Instagram list items now only render `if` a real value exists — no placeholder `+10000000000`/generic Instagram URL is shown when unconfigured, per this plan's empty-state rule for these two links.)

- [ ] **Step 2: Wire it into the page**

Add `getPageContent<{ tagline?: string; instagramUrl?: string }>("footer")` and `getPageContent<{ phoneNumber?: string }>("whatsapp")` to the `Promise.all` in `page.tsx`, pass `footerTagline`, `footerInstagramUrl`, `phoneNumber` down through `HomePageClient`, use `<Footer onBookNow={openBooking} tagline={footerTagline} instagramUrl={footerInstagramUrl} phoneNumber={phoneNumber} />`. (Task 13, later, adds its own independent `getPageContent("whatsapp")` call inside the new `app/(site)/layout.tsx` for the floating button — a second, separate fetch of the same key from a different rendering scope, not a duplicate to eliminate; see Task 13's own note.)

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` and `npm run test --workspace=apps/web`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/Footer.tsx "apps/web/app/(site)/page.tsx" "apps/web/app/(site)/HomePageClient.tsx"
git commit -m "feat(web): wire Footer to real backend data"
```

---

## Task 13: Floating WhatsApp button

**Files:**
- Create: `apps/web/components/FloatingWhatsAppButton.tsx`
- Modify: `apps/web/app/(site)/layout.tsx`

**Interfaces:**
- Consumes: `getPageContent` (Task 4).
- Produces: nothing further downstream — this is the last task in this plan.

- [ ] **Step 1: Create the button component**

```tsx
// apps/web/components/FloatingWhatsAppButton.tsx
import { IconWhatsApp } from "./icons";

export function FloatingWhatsAppButton({ phoneNumber }: { phoneNumber?: string | null }) {
  if (!phoneNumber) return null;
  const digitsOnly = phoneNumber.replace(/[^\d]/g, "");

  return (
    <a
      href={`https://wa.me/${digitsOnly}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with Zolvex on WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-ink text-gold shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-colors hover:bg-gold hover:text-ink"
    >
      <IconWhatsApp className="h-6 w-6" />
    </a>
  );
}
```

`IconWhatsApp` does not exist yet in `apps/web/components/icons.tsx` — add it, following the file's exact existing pattern (a shared `base` SVG-props object, one exported function per icon, 24×24 viewBox, 1.5px stroke, round caps/joins — read the file first to match precisely):

```tsx
export function IconWhatsApp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20l1.3-4.7A8 8 0 1 1 8.7 19.7L4 20z" />
      <path d="M8.5 9.5c0 3.5 2.5 6 6 6" strokeOpacity="0.55" />
    </svg>
  );
}
```

- [ ] **Step 2: Wire it into the route group's layout**

```tsx
// apps/web/app/(site)/layout.tsx
import { getPageContent } from "@/lib/public-content/fetch";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";

interface WhatsAppContent {
  phoneNumber?: string;
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = await getPageContent<WhatsAppContent>("whatsapp");

  return (
    <>
      {children}
      <FloatingWhatsAppButton phoneNumber={whatsapp?.phoneNumber} />
    </>
  );
}
```

- [ ] **Step 3: Leave Task 12's `page.tsx` fetch of `whatsapp` as-is**

`page.tsx` (Task 12) and this file, `layout.tsx`, both now call `getPageContent("whatsapp")` independently — one feeds Footer's phone link, the other feeds the floating button. This is a minor, acceptable duplication (they hit the same 90-second-revalidated endpoint, not two different sources of truth) rather than a bug — a page-level fetch and a layout-level fetch can't trivially share one request in the App Router without lifting state further up the tree, and that restructuring isn't worth it for one extra cached fetch. Do not remove or "deduplicate" Task 12's fetch as part of this task.

- [ ] **Step 4: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors, confirm the new icon compiles. Run `npm run test --workspace=apps/web` — confirm all prior tests still pass. Confirm via the build output that `/admin/**` routes are unaffected by this change (the `(site)` layout only wraps `/`, `/privacy`, `/terms`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/FloatingWhatsAppButton.tsx apps/web/components/icons.tsx "apps/web/app/(site)/layout.tsx"
git commit -m "feat(web): add floating sitewide WhatsApp chat button"
```

---

## Final verification (do this once, after all 13 tasks)

- [ ] Run `npm run test --workspace=apps/web` — every test passing.
- [ ] Run `npm run build --workspace=apps/web` — compiles cleanly, confirm `/`, `/privacy`, `/terms`, and every `/admin/**` route are all still registered with unchanged URLs.
- [ ] Run `npm run typecheck --workspace=apps/api` and `npm run test --workspace=apps/api` — confirm the full backend suite passes, including this plan's new tests.
- [ ] Start the real Express backend and Next.js dev server. With the database empty of published content, visit `/` — confirm every section (Services, Blog, Testimonials, FAQ, Instagram) shows its own considered empty-state message, not a blank gap or a crash; confirm the Hero/Footer fall back to their default hardcoded copy; confirm the floating WhatsApp button and the Google Review link are both simply absent (not broken links).
- [ ] Publish one real record of each of the 5 content types via the admin panel (as a superadmin, so it's `published` immediately) — reload `/` and confirm each section now shows that real content, correctly mapped (Service's icon renders the right icon for a known key and falls back gracefully for an unknown one; Blog's card links out to the real `instagramUrl`; Testimonial's `name` renders as the caption; FAQ expands/collapses; Instagram tile links to the real `permalink`).
- [ ] Mark one Service `isHighlighted: true` — confirm `FeaturedService` renders it; unmark it — confirm the section disappears entirely (not an empty state).
- [ ] Configure all 4 `PageContent` keys via the admin's freeform JSON editor, using this plan's defined shapes exactly (`hero: {headline, subheadline}`, `footer: {tagline, instagramUrl}`, `whatsapp: {phoneNumber}`, `google-review: {url}`) — confirm Hero's headline updates (including the gold underline moving to the new last word), Footer's tagline/Instagram link/phone number update, the floating WhatsApp button appears and links to the right `wa.me` URL, and the Google Review button appears in Testimonials and opens the right URL in a new tab.
- [ ] Confirm a direct `curl` (or browser devtools network tab) to `/api/content/faq?status=pending_approval` still only returns published FAQs — the query param must have zero effect.
- [ ] Push the branch and open a PR against `master` using `gh pr create`.
