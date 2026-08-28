# Gate 2 Backend — Content API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the HTTP surface (routes/controllers/views) for content management on top of Gate 2's already-built auth layer and Foundation's `ApprovableResourceService`/`PlaceService`/`PageContentService` — generic CRUD+approval+reorder for five content types, Places, PageContent, image upload, and the three read-only governance views (Approvals dashboard, Trash, Audit Log) plus read-only Enquiries.

**Architecture:** Express MVC layer per the spec: `routes/admin/*.ts` (thin — method+path+middleware+controller), `controllers/admin/*.ts` (Zod-validate/allowlist the request, call the service, shape the response via a `views/admin/*.ts` function), Model = the existing Prisma-backed services. This is Plan 2 of 3 for Gate 2 (Backend Auth/Governance → **Backend Content API** → Frontend Admin UI). No Next.js/frontend work here.

**Tech Stack:** Express 4, Prisma 6 + Postgres, TypeScript (ESM), vitest + supertest, `zod` (already present), `multer`@2.2.0 + `cloudinary`@2.10.1 (new).

**Spec:** `docs/superpowers/specs/2026-08-25-gate-2-admin-panel-design.md` — this plan implements its "Generic resource-admin UI" and "Bespoke screens" sections' server side (the Next.js/React parts of those sections are Plan 3). Read the spec's "Error handling" section too — its status-code conventions are load-bearing below.

## Global Constraints

- Never call `prisma.<entity>.create/update/delete()` directly from a controller for Service/BlogPost/Testimonial/Faq/InstagramPost/Place/PageContent — always through the matching `lib/services/*` (`ApprovableResourceService`, `PlaceService`, `PageContentService`) so audit logging and workflow rules stay enforced. Reads (list/get) that don't mutate anything MAY query Prisma directly — the service's own header comment confirms reads are fine.
- Every request body reaching a service's `create`/`update` must be Zod-validated and allowlisted first — services only denylist known workflow-control fields, they do not validate (`INPUT-VALIDATION CONTRACT` in `approvable-resource.ts`).
- `fileParallelism: false` in `vitest.config.ts` is load-bearing — new test files share the one test database and clean it with unscoped `deleteMany()`; do not add `.concurrent` or change this setting.
- Zod validation failures return field-level 400s (`{ error: "invalid_request", issues: [...] }`, using the parsed Zod error's `.issues`).
- A slug conflict on `Service` (create/update/restore) is a 409 with the `SlugConflictError`'s message.
- Approving/rejecting/deleting/restoring a record in the wrong state (already handled, already deleted, not deleted, not pending) is a 409, body `{ error: "invalid_state", message: "..." }` — never a generic 500 or a silent no-op.
- A role violation caught from a service (e.g. an editor calling an approve-only operation) is a 403, body `{ error: "forbidden" }`.
- A record-not-found from a service is a 404, body `{ error: "not_found" }`.
- Image upload must finish (get a real Cloudinary URL) before the content record referencing it is saved — never save a record with a pending/broken image reference.
- All new content routes sit behind `requireAuth` at minimum (from `lib/auth/middleware.ts`, already built) — no unauthenticated route in this plan.

---

## Task 1: `ApprovableResourceService` — named errors, `list()`, `reorder()`

**Files:**
- Modify: `apps/api/src/lib/services/approvable-resource.ts`
- Modify: `apps/api/src/lib/services/approvable-resource.test.ts`

**Interfaces:**
- Produces: `RecordNotFoundError`, `ForbiddenActionError`, `InvalidStateError` (all `extends Error`, exported alongside the existing `SlugConflictError`) — consumed by Task 3's controller for HTTP status mapping.
- Produces: `ApprovableResourceService.list(filter?: { status?: ApprovalStatus; search?: string }): Promise<record[]>` — consumed by Task 3.
- Produces: `ApprovableResourceService.reorder(actor: Actor, items: { id: string; order: number }[]): Promise<record[]>` — consumed by Task 8.

- [ ] **Step 1: Replace the bare `Error` throws with named classes, preserving every existing message verbatim**

In `apps/api/src/lib/services/approvable-resource.ts`, add these three classes next to `SlugConflictError`:

```ts
export class RecordNotFoundError extends Error {}
export class ForbiddenActionError extends Error {}
export class InvalidStateError extends Error {}
```

Then replace throw sites (message text is unchanged — only the class changes, so every existing test that does `.rejects.toThrow(/pattern/)` still passes):

- `assertNotDeleted`: `throw new Error(...)` → `throw new InvalidStateError(...)`
- `softDelete`/`restore`/`approve`/`reject`'s `"Only superadmin can ..."` throws → `throw new ForbiddenActionError(...)`
- Every `` `${this.entityName} ${id} not found` `` throw (in `update`, `softDelete`, `restore`, `approve`, `reject`) → `throw new RecordNotFoundError(...)`
- `softDelete`'s `"already deleted"`, `restore`'s `"is not deleted"`, `approve`'s/`reject`'s `"not pending approval"`, `reject`'s `"rejectionReason is required"` → `throw new InvalidStateError(...)`

- [ ] **Step 2: Add a per-delegate search-field map next to `ENTITY_NAMES`**

```ts
// The one free-text-searchable column per type, used by list()'s `search` filter.
const SEARCH_FIELDS: Record<DelegateName, string> = {
  service: "name",
  blogPost: "title",
  testimonial: "name",
  faq: "question",
  instagramPost: "permalink",
};

// Not every delegate has an `order` column — `Testimonial` doesn't (confirmed
// against schema.prisma; the spec's claim that "all five types have an order
// field" is wrong for this one, ground truth over intention, same as the
// Plan 1 spec's own documented Place correction). list() falls back to
// createdAt for these, and reorder() refuses them outright with a clear
// error instead of letting Prisma throw an opaque "Unknown argument" error.
const ORDERABLE: Partial<Record<DelegateName, true>> = {
  service: true,
  blogPost: true,
  faq: true,
  instagramPost: true,
};
```

- [ ] **Step 3: Write the failing tests for `list()`**

Add to `apps/api/src/lib/services/approvable-resource.test.ts`, inside the existing `describe("ApprovableResourceService", ...)` block (or a new top-level `describe` — match whatever the file's existing structure uses for the `services` const already declared there):

```ts
describe("ApprovableResourceService.list", () => {
  it("returns every record with no filter", async () => {
    await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "Q1", answer: "A1" });
    await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "Q2", answer: "A2" });

    const all = await services.faq.list();
    expect(all).toHaveLength(2);
  });

  it("filters by approvalStatus", async () => {
    await services.faq.create({ id: editorId, role: "editor" }, { question: "Pending one", answer: "A" });
    await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "Published one", answer: "A" });

    const pending = await services.faq.list({ status: "pending_approval" });
    expect(pending).toHaveLength(1);
    expect(pending[0].question).toBe("Pending one");
  });

  it("filters by free-text search on the type's searchable field, case-insensitive", async () => {
    await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "How do refunds work?", answer: "A" });
    await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "What are your hours?", answer: "A" });

    const found = await services.faq.list({ search: "REFUNDS" });
    expect(found).toHaveLength(1);
    expect(found[0].question).toBe("How do refunds work?");
  });
});
```

Confirm `editorId`/`superadminId`/`services.faq` (or equivalent) already exist as shared fixtures in this test file from its existing top-of-file setup — if the file's actual fixture names differ, use the file's real names, don't invent new ones.

- [ ] **Step 4: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- approvable-resource.test`
Expected: FAIL — `services.faq.list is not a function`.

- [ ] **Step 5: Implement `list()`**

Add to the `ApprovableResourceService` class:

```ts
async list(filter?: { status?: string; search?: string }) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (filter?.status) where.approvalStatus = filter.status;
  if (filter?.search) {
    where[SEARCH_FIELDS[this.delegateName]] = { contains: filter.search, mode: "insensitive" };
  }
  const orderBy = ORDERABLE[this.delegateName] ? { order: "asc" as const } : { createdAt: "desc" as const };
  return this.delegate(this.prisma).findMany({ where, orderBy });
}
```

Note `this.delegate(this.prisma)` (not `this.delegate(tx)`) — `list()` isn't transactional, it's a plain read, so it calls the private `delegate()` helper with the plain `prisma` client instead of a `tx`. `Testimonial` (no `order` column) falls back to `createdAt desc` — newest first, a reasonable default for a type with no manual ordering; the other four types get `order asc` as normal.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- approvable-resource.test`
Expected: PASS.

- [ ] **Step 7: Write the failing tests for `reorder()`**

```ts
describe("ApprovableResourceService.reorder", () => {
  it("updates order on every listed record and writes one audit row per record", async () => {
    const a = await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "A", answer: "A" });
    const b = await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "B", answer: "B" });

    await prisma.auditLog.deleteMany(); // clear the create-audit noise before asserting on reorder's rows

    const result = await services.faq.reorder({ id: superadminId, role: "superadmin" }, [
      { id: a.id, order: 2 },
      { id: b.id, order: 1 },
    ]);

    expect(result.find((r) => r.id === a.id)?.order).toBe(2);
    expect(result.find((r) => r.id === b.id)?.order).toBe(1);

    const logs = await prisma.auditLog.findMany({ where: { entity: "Faq" } });
    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.action === "update")).toBe(true);
  });

  it("is atomic: an unknown id in the batch rolls back every change in it", async () => {
    const a = await services.faq.create({ id: superadminId, role: "superadmin" }, { question: "A", answer: "A" });

    await expect(
      services.faq.reorder({ id: superadminId, role: "superadmin" }, [
        { id: a.id, order: 5 },
        { id: "does-not-exist", order: 1 },
      ])
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    const unchanged = await prisma.faq.findUniqueOrThrow({ where: { id: a.id } });
    expect(unchanged.order).toBe(0);
  });

  it("refuses to reorder a type with no order column (Testimonial)", async () => {
    const t = await prisma.testimonial.create({ data: { name: "Jane", rating: 5, message: "Great" } });
    await expect(
      services.testimonial.reorder({ id: superadminId, role: "superadmin" }, [{ id: t.id, order: 1 }])
    ).rejects.toBeInstanceOf(InvalidStateError);
  });
});
```

Import `RecordNotFoundError` and `InvalidStateError` at the top of the test file alongside whatever this file already imports from `./approvable-resource.js`. Confirm the file's existing `services` const already includes a `testimonial` entry (an `ApprovableResourceService(prisma, "testimonial")` instance) — if it doesn't yet, add one, matching the pattern of the existing entries.

- [ ] **Step 8: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- approvable-resource.test`
Expected: FAIL — `services.faq.reorder is not a function`.

- [ ] **Step 9: Implement `reorder()`**

```ts
async reorder(actor: Actor, items: { id: string; order: number }[]) {
  if (!ORDERABLE[this.delegateName]) {
    throw new InvalidStateError(`${this.entityName} does not support manual ordering`);
  }
  return this.prisma.$transaction(async (tx) => {
    const results = [];
    for (const item of items) {
      const before = await this.delegate(tx).findUnique({ where: { id: item.id } });
      if (!before) throw new RecordNotFoundError(`${this.entityName} ${item.id} not found`);

      const record = await this.delegate(tx).update({ where: { id: item.id }, data: { order: item.order } });
      await writeAuditRow(tx, {
        entity: this.entityName,
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        action: "update",
        entityId: item.id,
        diff: buildAuditDiff({ order: before.order }, { order: record.order }),
      });
      results.push(record);
    }
    return results;
  });
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- approvable-resource.test`
Expected: PASS, all new tests (previous 27 + 6 new = 33).

- [ ] **Step 11: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 123 tests passing (117 previous + 6 new). If this number doesn't match exactly because the baseline you inherited differs, that's fine — confirm all tests pass, don't chase an exact count.

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/lib/services/approvable-resource.ts apps/api/src/lib/services/approvable-resource.test.ts
git commit -m "feat(api): add named errors, list(), and reorder() to ApprovableResourceService"
```

---

## Task 2: Content-type registry and per-type Zod schemas

**Files:**
- Create: `apps/api/src/controllers/admin/content.schemas.ts`
- Test: `apps/api/src/controllers/admin/content.schemas.test.ts`

**Interfaces:**
- Produces: `CONTENT_TYPES` (the route-param allowlist, e.g. `["service", "blog-post", "testimonial", "faq", "instagram-post"]`), `ContentType` (the union type), `delegateNameFor(type: ContentType): DelegateName`-equivalent lookup map `TYPE_TO_DELEGATE`, and `schemaFor(type: ContentType)` returning the type's Zod schema — all consumed by Task 3's controller.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/controllers/admin/content.schemas.test.ts
import { describe, it, expect } from "vitest";
import { CONTENT_TYPES, TYPE_TO_DELEGATE, schemaFor } from "./content.schemas.js";

describe("CONTENT_TYPES / TYPE_TO_DELEGATE", () => {
  it("has exactly the five generic approvable types, each mapped to its ApprovableResourceService delegate name", () => {
    expect(CONTENT_TYPES).toEqual(["service", "blog-post", "testimonial", "faq", "instagram-post"]);
    expect(TYPE_TO_DELEGATE["service"]).toBe("service");
    expect(TYPE_TO_DELEGATE["blog-post"]).toBe("blogPost");
    expect(TYPE_TO_DELEGATE["testimonial"]).toBe("testimonial");
    expect(TYPE_TO_DELEGATE["faq"]).toBe("faq");
    expect(TYPE_TO_DELEGATE["instagram-post"]).toBe("instagramPost");
  });
});

describe("schemaFor", () => {
  it("validates a well-formed service payload and strips unknown fields", () => {
    const result = schemaFor("service").safeParse({
      name: "Office Deep Clean",
      slug: "office-deep-clean",
      shortDescription: "Short",
      fullDescription: "Full",
      order: 1,
      isActive: true,
      hacker: "field that should not exist on Service",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("hacker");
    }
  });

  it("rejects a service payload missing required fields", () => {
    const result = schemaFor("service").safeParse({ name: "Only a name" });
    expect(result.success).toBe(false);
  });

  it("validates a well-formed blog-post payload", () => {
    const result = schemaFor("blog-post").safeParse({
      title: "How we clean offices",
      image: "https://example.test/a.jpg",
      instagramUrl: "https://instagram.com/p/abc",
    });
    expect(result.success).toBe(true);
  });

  it("validates a well-formed testimonial payload", () => {
    const result = schemaFor("testimonial").safeParse({
      name: "Jane D.",
      rating: 5,
      message: "Great service",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a testimonial rating outside 1-5", () => {
    const result = schemaFor("testimonial").safeParse({ name: "Jane D.", rating: 6, message: "Great" });
    expect(result.success).toBe(false);
  });

  it("validates a well-formed faq payload", () => {
    const result = schemaFor("faq").safeParse({ question: "Q?", answer: "A." });
    expect(result.success).toBe(true);
  });

  it("validates a well-formed instagram-post payload", () => {
    const result = schemaFor("instagram-post").safeParse({
      image: "https://example.test/a.jpg",
      permalink: "https://instagram.com/p/abc",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- content.schemas.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `content.schemas.ts`**

```ts
// apps/api/src/controllers/admin/content.schemas.ts
import { z } from "zod";

/**
 * The five content types this generic route family serves — kebab-case route
 * params, matched one-to-one against ApprovableResourceService's DelegateName
 * via TYPE_TO_DELEGATE below. This array IS the route-param allowlist: a
 * `:type` value not in this list must never reach a service.
 */
export const CONTENT_TYPES = ["service", "blog-post", "testimonial", "faq", "instagram-post"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const TYPE_TO_DELEGATE: Record<ContentType, "service" | "blogPost" | "testimonial" | "faq" | "instagramPost"> = {
  service: "service",
  "blog-post": "blogPost",
  testimonial: "testimonial",
  faq: "faq",
  "instagram-post": "instagramPost",
};

/**
 * One named schema per type — this is the HTTP-layer allowlist
 * `approvable-resource.ts`'s INPUT-VALIDATION CONTRACT requires. Never derive
 * these from a client-side config; keep them explicit and server-authoritative.
 * Workflow-control fields (approvalStatus, submittedBy, id, timestamps, etc.)
 * are deliberately absent — the service sets those itself.
 */
const serviceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  shortDescription: z.string().min(1).max(500),
  fullDescription: z.string().min(1).max(5000),
  image: z.string().url().optional(),
  icon: z.string().max(200).optional(),
  isHighlighted: z.boolean().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImage: z.string().url().optional(),
});

const blogPostSchema = z.object({
  title: z.string().min(1).max(200),
  image: z.string().url(),
  instagramUrl: z.string().url(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const testimonialSchema = z.object({
  name: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  message: z.string().min(1).max(2000),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const faqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const instagramPostSchema = z.object({
  image: z.string().url(),
  permalink: z.string().url(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const SCHEMAS: Record<ContentType, z.ZodTypeAny> = {
  service: serviceSchema,
  "blog-post": blogPostSchema,
  testimonial: testimonialSchema,
  faq: faqSchema,
  "instagram-post": instagramPostSchema,
};

export function schemaFor(type: ContentType): z.ZodTypeAny {
  return SCHEMAS[type];
}

/**
 * All create/update fields are optional at the update layer (a PATCH may send
 * only the fields that changed) — this produces a partial version of a type's
 * schema for Task 5's update endpoint to use, without duplicating every field.
 */
export function partialSchemaFor(type: ContentType) {
  return (SCHEMAS[type] as z.ZodObject<any>).partial();
}
```

Every field above must match `schema.prisma`'s actual column list for that model exactly (re-check `Service`/`BlogPost`/`Testimonial`/`Faq`/`InstagramPost` in `apps/api/prisma/schema.prisma` before finalizing — the lengths/optionality here are reasonable defaults, not verified against a product decision, so if a field is missing or a bound looks wrong, fix the schema to match the actual model rather than the model to match this plan).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- content.schemas.test`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: all previous tests + 8 new passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/admin/content.schemas.ts apps/api/src/controllers/admin/content.schemas.test.ts
git commit -m "feat(api): add content-type registry and per-type Zod schemas"
```

---

## Task 3: Generic content routes — list and get-one

**Files:**
- Create: `apps/api/src/views/admin/content.view.ts`
- Create: `apps/api/src/controllers/admin/content.controller.ts`
- Create: `apps/api/src/routes/admin/content.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/controllers/admin/content.controller.test.ts`

**Interfaces:**
- Consumes: `CONTENT_TYPES`, `TYPE_TO_DELEGATE`, `ContentType` from `./content.schemas.js` (Task 2); `ApprovableResourceService`, `RecordNotFoundError` from `../../lib/services/approvable-resource.js` (Task 1); `requireAuth` from `../../lib/auth/middleware.js`.
- Produces: `GET /admin/api/content/:type` (list), `GET /admin/api/content/:type/:id` (get one) — the route file and its `serviceFor(type)` helper are extended by Tasks 4-8, which are not implementing this task.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/controllers/admin/content.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;
let superadminToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "content-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "content-super@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  superadminToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/content/:type", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/content/faq");
    expect(res.status).toBe(401);
  });

  it("returns 400 for an unknown content type", async () => {
    const res = await request(app).get("/admin/api/content/not-a-real-type").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(400);
  });

  it("lists records for an authenticated editor", async () => {
    await prisma.faq.create({ data: { question: "Q1", answer: "A1", approvalStatus: "published" } });
    const res = await request(app).get("/admin/api/content/faq").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("filters by status query param", async () => {
    await prisma.faq.create({ data: { question: "Pending", answer: "A", approvalStatus: "pending_approval" } });
    await prisma.faq.create({ data: { question: "Published", answer: "A", approvalStatus: "published" } });
    const res = await request(app)
      .get("/admin/api/content/faq?status=published")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].question).toBe("Published");
  });
});

describe("GET /admin/api/content/:type/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .get("/admin/api/content/faq/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(404);
  });

  it("returns the record for a known id", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A" } });
    const res = await request(app)
      .get(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: FAIL — route not found (404s where 401/400/200/404 are expected).

- [ ] **Step 3: Create the view**

```ts
// apps/api/src/views/admin/content.view.ts
/** Pure response-shaping for the generic content endpoints — no business logic. */

export function contentRecordView(record: unknown) {
  return record;
}

export function contentListView(records: unknown[]) {
  return records;
}
```

This starts as a pass-through — the spec doesn't call for hiding any field on these five types (unlike auth's one-time-secret responses) — but keeping the indirection means a future field-hiding requirement changes one file, not every route handler.

- [ ] **Step 4: Implement the controller (list + get-one only)**

```ts
// apps/api/src/controllers/admin/content.controller.ts
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ApprovableResourceService } from "../../lib/services/approvable-resource.js";
import { CONTENT_TYPES, TYPE_TO_DELEGATE, type ContentType } from "./content.schemas.js";
import { contentRecordView, contentListView } from "../../views/admin/content.view.js";
import { prisma } from "../../db/prisma.js";

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

/** One ApprovableResourceService instance per type, built lazily and cached. */
const serviceCache = new Map<ContentType, ApprovableResourceService>();
export function serviceFor(type: ContentType): ApprovableResourceService {
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
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  const records = await serviceFor(type).list({ status, search });
  res.status(200).json(contentListView(records));
}

export async function getOne(req: Request, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  // A direct, indexed Prisma read (allowed — see Global Constraints; this
  // doesn't mutate anything, so it doesn't need to go through the service).
  const delegateName = TYPE_TO_DELEGATE[type];
  const record = await (prisma as any)[delegateName].findFirst({ where: { id, deletedAt: null } });
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(200).json(contentRecordView(record));
}
```

- [ ] **Step 5: Wire the routes**

```ts
// apps/api/src/routes/admin/content.routes.ts
import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as contentController from "../../controllers/admin/content.controller.js";

export const adminContentRouter = Router();

adminContentRouter.get("/:type", requireAuth, contentController.list);
adminContentRouter.get("/:type/:id", requireAuth, contentController.getOne);
```

In `apps/api/src/app.ts`, add the import and mount (read the current file first — it already mounts `adminAuthRouter`, `adminUsersRouter`, `adminSessionsRouter`; add alongside those, don't disturb them):

```ts
import { adminContentRouter } from "./routes/admin/content.routes.js";
// ...
app.use("/admin/api/content", adminContentRouter);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: PASS, 6 tests.

- [ ] **Step 7: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: all previous + 6 new passing.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/views/admin/content.view.ts apps/api/src/controllers/admin/content.controller.ts apps/api/src/controllers/admin/content.controller.test.ts apps/api/src/routes/admin/content.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add generic content list/get-one endpoints"
```

---

## Task 4: Generic content routes — create

**Files:**
- Modify: `apps/api/src/controllers/admin/content.controller.ts`
- Modify: `apps/api/src/routes/admin/content.routes.ts`
- Modify: `apps/api/src/controllers/admin/content.controller.test.ts`

**Interfaces:**
- Consumes: `schemaFor` from `./content.schemas.js`.
- Produces: `POST /admin/api/content/:type` — an editor's submit lands `pending_approval`, a superadmin's submit lands `published` (both already `ApprovableResourceService.create`'s own behavior — the controller just calls it).

- [ ] **Step 1: Write the failing tests**

Add to `content.controller.test.ts`:

```ts
describe("POST /admin/api/content/:type", () => {
  it("returns 400 for an unknown content type", async () => {
    const res = await request(app)
      .post("/admin/api/content/not-a-real-type")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed body", async () => {
    const res = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Missing answer" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  it("creates as pending_approval for an editor", async () => {
    const res = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Q?", answer: "A." });
    expect(res.status).toBe(201);
    expect(res.body.approvalStatus).toBe("pending_approval");
  });

  it("creates as published for a superadmin", async () => {
    const res = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ question: "Q?", answer: "A." });
    expect(res.status).toBe(201);
    expect(res.body.approvalStatus).toBe("published");
  });

  it("returns 409 on a Service slug conflict", async () => {
    await request(app)
      .post("/admin/api/content/service")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ name: "A", slug: "dup", shortDescription: "s", fullDescription: "f" });

    const res = await request(app)
      .post("/admin/api/content/service")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ name: "B", slug: "dup", shortDescription: "s", fullDescription: "f" });
    expect(res.status).toBe(409);
  });
});
```

Add `await prisma.service.deleteMany();` to this file's `afterEach` alongside the existing `faq.deleteMany()`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: FAIL — 404 (route not found).

- [ ] **Step 3: Implement `create`**

Add to `content.controller.ts` (add the new imports alongside the existing ones, don't duplicate `Request`/`Response`):

```ts
import { SlugConflictError, ForbiddenActionError } from "../../lib/services/approvable-resource.js";
import { schemaFor } from "./content.schemas.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

export async function create(req: AuthedRequest, res: Response) {
  const { type } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = schemaFor(type).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await serviceFor(type).create(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      parsed.data
    );
    res.status(201).json(contentRecordView(record));
  } catch (error) {
    if (error instanceof SlugConflictError) {
      res.status(409).json({ error: "slug_conflict", message: error.message });
      return;
    }
    if (error instanceof ForbiddenActionError) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    throw error;
  }
}
```

- [ ] **Step 4: Wire the route**

In `content.routes.ts`, add: `adminContentRouter.post("/:type", requireAuth, contentController.create);`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: PASS, 11 tests (6 previous + 5 new).

- [ ] **Step 6: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/admin/content.controller.ts apps/api/src/routes/admin/content.routes.ts apps/api/src/controllers/admin/content.controller.test.ts
git commit -m "feat(api): add generic content create endpoint"
```

---

## Task 5: Generic content routes — update

**Files:**
- Modify: `apps/api/src/controllers/admin/content.controller.ts`
- Modify: `apps/api/src/routes/admin/content.routes.ts`
- Modify: `apps/api/src/controllers/admin/content.controller.test.ts`

**Interfaces:**
- Consumes: `partialSchemaFor` from `./content.schemas.js`; `RecordNotFoundError`, `InvalidStateError` from `../../lib/services/approvable-resource.js`.
- Produces: `PATCH /admin/api/content/:type/:id`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("PATCH /admin/api/content/:type/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .patch("/admin/api/content/faq/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "New" });
    expect(res.status).toBe(404);
  });

  it("updates a subset of fields", async () => {
    const created = await prisma.faq.create({ data: { question: "Old", answer: "A" } });
    const res = await request(app)
      .patch(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ question: "New" });
    expect(res.status).toBe(200);
    expect(res.body.question).toBe("New");
    expect(res.body.answer).toBe("A");
  });

  it("returns 409 when updating a soft-deleted record", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .patch(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ question: "New" });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: FAIL — 404 (route not found) on the first two, since the route doesn't exist yet.

- [ ] **Step 3: Implement `update`**

Add to `content.controller.ts`:

```ts
import { RecordNotFoundError, InvalidStateError } from "../../lib/services/approvable-resource.js";
import { partialSchemaFor } from "./content.schemas.js";

export async function update(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = partialSchemaFor(type).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await serviceFor(type).update(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      id,
      parsed.data
    );
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (error instanceof SlugConflictError) {
      res.status(409).json({ error: "slug_conflict", message: error.message });
      return;
    }
    if (error instanceof RecordNotFoundError) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (error instanceof InvalidStateError) {
      res.status(409).json({ error: "invalid_state", message: error.message });
      return;
    }
    if (error instanceof ForbiddenActionError) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    throw error;
  }
}
```

- [ ] **Step 4: Wire the route**

In `content.routes.ts`, add: `adminContentRouter.patch("/:type/:id", requireAuth, contentController.update);`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: PASS, 14 tests (11 previous + 3 new).

- [ ] **Step 6: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/admin/content.controller.ts apps/api/src/routes/admin/content.routes.ts apps/api/src/controllers/admin/content.controller.test.ts
git commit -m "feat(api): add generic content update endpoint"
```

---

## Task 6: Generic content routes — soft-delete and restore

**Files:**
- Modify: `apps/api/src/controllers/admin/content.controller.ts`
- Modify: `apps/api/src/routes/admin/content.routes.ts`
- Modify: `apps/api/src/controllers/admin/content.controller.test.ts`

**Interfaces:**
- Produces: `DELETE /admin/api/content/:type/:id`, `POST /admin/api/content/:type/:id/restore`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("DELETE /admin/api/content/:type/:id", () => {
  it("returns 403 for an editor", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A" } });
    const res = await request(app)
      .delete(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  it("soft-deletes for a superadmin", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A" } });
    const res = await request(app)
      .delete(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).not.toBeNull();
  });

  it("returns 409 deleting an already-deleted record", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .delete(`/admin/api/content/faq/${created.id}`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(409);
  });
});

describe("POST /admin/api/content/:type/:id/restore", () => {
  it("restores a soft-deleted record for a superadmin", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/restore`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: FAIL — routes not found.

- [ ] **Step 3: Implement `softDelete` and `restore`**

Add to `content.controller.ts` (this shares its error-mapping with `update` — extract it now rather than triplicating the same six-branch `catch`, since a fourth copy in Task 7 would make the duplication impossible to ignore):

```ts
function mapServiceError(error: unknown, res: Response): boolean {
  if (error instanceof SlugConflictError) {
    res.status(409).json({ error: "slug_conflict", message: error.message });
    return true;
  }
  if (error instanceof RecordNotFoundError) {
    res.status(404).json({ error: "not_found" });
    return true;
  }
  if (error instanceof InvalidStateError) {
    res.status(409).json({ error: "invalid_state", message: error.message });
    return true;
  }
  if (error instanceof ForbiddenActionError) {
    res.status(403).json({ error: "forbidden" });
    return true;
  }
  return false;
}

export async function softDelete(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  try {
    const record = await serviceFor(type).softDelete({ id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip }, id);
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

export async function restore(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  try {
    const record = await serviceFor(type).restore({ id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip }, id);
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}
```

Now go back and replace `create`'s and `update`'s inline `catch` blocks to call `mapServiceError(error, res)` too (`if (!mapServiceError(error, res)) throw error;`), removing the duplicated four-branch chains you wrote in Tasks 4 and 5 — one function, four call sites.

- [ ] **Step 4: Wire the routes**

```ts
adminContentRouter.delete("/:type/:id", requireAuth, contentController.softDelete);
adminContentRouter.post("/:type/:id/restore", requireAuth, contentController.restore);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: PASS, 18 tests (14 previous + 4 new).

- [ ] **Step 6: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/admin/content.controller.ts apps/api/src/routes/admin/content.routes.ts apps/api/src/controllers/admin/content.controller.test.ts
git commit -m "feat(api): add generic content delete/restore endpoints; extract shared error mapping"
```

---

## Task 7: Generic content routes — approve and reject

**Files:**
- Modify: `apps/api/src/controllers/admin/content.controller.ts`
- Modify: `apps/api/src/routes/admin/content.routes.ts`
- Modify: `apps/api/src/controllers/admin/content.controller.test.ts`

**Interfaces:**
- Produces: `POST /admin/api/content/:type/:id/approve`, `POST /admin/api/content/:type/:id/reject`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("POST /admin/api/content/:type/:id/approve", () => {
  it("publishes a pending record for a superadmin", async () => {
    const created = await request(app)
      .post("/admin/api/content/faq")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Q?", answer: "A." });

    const res = await request(app)
      .post(`/admin/api/content/faq/${created.body.id}/approve`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.approvalStatus).toBe("published");
  });

  it("returns 409 approving an already-published record", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "published" } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/approve`)
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(409);
  });
});

describe("POST /admin/api/content/:type/:id/reject", () => {
  it("returns 400 with no reason", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "pending_approval" } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/reject`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects a pending record with a reason", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "pending_approval" } });
    const res = await request(app)
      .post(`/admin/api/content/faq/${created.id}/reject`)
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ reason: "Needs more detail" });
    expect(res.status).toBe(200);
    expect(res.body.approvalStatus).toBe("rejected");
    expect(res.body.rejectionReason).toBe("Needs more detail");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: FAIL — routes not found.

- [ ] **Step 3: Implement `approve` and `reject`**

Add to `content.controller.ts`:

```ts
import { z } from "zod";

const rejectSchema = z.object({ reason: z.string().min(1) });

export async function approve(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  try {
    const record = await serviceFor(type).approve({ id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip }, id);
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}

export async function reject(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await serviceFor(type).reject(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      id,
      parsed.data.reason
    );
    res.status(200).json(contentRecordView(record));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}
```

- [ ] **Step 4: Wire the routes**

```ts
adminContentRouter.post("/:type/:id/approve", requireAuth, contentController.approve);
adminContentRouter.post("/:type/:id/reject", requireAuth, contentController.reject);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: PASS, 22 tests (18 previous + 4 new).

- [ ] **Step 6: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/admin/content.controller.ts apps/api/src/routes/admin/content.routes.ts apps/api/src/controllers/admin/content.controller.test.ts
git commit -m "feat(api): add generic content approve/reject endpoints"
```

---

## Task 8: Generic content routes — reorder

**Files:**
- Modify: `apps/api/src/controllers/admin/content.controller.ts`
- Modify: `apps/api/src/routes/admin/content.routes.ts`
- Modify: `apps/api/src/controllers/admin/content.controller.test.ts`

**Interfaces:**
- Consumes: `ApprovableResourceService.reorder` (Task 1).
- Produces: `PATCH /admin/api/content/:type/reorder`.

- [ ] **Step 1: Write the failing test**

```ts
describe("PATCH /admin/api/content/:type/reorder", () => {
  it("reorders records and is not shadowed by the /:id update route", async () => {
    const a = await prisma.faq.create({ data: { question: "A", answer: "A", order: 0 } });
    const b = await prisma.faq.create({ data: { question: "B", answer: "B", order: 1 } });

    const res = await request(app)
      .patch("/admin/api/content/faq/reorder")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ items: [{ id: a.id, order: 2 }, { id: b.id, order: 1 }] });

    expect(res.status).toBe(200);
    const refreshedA = await prisma.faq.findUniqueOrThrow({ where: { id: a.id } });
    expect(refreshedA.order).toBe(2);
  });

  it("returns 400 for a malformed body", async () => {
    const res = await request(app)
      .patch("/admin/api/content/faq/reorder")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ items: "not-an-array" });
    expect(res.status).toBe(400);
  });
});
```

The first test's title calls out the real risk: `PATCH /:type/:id` (Task 5) and `PATCH /:type/reorder` (this task) are the same HTTP method on overlapping path shapes — if `/:type/:id` is registered first, Express would treat `reorder` as an `:id` value and this route would never be reached. Step 3 registers `/reorder` first specifically to guard against that.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: FAIL — either 404 (route missing) or, if you already suspect the ordering hazard, possibly a 404 from the `:id` handler treating "reorder" as an id (either way, still a failure — the fix in Step 3 resolves it).

- [ ] **Step 3: Implement `reorder` and register its route BEFORE the `:id` PATCH route**

Add to `content.controller.ts`:

```ts
const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), order: z.number().int() })),
});

export async function reorder(req: AuthedRequest, res: Response) {
  const { type } = req.params;
  if (!isContentType(type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const records = await serviceFor(type).reorder(
      { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
      parsed.data.items
    );
    res.status(200).json(contentListView(records));
  } catch (error) {
    if (!mapServiceError(error, res)) throw error;
  }
}
```

In `content.routes.ts`, add the reorder route ABOVE the existing `adminContentRouter.patch("/:type/:id", ...)` line (move the existing line down if needed — order in the file must be: `/reorder` before `/:id` for the same method):

```ts
adminContentRouter.patch("/:type/reorder", requireAuth, contentController.reorder);
adminContentRouter.patch("/:type/:id", requireAuth, contentController.update);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- content.controller.test`
Expected: PASS, 24 tests (22 previous + 2 new).

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/admin/content.controller.ts apps/api/src/routes/admin/content.routes.ts apps/api/src/controllers/admin/content.controller.test.ts
git commit -m "feat(api): add generic content reorder endpoint"
```

---

## Task 9: Places HTTP routes

**Files:**
- Create: `apps/api/src/controllers/admin/places.controller.ts`
- Create: `apps/api/src/routes/admin/places.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/controllers/admin/places.controller.test.ts`

**Interfaces:**
- Consumes: `PlaceService` from `../../lib/services/place.js` (already built, Plan 1).
- Produces: `GET /admin/api/places`, `POST /admin/api/places`, `PATCH /admin/api/places/:id`, `DELETE /admin/api/places/:id`, `POST /admin/api/places/:id/restore`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/controllers/admin/places.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "places-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.place.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Places HTTP routes", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/places");
    expect(res.status).toBe(401);
  });

  it("supports the full create -> list -> update -> delete -> restore cycle for an editor (no role restriction)", async () => {
    const createRes = await request(app)
      .post("/admin/api/places")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "Downtown" });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    const listRes = await request(app).get("/admin/api/places").set("Authorization", `Bearer ${editorToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((p: { id: string }) => p.id === id)).toBe(true);

    const patchRes = await request(app)
      .patch(`/admin/api/places/${id}`)
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "Uptown" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.name).toBe("Uptown");

    const deleteRes = await request(app).delete(`/admin/api/places/${id}`).set("Authorization", `Bearer ${editorToken}`);
    expect(deleteRes.status).toBe(200);

    const restoreRes = await request(app)
      .post(`/admin/api/places/${id}/restore`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.deletedAt).toBeNull();
  });

  it("returns 400 for an empty name on create", async () => {
    const res = await request(app)
      .post("/admin/api/places")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 patching an unknown id", async () => {
    const res = await request(app)
      .patch("/admin/api/places/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- places.controller.test`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement the controller**

```ts
// apps/api/src/controllers/admin/places.controller.ts
import type { Response } from "express";
import { z } from "zod";
import { PlaceService } from "../../lib/services/place.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const places = new PlaceService(prisma);

function actorFrom(req: AuthedRequest) {
  return { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip };
}

export async function list(_req: AuthedRequest, res: Response) {
  res.status(200).json(await places.list());
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function create(req: AuthedRequest, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const record = await places.create(actorFrom(req), parsed.data);
  res.status(201).json(record);
}

const updateSchema = createSchema.partial();

export async function update(req: AuthedRequest, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const record = await places.update(actorFrom(req), req.params.id, parsed.data);
    res.status(200).json(record);
  } catch {
    // PlaceService throws a bare Error for "not found"/"soft-deleted" — it
    // predates the named-error-class pattern from Task 1 and is out of this
    // task's scope to change; a 404 is the closest honest mapping for either.
    res.status(404).json({ error: "not_found" });
  }
}

export async function remove(req: AuthedRequest, res: Response) {
  try {
    const record = await places.softDelete(actorFrom(req), req.params.id);
    res.status(200).json(record);
  } catch {
    res.status(404).json({ error: "not_found" });
  }
}

export async function restore(req: AuthedRequest, res: Response) {
  try {
    const record = await places.restore(actorFrom(req), req.params.id);
    res.status(200).json(record);
  } catch {
    res.status(404).json({ error: "not_found" });
  }
}
```

- [ ] **Step 4: Wire the routes**

```ts
// apps/api/src/routes/admin/places.routes.ts
import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as placesController from "../../controllers/admin/places.controller.js";

export const adminPlacesRouter = Router();

adminPlacesRouter.get("/", requireAuth, placesController.list);
adminPlacesRouter.post("/", requireAuth, placesController.create);
adminPlacesRouter.patch("/:id", requireAuth, placesController.update);
adminPlacesRouter.delete("/:id", requireAuth, placesController.remove);
adminPlacesRouter.post("/:id/restore", requireAuth, placesController.restore);
```

In `apps/api/src/app.ts`:

```ts
import { adminPlacesRouter } from "./routes/admin/places.routes.js";
// ...
app.use("/admin/api/places", adminPlacesRouter);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- places.controller.test`
Expected: PASS, 4 tests.

- [ ] **Step 6: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/admin/places.controller.ts apps/api/src/controllers/admin/places.controller.test.ts apps/api/src/routes/admin/places.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add Places HTTP routes"
```

---

## Task 10: PageContent HTTP routes

**Files:**
- Create: `apps/api/src/controllers/admin/pages.controller.ts`
- Create: `apps/api/src/routes/admin/pages.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/controllers/admin/pages.controller.test.ts`

**Interfaces:**
- Consumes: `PageContentService` from `../../lib/services/page-content.js` (already built, Plan 1); `requireAuth`, `requireRole` from `../../lib/auth/middleware.js`.
- Produces: `GET /admin/api/pages/:pageKey`, `PUT /admin/api/pages/:pageKey` — both superadmin-only per the spec's governance-route list.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/controllers/admin/pages.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;
let superadminToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "pages-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "pages-super@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  superadminToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.pageContent.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Pages HTTP routes", () => {
  it("returns 403 for an editor on both routes", async () => {
    const getRes = await request(app).get("/admin/api/pages/hero").set("Authorization", `Bearer ${editorToken}`);
    expect(getRes.status).toBe(403);
    const putRes = await request(app)
      .put("/admin/api/pages/hero")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ data: {} });
    expect(putRes.status).toBe(403);
  });

  it("returns null for a never-set pageKey, for a superadmin", async () => {
    const res = await request(app).get("/admin/api/pages/hero").set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("sets and retrieves page content for a superadmin", async () => {
    const putRes = await request(app)
      .put("/admin/api/pages/hero")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({ data: { headline: "Commercial cleaning you can set your clock to." } });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.headline).toBe("Commercial cleaning you can set your clock to.");

    const getRes = await request(app).get("/admin/api/pages/hero").set("Authorization", `Bearer ${superadminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.headline).toBe("Commercial cleaning you can set your clock to.");
  });

  it("returns 400 for a PUT body missing data", async () => {
    const res = await request(app)
      .put("/admin/api/pages/hero")
      .set("Authorization", `Bearer ${superadminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- pages.controller.test`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement the controller**

```ts
// apps/api/src/controllers/admin/pages.controller.ts
import type { Response } from "express";
import { z } from "zod";
import { PageContentService } from "../../lib/services/page-content.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const pages = new PageContentService(prisma);

export async function get(req: AuthedRequest, res: Response) {
  const record = await pages.get(req.params.pageKey);
  res.status(200).json(record);
}

const setSchema = z.object({ data: z.record(z.string(), z.unknown()) });

export async function set(req: AuthedRequest, res: Response) {
  const parsed = setSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const record = await pages.set(
    { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip },
    req.params.pageKey,
    parsed.data.data
  );
  res.status(200).json(record);
}
```

`req.actor!.role` is already guaranteed `"superadmin"` by the route's `requireRole("superadmin")` (Step 4) by the time this handler runs, so `PageContentService.set`'s own internal role check is defense-in-depth, not the primary gate — consistent with how `sessions.controller.ts` relies on the route middleware.

- [ ] **Step 4: Wire the routes**

```ts
// apps/api/src/routes/admin/pages.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as pagesController from "../../controllers/admin/pages.controller.js";

export const adminPagesRouter = Router();

adminPagesRouter.get("/:pageKey", requireAuth, requireRole("superadmin"), pagesController.get);
adminPagesRouter.put("/:pageKey", requireAuth, requireRole("superadmin"), pagesController.set);
```

In `apps/api/src/app.ts`:

```ts
import { adminPagesRouter } from "./routes/admin/pages.routes.js";
// ...
app.use("/admin/api/pages", adminPagesRouter);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- pages.controller.test`
Expected: PASS, 4 tests.

- [ ] **Step 6: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/admin/pages.controller.ts apps/api/src/controllers/admin/pages.controller.test.ts apps/api/src/routes/admin/pages.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add PageContent HTTP routes"
```

---

## Task 11: Image upload (Cloudinary)

**Files:**
- Modify: `apps/api/package.json` (add `multer`, `cloudinary`, `@types/multer`)
- Modify: `apps/api/.env.example` (add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- Create: `apps/api/src/lib/uploads/cloudinary.ts`
- Create: `apps/api/src/controllers/admin/uploads.controller.ts`
- Create: `apps/api/src/routes/admin/uploads.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/controllers/admin/uploads.controller.test.ts`

**Interfaces:**
- Produces: `uploadBuffer(buffer: Buffer, folder: string): Promise<{ url: string }>` (in `lib/uploads/cloudinary.ts`) and `POST /admin/api/uploads` (multipart form field `file`) — response `{ url: string }`.

**A note before you start:** this task needs real Cloudinary credentials to test end-to-end against the live API — the user has confirmed they'll provide `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` when this task is reached. If they aren't in your `apps/api/.env` yet, STOP and ask for them before writing the "uploads a real file" integration test in Step 6 — don't fabricate placeholder credentials and don't skip the real-upload test silently.

- [ ] **Step 1: Add dependencies**

Run: `npm install --workspace=apps/api multer@^2.2.0 cloudinary@^2.10.1` then `npm install --workspace=apps/api -D @types/multer@^2.2.0`

- [ ] **Step 2: Add the env var placeholders**

Append to `apps/api/.env.example`:

```
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

Add the real values to your local `apps/api/.env` (from the user).

- [ ] **Step 3: Implement the Cloudinary wrapper**

```ts
// apps/api/src/lib/uploads/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary env vars (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) are not set");
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  configured = true;
}

/** Uploads an in-memory file buffer to Cloudinary, returns its public URL. */
export function uploadBuffer(buffer: Buffer, folder: string): Promise<{ url: string }> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary upload returned no result"));
        return;
      }
      resolve({ url: result.secure_url });
    });
    stream.end(buffer);
  });
}
```

- [ ] **Step 4: Implement the controller and routes**

```ts
// apps/api/src/controllers/admin/uploads.controller.ts
import type { Response } from "express";
import { uploadBuffer } from "../../lib/uploads/cloudinary.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export async function upload(req: AuthedRequest & { file?: Express.Multer.File }, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "no_file" });
    return;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    res.status(400).json({ error: "invalid_file_type" });
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    res.status(400).json({ error: "file_too_large" });
    return;
  }
  try {
    const result = await uploadBuffer(file.buffer, "zolvex-admin");
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "upload_failed" });
  }
}
```

```ts
// apps/api/src/routes/admin/uploads.routes.ts
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as uploadsController from "../../controllers/admin/uploads.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const adminUploadsRouter = Router();

adminUploadsRouter.post("/", requireAuth, upload.single("file"), uploadsController.upload);
```

In `apps/api/src/app.ts`:

```ts
import { adminUploadsRouter } from "./routes/admin/uploads.routes.js";
// ...
app.use("/admin/api/uploads", adminUploadsRouter);
```

- [ ] **Step 5: Write and run the client-validation tests (no live Cloudinary call needed)**

```ts
// apps/api/src/controllers/admin/uploads.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "uploads-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /admin/api/uploads", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).post("/admin/api/uploads");
    expect(res.status).toBe(401);
  });

  it("returns 400 with no file attached", async () => {
    const res = await request(app).post("/admin/api/uploads").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("no_file");
  });

  it("returns 400 for a disallowed file type", async () => {
    const res = await request(app)
      .post("/admin/api/uploads")
      .set("Authorization", `Bearer ${editorToken}`)
      .attach("file", Buffer.from("not an image"), { filename: "a.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_file_type");
  });
});
```

Run: `npm run test --workspace=apps/api -- uploads.controller.test`
Expected: PASS, 3 tests — these don't touch Cloudinary at all (they fail validation before `uploadBuffer` is ever called).

- [ ] **Step 6: Write and run the real-upload integration test**

Only after confirming real Cloudinary credentials are present in `apps/api/.env` (Step 2):

```ts
// add to uploads.controller.test.ts
it("uploads a real 1x1 PNG to Cloudinary and returns its URL", async () => {
  // A minimal valid 1x1 transparent PNG, base64-decoded.
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const res = await request(app)
    .post("/admin/api/uploads")
    .set("Authorization", `Bearer ${editorToken}`)
    .attach("file", onePixelPng, { filename: "pixel.png", contentType: "image/png" });
  expect(res.status).toBe(200);
  expect(res.body.url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
}, 15000);
```

Run: `npm run test --workspace=apps/api -- uploads.controller.test`
Expected: PASS, 4 tests. If this fails with a Cloudinary auth error, the credentials in `.env` are wrong — stop and get correct ones rather than weakening the test.

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npm run test --workspace=apps/api` then `npm run typecheck --workspace=apps/api`

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/.env.example apps/api/src/lib/uploads apps/api/src/controllers/admin/uploads.controller.ts apps/api/src/controllers/admin/uploads.controller.test.ts apps/api/src/routes/admin/uploads.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add image upload endpoint via Cloudinary"
```

---

## Task 12: Approvals dashboard

**Files:**
- Create: `apps/api/src/lib/services/dashboard.ts`
- Create: `apps/api/src/controllers/admin/dashboard.controller.ts`
- Create: `apps/api/src/routes/admin/dashboard.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/lib/services/dashboard.test.ts`

**Interfaces:**
- Produces: `listPendingApprovals(prisma): Promise<{ entity: string; id: string; ...}[]>` — one row per pending-approval record across the five approvable types, consumed by the controller.
- Produces: `GET /admin/api/dashboard/approvals`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/services/dashboard.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { listPendingApprovals } from "./dashboard.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.faq.deleteMany();
  await prisma.service.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("listPendingApprovals", () => {
  it("returns pending records from multiple types, sorted newest-first, excluding published/rejected/deleted", async () => {
    await prisma.faq.create({ data: { question: "Pending FAQ", answer: "A", approvalStatus: "pending_approval" } });
    await prisma.faq.create({ data: { question: "Published FAQ", answer: "A", approvalStatus: "published" } });
    await prisma.service.create({
      data: {
        name: "Pending Service",
        slug: "pending-service",
        shortDescription: "s",
        fullDescription: "f",
        approvalStatus: "pending_approval",
      },
    });
    await prisma.faq.create({
      data: { question: "Deleted pending FAQ", answer: "A", approvalStatus: "pending_approval", deletedAt: new Date() },
    });

    const results = await listPendingApprovals(prisma);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.entity).sort()).toEqual(["Faq", "Service"]);
    expect(results.every((r) => r.approvalStatus === "pending_approval")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- dashboard.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `listPendingApprovals`**

```ts
// apps/api/src/lib/services/dashboard.ts
import type { PrismaClient } from "@prisma/client";

const APPROVABLE_DELEGATES = ["service", "blogPost", "testimonial", "faq", "instagramPost"] as const;
const ENTITY_NAMES: Record<(typeof APPROVABLE_DELEGATES)[number], string> = {
  service: "Service",
  blogPost: "BlogPost",
  testimonial: "Testimonial",
  faq: "Faq",
  instagramPost: "InstagramPost",
};

/**
 * One UNION-ALL-shaped list across all five approvable types' pending-approval
 * queue, sorted newest-submission-first. Read-only — no service call needed,
 * see the Global Constraints note on reads.
 */
export async function listPendingApprovals(prisma: PrismaClient) {
  const perType = await Promise.all(
    APPROVABLE_DELEGATES.map(async (delegateName) => {
      const records = await (prisma as any)[delegateName].findMany({
        where: { approvalStatus: "pending_approval", deletedAt: null },
      });
      return records.map((record: { id: string; createdAt: Date }) => ({
        entity: ENTITY_NAMES[delegateName],
        ...record,
      }));
    })
  );
  return perType.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- dashboard.test`
Expected: PASS, 1 test.

- [ ] **Step 5: Implement the controller and route**

```ts
// apps/api/src/controllers/admin/dashboard.controller.ts
import type { Request, Response } from "express";
import { listPendingApprovals } from "../../lib/services/dashboard.js";
import { prisma } from "../../db/prisma.js";

export async function approvals(_req: Request, res: Response) {
  res.status(200).json(await listPendingApprovals(prisma));
}
```

```ts
// apps/api/src/routes/admin/dashboard.routes.ts
import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as dashboardController from "../../controllers/admin/dashboard.controller.js";

export const adminDashboardRouter = Router();

adminDashboardRouter.get("/approvals", requireAuth, dashboardController.approvals);
```

In `apps/api/src/app.ts`:

```ts
import { adminDashboardRouter } from "./routes/admin/dashboard.routes.js";
// ...
app.use("/admin/api/dashboard", adminDashboardRouter);
```

- [ ] **Step 6: Write the controller test**

```ts
// apps/api/src/controllers/admin/dashboard.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "dashboard-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.faq.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/dashboard/approvals", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/dashboard/approvals");
    expect(res.status).toBe(401);
  });

  it("returns 200 with pending records for an authenticated admin", async () => {
    await prisma.faq.create({ data: { question: "Q", answer: "A", approvalStatus: "pending_approval" } });
    const res = await request(app)
      .get("/admin/api/dashboard/approvals")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entity).toBe("Faq");
  });
});
```

Run: `npm run test --workspace=apps/api -- dashboard.controller.test`
Expected: PASS, 2 tests.

- [ ] **Step 7: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/lib/services/dashboard.ts apps/api/src/lib/services/dashboard.test.ts apps/api/src/controllers/admin/dashboard.controller.ts apps/api/src/controllers/admin/dashboard.controller.test.ts apps/api/src/routes/admin/dashboard.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add cross-type approvals dashboard endpoint"
```

---

## Task 13: Trash (cross-type soft-deleted listing and restore)

**Files:**
- Create: `apps/api/src/lib/services/trash.ts`
- Create: `apps/api/src/controllers/admin/trash.controller.ts`
- Create: `apps/api/src/routes/admin/trash.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/lib/services/trash.test.ts`

**Interfaces:**
- Consumes: `TYPE_TO_DELEGATE`, `ContentType` from `../../controllers/admin/content.schemas.js`; `serviceFor` from `../../controllers/admin/content.controller.js`; `PlaceService`.
- Produces: `listTrash(prisma): Promise<{ entity: string; ... }[]>` (five approvable types + Place); `GET /admin/api/trash`, `POST /admin/api/trash/:type/:id/restore` (`:type` is any of the five content types OR `"place"`) — restoring dispatches to the SAME typed service each type already uses (Task 1's `ApprovableResourceService.restore` or `PlaceService.restore`), never a raw Prisma write, so the slug-conflict-on-restore case still surfaces correctly.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/services/trash.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { listTrash } from "./trash.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.faq.deleteMany();
  await prisma.place.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("listTrash", () => {
  it("lists soft-deleted rows across the five approvable types and Place, excluding live rows", async () => {
    await prisma.faq.create({ data: { question: "Deleted", answer: "A", deletedAt: new Date() } });
    await prisma.faq.create({ data: { question: "Live", answer: "A" } });
    await prisma.place.create({ data: { name: "Deleted Place", deletedAt: new Date() } });

    const results = await listTrash(prisma);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.entity).sort()).toEqual(["Faq", "Place"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- trash.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `listTrash`**

```ts
// apps/api/src/lib/services/trash.ts
import type { PrismaClient } from "@prisma/client";

const TRASHABLE_DELEGATES = ["service", "blogPost", "testimonial", "faq", "instagramPost", "place"] as const;
const ENTITY_NAMES: Record<(typeof TRASHABLE_DELEGATES)[number], string> = {
  service: "Service",
  blogPost: "BlogPost",
  testimonial: "Testimonial",
  faq: "Faq",
  instagramPost: "InstagramPost",
  place: "Place",
};

export async function listTrash(prisma: PrismaClient) {
  const perType = await Promise.all(
    TRASHABLE_DELEGATES.map(async (delegateName) => {
      const records = await (prisma as any)[delegateName].findMany({ where: { deletedAt: { not: null } } });
      return records.map((record: { id: string }) => ({ entity: ENTITY_NAMES[delegateName], ...record }));
    })
  );
  return perType.flat();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- trash.test`
Expected: PASS, 1 test.

- [ ] **Step 5: Implement the controller and route (restore dispatch)**

```ts
// apps/api/src/controllers/admin/trash.controller.ts
import type { Response } from "express";
import { listTrash } from "../../lib/services/trash.js";
import { prisma } from "../../db/prisma.js";
import { CONTENT_TYPES, type ContentType } from "./content.schemas.js";
import { serviceFor } from "./content.controller.js";
import { PlaceService } from "../../lib/services/place.js";
import { SlugConflictError, RecordNotFoundError, InvalidStateError } from "../../lib/services/approvable-resource.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const places = new PlaceService(prisma);

export async function list(_req: AuthedRequest, res: Response) {
  res.status(200).json(await listTrash(prisma));
}

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

export async function restore(req: AuthedRequest, res: Response) {
  const { type, id } = req.params;
  const actor = { id: req.actor!.id, role: req.actor!.role, ipAddress: req.ip };

  try {
    if (type === "place") {
      const record = await places.restore(actor, id);
      res.status(200).json(record);
      return;
    }
    if (!isContentType(type)) {
      res.status(400).json({ error: "invalid_type" });
      return;
    }
    const record = await serviceFor(type).restore(actor, id);
    res.status(200).json(record);
  } catch (error) {
    if (error instanceof SlugConflictError) {
      res.status(409).json({ error: "slug_conflict", message: error.message });
      return;
    }
    if (error instanceof RecordNotFoundError) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (error instanceof InvalidStateError) {
      res.status(409).json({ error: "invalid_state", message: error.message });
      return;
    }
    // PlaceService's not-found/not-deleted throws are still bare Error (Task 9's
    // same note applies) -- treat anything else reaching here as 404 rather
    // than a 500, since every real failure mode here is a bad id or bad state.
    res.status(404).json({ error: "not_found" });
  }
}
```

```ts
// apps/api/src/routes/admin/trash.routes.ts
import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as trashController from "../../controllers/admin/trash.controller.js";

export const adminTrashRouter = Router();

adminTrashRouter.get("/", requireAuth, trashController.list);
adminTrashRouter.post("/:type/:id/restore", requireAuth, trashController.restore);
```

In `apps/api/src/app.ts`:

```ts
import { adminTrashRouter } from "./routes/admin/trash.routes.js";
// ...
app.use("/admin/api/trash", adminTrashRouter);
```

- [ ] **Step 6: Write the controller test**

```ts
// apps/api/src/controllers/admin/trash.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "trash-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.place.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/trash", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/trash");
    expect(res.status).toBe(401);
  });

  it("lists a soft-deleted Faq for an authenticated admin", async () => {
    await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app).get("/admin/api/trash").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entity).toBe("Faq");
  });
});

describe("POST /admin/api/trash/:type/:id/restore", () => {
  it("restores a soft-deleted Faq", async () => {
    const created = await prisma.faq.create({ data: { question: "Q", answer: "A", deletedAt: new Date() } });
    const res = await request(app)
      .post(`/admin/api/trash/faq/${created.id}/restore`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).toBeNull();
  });

  it("restores a soft-deleted Place", async () => {
    const created = await prisma.place.create({ data: { name: "Downtown", deletedAt: new Date() } });
    const res = await request(app)
      .post(`/admin/api/trash/place/${created.id}/restore`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedAt).toBeNull();
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .post("/admin/api/trash/faq/does-not-exist/restore")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(404);
  });
});
```

Run: `npm run test --workspace=apps/api -- trash.controller.test`
Expected: PASS, 5 tests.

- [ ] **Step 7: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/lib/services/trash.ts apps/api/src/lib/services/trash.test.ts apps/api/src/controllers/admin/trash.controller.ts apps/api/src/controllers/admin/trash.controller.test.ts apps/api/src/routes/admin/trash.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add cross-type trash listing and restore-dispatch endpoints"
```

---

## Task 14: Audit Log viewer

**Files:**
- Create: `apps/api/src/lib/services/audit-log.ts`
- Create: `apps/api/src/controllers/admin/audit-log.controller.ts`
- Create: `apps/api/src/routes/admin/audit-log.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/lib/services/audit-log.test.ts`

**Interfaces:**
- Produces: `listAuditLog(prisma, filter?: { entity?: string; adminId?: string; from?: Date; to?: Date }): Promise<AuditLog[]>`; `GET /admin/api/audit-log` (superadmin-only, per spec's governance-route list) with query params `entity`, `adminId`, `from`, `to`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/services/audit-log.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../auth/crypto.js";
import { listAuditLog } from "./audit-log.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

let adminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const admin = await prisma.admin.create({
    data: { name: "A", email: "audit-log-svc@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  adminId = admin.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("listAuditLog", () => {
  it("returns rows newest-first with no filter", async () => {
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Faq", entityId: "x", diff: {} } });
    await prisma.auditLog.create({ data: { adminId, action: "update", entity: "Faq", entityId: "x", diff: {} } });

    const results = await listAuditLog(prisma);
    expect(results).toHaveLength(2);
    expect(results[0].action).toBe("update"); // most recent first
  });

  it("filters by entity", async () => {
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Faq", entityId: "x", diff: {} } });
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Service", entityId: "y", diff: {} } });

    const results = await listAuditLog(prisma, { entity: "Service" });
    expect(results).toHaveLength(1);
    expect(results[0].entity).toBe("Service");
  });

  it("filters by adminId", async () => {
    const other = await prisma.admin.create({
      data: { name: "B", email: "audit-log-other@zolvex.test", passwordHash: "x", role: "editor" },
    });
    await prisma.auditLog.create({ data: { adminId, action: "create", entity: "Faq", entityId: "x", diff: {} } });
    await prisma.auditLog.create({ data: { adminId: other.id, action: "create", entity: "Faq", entityId: "y", diff: {} } });

    const results = await listAuditLog(prisma, { adminId });
    expect(results).toHaveLength(1);
    expect(results[0].adminId).toBe(adminId);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- audit-log.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `listAuditLog`**

```ts
// apps/api/src/lib/services/audit-log.ts
import type { PrismaClient } from "@prisma/client";

export async function listAuditLog(
  prisma: PrismaClient,
  filter?: { entity?: string; adminId?: string; from?: Date; to?: Date }
) {
  const where: Record<string, unknown> = {};
  if (filter?.entity) where.entity = filter.entity;
  if (filter?.adminId) where.adminId = filter.adminId;
  if (filter?.from || filter?.to) {
    where.timestamp = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }
  return prisma.auditLog.findMany({ where, orderBy: { timestamp: "desc" } });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- audit-log.test`
Expected: PASS, 3 tests.

- [ ] **Step 5: Implement the controller and route**

```ts
// apps/api/src/controllers/admin/audit-log.controller.ts
import type { Response } from "express";
import { listAuditLog } from "../../lib/services/audit-log.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

export async function list(req: AuthedRequest, res: Response) {
  const { entity, adminId, from, to } = req.query;
  const filter = {
    entity: typeof entity === "string" ? entity : undefined,
    adminId: typeof adminId === "string" ? adminId : undefined,
    from: typeof from === "string" ? new Date(from) : undefined,
    to: typeof to === "string" ? new Date(to) : undefined,
  };
  res.status(200).json(await listAuditLog(prisma, filter));
}
```

```ts
// apps/api/src/routes/admin/audit-log.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as auditLogController from "../../controllers/admin/audit-log.controller.js";

export const adminAuditLogRouter = Router();

adminAuditLogRouter.get("/", requireAuth, requireRole("superadmin"), auditLogController.list);
```

In `apps/api/src/app.ts`:

```ts
import { adminAuditLogRouter } from "./routes/admin/audit-log.routes.js";
// ...
app.use("/admin/api/audit-log", adminAuditLogRouter);
```

- [ ] **Step 6: Write the controller test**

```ts
// apps/api/src/controllers/admin/audit-log.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;
let superadminToken: string;
let superadminId: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "audit-log-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "audit-log-super@zolvex.test", passwordHash: await hashPassword("x"), role: "superadmin" },
  });
  superadminId = superadmin.id;
  superadminToken = signAccessToken(superadmin.id, "superadmin");
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/audit-log", () => {
  it("returns 403 for an editor", async () => {
    const res = await request(app).get("/admin/api/audit-log").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  it("returns filtered results for a superadmin", async () => {
    await prisma.auditLog.create({
      data: { adminId: superadminId, action: "create", entity: "Faq", entityId: "x", diff: {} },
    });
    await prisma.auditLog.create({
      data: { adminId: superadminId, action: "create", entity: "Service", entityId: "y", diff: {} },
    });
    const res = await request(app)
      .get("/admin/api/audit-log?entity=Faq")
      .set("Authorization", `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entity).toBe("Faq");
  });
});
```

Run: `npm run test --workspace=apps/api -- audit-log.controller.test`
Expected: PASS, 2 tests.

- [ ] **Step 7: Run the full suite**

Run: `npm run test --workspace=apps/api`

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/lib/services/audit-log.ts apps/api/src/lib/services/audit-log.test.ts apps/api/src/controllers/admin/audit-log.controller.ts apps/api/src/controllers/admin/audit-log.controller.test.ts apps/api/src/routes/admin/audit-log.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add superadmin-only audit log viewer endpoint"
```

---

## Task 15: Enquiries (read-only)

**Files:**
- Create: `apps/api/src/controllers/admin/enquiries.controller.ts`
- Create: `apps/api/src/routes/admin/enquiries.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/controllers/admin/enquiries.controller.test.ts`

**Interfaces:**
- Produces: `GET /admin/api/enquiries` (optional `?status=` filter), `GET /admin/api/enquiries/:id` — both read-only, `requireAuth` only (any admin can view; the CRM push pipeline itself is Gate 1 scope, out of this plan).

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/controllers/admin/enquiries.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorToken: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "enquiries-editor@zolvex.test", passwordHash: await hashPassword("x"), role: "editor" },
  });
  editorToken = signAccessToken(editor.id, "editor");
});

afterEach(async () => {
  await prisma.enquiry.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Enquiries HTTP routes", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/admin/api/enquiries");
    expect(res.status).toBe(401);
  });

  it("lists enquiries for an authenticated editor", async () => {
    await prisma.enquiry.create({
      data: { serviceName: "Office Cleaning", name: "Jane", phone: "+1000", place: "Downtown" },
    });
    const res = await request(app).get("/admin/api/enquiries").set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("filters by status", async () => {
    await prisma.enquiry.create({
      data: { serviceName: "A", name: "Jane", phone: "+1000", place: "Downtown", status: "new" },
    });
    await prisma.enquiry.create({
      data: { serviceName: "B", name: "Jane", phone: "+1000", place: "Downtown", status: "pushed_to_crm" },
    });
    const res = await request(app)
      .get("/admin/api/enquiries?status=pushed_to_crm")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("pushed_to_crm");
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .get("/admin/api/enquiries/does-not-exist")
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(404);
  });

  it("returns a single enquiry by id", async () => {
    const created = await prisma.enquiry.create({
      data: { serviceName: "Office Cleaning", name: "Jane", phone: "+1000", place: "Downtown" },
    });
    const res = await request(app)
      .get(`/admin/api/enquiries/${created.id}`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- enquiries.controller.test`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement the controller**

```ts
// apps/api/src/controllers/admin/enquiries.controller.ts
import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";

export async function list(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const where = status ? { status: status as any } : {};
  const enquiries = await prisma.enquiry.findMany({ where, orderBy: { createdAt: "desc" } });
  res.status(200).json(enquiries);
}

export async function getOne(req: Request, res: Response) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id: req.params.id } });
  if (!enquiry) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(200).json(enquiry);
}
```

No service layer needed here — this is pure reads over a model with no approval workflow and no mutation endpoint in this plan (the CRM push pipeline that would mutate `status` is Gate 1 scope), so there's nothing for a service to guard.

- [ ] **Step 4: Wire the routes**

```ts
// apps/api/src/routes/admin/enquiries.routes.ts
import { Router } from "express";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as enquiriesController from "../../controllers/admin/enquiries.controller.js";

export const adminEnquiriesRouter = Router();

adminEnquiriesRouter.get("/", requireAuth, enquiriesController.list);
adminEnquiriesRouter.get("/:id", requireAuth, enquiriesController.getOne);
```

In `apps/api/src/app.ts`:

```ts
import { adminEnquiriesRouter } from "./routes/admin/enquiries.routes.js";
// ...
app.use("/admin/api/enquiries", adminEnquiriesRouter);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- enquiries.controller.test`
Expected: PASS, 5 tests.

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm run test --workspace=apps/api` then `npm run typecheck --workspace=apps/api`
Expected: all tests passing, no type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers/admin/enquiries.controller.ts apps/api/src/controllers/admin/enquiries.controller.test.ts apps/api/src/routes/admin/enquiries.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add read-only enquiries endpoints"
```

---

## Final verification (do this once, after all 15 tasks)

- [ ] Run `npm run typecheck --workspace=apps/api` — no errors.
- [ ] Run `npm run test --workspace=apps/api` — every test passing.
- [ ] Run `npm run build --workspace=apps/api` — compiles cleanly.
- [ ] Start the dev server (`npm run dev --workspace=apps/api`) and manually walk: login as the seeded superadmin → create a Faq as an editor (via a second admin created through `/admin/api/users`) → confirm it's `pending_approval` → approve it as superadmin → confirm it's `published` and appears in `/admin/api/dashboard/approvals` before approval, not after → soft-delete it → confirm it appears in `/admin/api/trash` → restore it via `/admin/api/trash/faq/:id/restore` → confirm an `AuditLog` row exists for every step via `/admin/api/audit-log`.
- [ ] Push the branch and open a PR against `gate-2-backend-auth-governance` (this plan's base — not `gate-2-admin-panel`, since Plan 1 hasn't merged there yet) using `gh pr create`.
