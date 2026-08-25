# Gate 2 Backend — Auth & Governance Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the auth/2FA/session/governance core of Gate 2's Express API — login, mandatory TOTP 2FA, account lockout, session revocation, admin user management, and the audit-log/Place/Instagram-post backend pieces the rest of Gate 2 depends on.

**Architecture:** Express + Prisma, following the MVC layering from the spec: `lib/services/*` (Model — Prisma + business rules), `controllers/admin/*` (parse/validate/call-service/shape-response), thin `routes/admin/*`. This is Plan 1 of 3 for Gate 2 (Backend Auth/Governance → Backend Content API → Frontend Admin UI), split because auth is the security-critical foundation everything else sits behind, and it's fully testable on its own via `vitest`+`supertest` with no frontend involved.

**Tech Stack:** Express 4, Prisma 6 + Postgres, TypeScript (ESM), vitest + supertest, `bcryptjs`, `jsonwebtoken`, `otplib`, `cookie-parser`, `express-rate-limit`, `zod`.

**Spec:** `docs/superpowers/specs/2026-08-25-gate-2-admin-panel-design.md` (read this too — this plan implements its "Auth & 2FA" section plus the schema/audit/Place/Users foundations the rest of Gate 2 needs).

## Global Constraints

- Never call `prisma.<entity>.create/update/delete()` directly from a controller for any of Service/BlogPost/Testimonial/Faq/InstagramPost/Place/PageContent/Admin(mutations) — always go through the matching `lib/services/*` so audit logging and workflow rules stay enforced (Foundation's documented contract, `approvable-resource.ts` header comment).
- Every request body reaching a service's `create`/`update` must be Zod-validated and allowlisted first — services only denylist known workflow-control fields, they do not validate (`INPUT-VALIDATION CONTRACT` in `approvable-resource.ts`).
- Passwords, TOTP secrets, and recovery codes are never logged or returned in plaintext after their one-time display (setup response for TOTP/recovery codes; user-creation response for temp passwords).
- `fileParallelism: false` in `vitest.config.ts` is load-bearing — new test files share the one test database and clean it with unscoped `deleteMany()`; do not add `.concurrent` or change this setting.
- All new secrets (`JWT_SECRET`, `ADMIN_2FA_ENCRYPTION_KEY`) go in `apps/api/.env` (gitignored) and `apps/api/.env.example` (committed, placeholder values only) — never commit a real secret value.
- Access tokens: 15-minute JWTs. Refresh tokens: opaque random values, stored as a SHA-256 hash in `AdminSession.refreshTokenHash`, 30-day expiry, httpOnly cookie (set by the controller layer, not by services). Pending-2FA tokens: 2-minute JWTs, purpose-tagged so they can never be accepted where a real access token is required.

---

## Task 1: Schema — `InstagramPost` model and `AdminSession` refresh-token columns

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_gate2_instagram_and_sessions/migration.sql` (generated, not hand-written)
- Modify: `apps/api/src/lib/services/approvable-resource.ts`
- Test: `apps/api/src/lib/services/approvable-resource.test.ts` (extend)

**Interfaces:**
- Produces: `ApprovableResourceService(prisma, "instagramPost")` — a fifth valid `DelegateName`, usable exactly like `"service"`/`"blogPost"`/`"testimonial"`/`"faq"`.
- Produces: `AdminSession.refreshTokenHash: string` (unique) and `AdminSession.expiresAt: Date` — consumed by Task 10.

- [ ] **Step 1: Add the `InstagramPost` model to `schema.prisma`**

Add this model after `Faq` (matching its exact shape so it works through the existing service unmodified):

```prisma
model InstagramPost {
  id              String         @id @default(cuid())
  image           String
  permalink       String
  order           Int            @default(0)
  isActive        Boolean        @default(true)
  approvalStatus  ApprovalStatus @default(draft)
  submittedBy     String?
  approvedBy      String?
  approvedAt      DateTime?
  rejectionReason String?
  deletedAt       DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([approvalStatus])
  @@index([deletedAt])
  @@index([approvalStatus, deletedAt])
}
```

- [ ] **Step 2: Add the two new columns to `AdminSession`**

Replace the existing `model AdminSession { ... }` block with:

```prisma
model AdminSession {
  id               String    @id @default(cuid())
  adminId          String
  admin            Admin     @relation(fields: [adminId], references: [id])
  refreshTokenHash String    @unique
  expiresAt        DateTime
  deviceInfo       String?
  ipAddress        String?
  userAgent        String?
  createdAt        DateTime  @default(now())
  lastActiveAt     DateTime  @default(now())
  revokedAt        DateTime?

  @@index([adminId])
}
```

- [ ] **Step 3: Generate and apply the migration**

Run: `npm run prisma:migrate --workspace=apps/api -- --name gate2_instagram_and_sessions`

This prompts nothing extra since `--name` is supplied. Expected: a new folder under `apps/api/prisma/migrations/` containing `migration.sql` with a `CREATE TABLE "InstagramPost"` block and `ALTER TABLE "AdminSession" ADD COLUMN "refreshTokenHash" ...` / `ADD COLUMN "expiresAt" ...` statements, applied automatically to the dev database (`DATABASE_URL`).

Then apply the same migration to the test database:

PowerShell: `$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zolvex_test?schema=public"; npm run db:migrate:test --workspace=apps/api`

- [ ] **Step 4: Regenerate the Prisma client**

Run: `npm run prisma:generate --workspace=apps/api`

Expected: no errors; `PrismaClient` now has `.instagramPost` and the new `AdminSession` fields typed.

- [ ] **Step 5: Add `instagramPost` to `ApprovableResourceService`'s `ENTITY_NAMES`**

In `apps/api/src/lib/services/approvable-resource.ts`, change:

```ts
const ENTITY_NAMES = {
  service: "Service",
  blogPost: "BlogPost",
  testimonial: "Testimonial",
  faq: "Faq",
} as const;
```

to:

```ts
const ENTITY_NAMES = {
  service: "Service",
  blogPost: "BlogPost",
  testimonial: "Testimonial",
  faq: "Faq",
  instagramPost: "InstagramPost",
} as const;
```

Also add `Prisma.InstagramPostWhereInput` to the `publicVisibilityWhere` intersection type:

```ts
export const publicVisibilityWhere = {
  approvalStatus: "published",
  deletedAt: null,
  isActive: true,
} as const satisfies Prisma.ServiceWhereInput &
  Prisma.BlogPostWhereInput &
  Prisma.TestimonialWhereInput &
  Prisma.FaqWhereInput &
  Prisma.InstagramPostWhereInput;
```

- [ ] **Step 6: Write a test proving the generic service handles `InstagramPost`**

Add to `apps/api/src/lib/services/approvable-resource.test.ts`, near the top-level `services` const:

```ts
const instagramPosts = new ApprovableResourceService(prisma, "instagramPost");
```

Add to the `afterEach` cleanup:

```ts
afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.service.deleteMany();
  await prisma.instagramPost.deleteMany();
});
```

Add a new `describe` block:

```ts
describe("ApprovableResourceService with the instagramPost delegate", () => {
  it("saves an editor's create as pending_approval and writes one audit row", async () => {
    const record = await instagramPosts.create(
      { id: editorId, role: "editor" },
      { image: "https://example.test/a.jpg", permalink: "https://instagram.com/p/abc" }
    );

    expect(record.approvalStatus).toBe("pending_approval");

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("InstagramPost");
  });

  it("saves a superadmin's create as published directly", async () => {
    const record = await instagramPosts.create(
      { id: superadminId, role: "superadmin" },
      { image: "https://example.test/b.jpg", permalink: "https://instagram.com/p/def" }
    );

    expect(record.approvalStatus).toBe("published");
  });
});
```

- [ ] **Step 7: Run the test suite**

Run: `npm run test --workspace=apps/api`
Expected: all tests pass, including the 2 new `instagramPost` tests (previous 28 + 2 = 30).

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/src/lib/services/approvable-resource.ts apps/api/src/lib/services/approvable-resource.test.ts
git commit -m "feat(api): add InstagramPost model and AdminSession refresh-token columns"
```

---

## Task 2: Extract the shared audit-log writer into `lib/services/audit.ts`

**Files:**
- Create: `apps/api/src/lib/services/audit.ts`
- Modify: `apps/api/src/lib/services/approvable-resource.ts`
- Test: `apps/api/src/lib/services/audit.test.ts`

**Interfaces:**
- Produces: `writeAuditRow(tx, params: { entity: string; entityId: string; action: AuditAction; actorId: string; ipAddress?: string; diff: AuditDiff }): Promise<void>` — a standalone function any service can call inside its own `$transaction`.
- Produces: `buildAuditDiff` and `AuditDiff` (moved here from `approvable-resource.ts`, re-exported from there for backward compatibility).
- Consumed by: Task 3 (`PlaceService`), Task 4 (`PageContentService`), Task 14 (`AdminUserService`).

- [ ] **Step 1: Create `lib/services/audit.ts`**

```ts
/**
 * Shared audit-log writer, extracted from ApprovableResourceService so
 * non-approvable-workflow services (Place, PageContent, Admin user
 * management) can still write a real AuditLog row inside their own
 * transaction. See approvable-resource.ts's header comment for why this is
 * an explicit in-transaction write rather than a Prisma middleware.
 */
import type { AuditAction } from "@prisma/client";

export type AuditDiff = Record<string, { old: unknown; new: unknown }>;

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Build a per-field `{field: {old, new}}` diff of exactly what changed.
 * `before` is null for creates, in which case every field of the new record
 * is reported with `old: null`.
 */
export function buildAuditDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
): AuditDiff {
  const diff: AuditDiff = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
  for (const key of keys) {
    const old = before ? (before[key] ?? null) : null;
    const next = after[key] ?? null;
    if (before && sameValue(old, next)) continue;
    diff[key] = { old, new: next };
  }
  return diff;
}

/**
 * The single place an AuditLog row is written. MUST be called with the `tx`
 * from the caller's own `$transaction` — the audit row has to commit or
 * roll back atomically with the content write, never separately.
 */
export async function writeAuditRow(
  tx: any,
  params: {
    entity: string;
    entityId: string;
    action: AuditAction;
    actorId: string;
    ipAddress?: string;
    diff: AuditDiff;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      adminId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      diff: params.diff,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
```

- [ ] **Step 2: Update `approvable-resource.ts` to use the shared function**

Remove the local `sameValue`, `buildAuditDiff`, `AuditDiff`, and the private `writeAudit` method from `approvable-resource.ts`. Add the import:

```ts
import { writeAuditRow, buildAuditDiff, type AuditDiff } from "./audit.js";
```

Re-export them for any existing importer (the test file imports `buildAuditDiff`... actually it imports `AuditDiff` as a type and does not call `buildAuditDiff` directly — check with a repo search before removing anything importers rely on):

```ts
export { buildAuditDiff, type AuditDiff } from "./audit.js";
```

Replace every call site of `this.writeAudit(tx, {...})` (six of them: `create`, `update`, `softDelete`, `restore`, `approve`, `reject`) with:

```ts
await writeAuditRow(tx, {
  entity: this.entityName,
  entityId: record.id, // or `id` where `record` isn't in scope yet
  action: "create", // matches each call site's existing action
  actorId: actor.id,
  ipAddress: actor.ipAddress,
  diff: buildAuditDiff(/* same args as before */),
});
```

Keep each call site's specific `action`/`entityId`/diff arguments exactly as they were — only the function being called changes (`this.writeAudit` → `writeAuditRow` with an added `entity` field).

- [ ] **Step 3: Run the full existing test suite — this is the regression gate**

Run: `npm run test --workspace=apps/api`
Expected: all 30 tests (28 original + 2 from Task 1) still pass, unchanged behavior.

- [ ] **Step 4: Write a focused unit test for the extracted function**

```ts
// apps/api/src/lib/services/audit.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

let adminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const admin = await prisma.admin.create({
    data: { name: "Auditor", email: "auditor@zolvex.test", passwordHash: "x", role: "superadmin" },
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

describe("buildAuditDiff", () => {
  it("reports every field as changed when before is null (create)", () => {
    const diff = buildAuditDiff(null, { name: "X", order: 1 });
    expect(diff).toEqual({ name: { old: null, new: "X" }, order: { old: null, new: 1 } });
  });

  it("only reports fields that actually changed", () => {
    const diff = buildAuditDiff({ name: "X", order: 1 }, { name: "X", order: 2 });
    expect(diff).toEqual({ order: { old: 1, new: 2 } });
  });
});

describe("writeAuditRow", () => {
  it("writes a row usable outside any specific entity's service", async () => {
    await prisma.$transaction(async (tx) => {
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: "fake-place-id",
        action: "create",
        actorId: adminId,
        diff: buildAuditDiff(null, { name: "Downtown" }),
      });
    });

    const rows = await prisma.auditLog.findMany({ where: { entity: "Place" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].entityId).toBe("fake-place-id");
  });
});
```

- [ ] **Step 5: Run the new test file**

Run: `npm run test --workspace=apps/api`
Expected: 30 previous tests + 3 new `audit.test.ts` tests all pass (33 total).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/services/audit.ts apps/api/src/lib/services/audit.test.ts apps/api/src/lib/services/approvable-resource.ts
git commit -m "refactor(api): extract writeAuditRow into a shared audit module"
```

---

## Task 3: `PlaceService` — simple CRUD with audit, no approval workflow

**Files:**
- Create: `apps/api/src/lib/services/place.ts`
- Test: `apps/api/src/lib/services/place.test.ts`

**Interfaces:**
- Consumes: `writeAuditRow`, `buildAuditDiff` from `./audit.js`.
- Produces: `PlaceService` class with `create(actor, data)`, `update(actor, id, data)`, `softDelete(actor, id)`, `restore(actor, id)`, `list()` — consumed by the Places controller in Plan 2.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/services/place.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PlaceService } from "./place.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const places = new PlaceService(prisma);

let editorId: string;

beforeAll(async () => {
  await prisma.$connect();
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "editor2@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.place.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("PlaceService", () => {
  it("creates a place immediately (no approval queue) and writes an audit row", async () => {
    const record = await places.create({ id: editorId, role: "editor" }, { name: "Downtown" });

    expect(record.name).toBe("Downtown");
    expect(record.isActive).toBe(true);

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("Place");
    expect(logs[0].action).toBe("create");
  });

  it("soft-deletes and restores", async () => {
    const record = await places.create({ id: editorId, role: "editor" }, { name: "Uptown" });

    const deleted = await places.softDelete({ id: editorId, role: "editor" }, record.id);
    expect(deleted.deletedAt).not.toBeNull();

    const restored = await places.restore({ id: editorId, role: "editor" }, record.id);
    expect(restored.deletedAt).toBeNull();
  });

  it("rejects operating on an already-deleted place", async () => {
    const record = await places.create({ id: editorId, role: "editor" }, { name: "Eastside" });
    await places.softDelete({ id: editorId, role: "editor" }, record.id);

    await expect(places.softDelete({ id: editorId, role: "editor" }, record.id)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- place.test`
Expected: FAIL — `Cannot find module './place.js'`.

- [ ] **Step 3: Implement `PlaceService`**

```ts
// apps/api/src/lib/services/place.ts
import type { PrismaClient } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";
import type { Actor } from "./approvable-resource.js";

/**
 * Place has no approvalStatus/submittedBy/approvedBy/rejectionReason
 * columns (see the DelegateName test in approvable-resource.test.ts) and
 * is not part of the approval workflow — any admin, editor or superadmin,
 * can add/edit/remove a service area immediately. Still audited, via the
 * same writeAuditRow every other service uses.
 */
export class PlaceService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.place.findMany({ where: { deletedAt: null }, orderBy: { order: "asc" } });
  }

  async create(actor: Actor, data: { name: string; order?: number; isActive?: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.place.create({ data });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: record.id,
        action: "create",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(null, record),
      });
      return record;
    });
  }

  async update(actor: Actor, id: string, data: { name?: string; order?: number; isActive?: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.place.findUnique({ where: { id } });
      if (!before) throw new Error(`Place ${id} not found`);
      if (before.deletedAt) throw new Error(`Place ${id} is soft-deleted (restore it first)`);

      const record = await tx.place.update({ where: { id }, data });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  async softDelete(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.place.findUnique({ where: { id } });
      if (!before) throw new Error(`Place ${id} not found`);
      if (before.deletedAt) throw new Error(`Place ${id} already deleted`);

      const record = await tx.place.update({ where: { id }, data: { deletedAt: new Date() } });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: id,
        action: "delete",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }

  async restore(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.place.findUnique({ where: { id } });
      if (!before) throw new Error(`Place ${id} not found`);
      if (!before.deletedAt) throw new Error(`Place ${id} is not deleted`);

      const record = await tx.place.update({ where: { id }, data: { deletedAt: null } });
      await writeAuditRow(tx, {
        entity: "Place",
        entityId: id,
        action: "restore",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- place.test`
Expected: PASS, 3 tests.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm run test --workspace=apps/api`
Expected: 36 tests passing (33 previous + 3 new).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/services/place.ts apps/api/src/lib/services/place.test.ts
git commit -m "feat(api): add PlaceService (simple CRUD, no approval workflow, audited)"
```

---

## Task 4: `PageContentService` — superadmin-only jsonb content, no approval queue

**Files:**
- Create: `apps/api/src/lib/services/page-content.ts`
- Test: `apps/api/src/lib/services/page-content.test.ts`

**Interfaces:**
- Produces: `PageContentService` with `get(pageKey)`, `set(actor, pageKey, data)` — `set` throws if `actor.role !== "superadmin"`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/services/page-content.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PageContentService } from "./page-content.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const pages = new PageContentService(prisma);

let editorId: string;
let superadminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "editor3@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "super3@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  superadminId = superadmin.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.pageContent.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("PageContentService", () => {
  it("returns null for a pageKey that has never been set", async () => {
    const result = await pages.get("hero");
    expect(result).toBeNull();
  });

  it("lets a superadmin set page content and writes an audit row", async () => {
    const record = await pages.set(
      { id: superadminId, role: "superadmin" },
      "hero",
      { headline: "Commercial cleaning you can set your clock to." }
    );

    expect(record.pageKey).toBe("hero");
    expect(record.data).toEqual({ headline: "Commercial cleaning you can set your clock to." });

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("PageContent");
  });

  it("upserts on a second call for the same pageKey", async () => {
    await pages.set({ id: superadminId, role: "superadmin" }, "hero", { headline: "v1" });
    const updated = await pages.set({ id: superadminId, role: "superadmin" }, "hero", { headline: "v2" });

    expect(updated.data).toEqual({ headline: "v2" });
    const all = await prisma.pageContent.findMany({ where: { pageKey: "hero" } });
    expect(all).toHaveLength(1);
  });

  it("rejects an editor trying to set page content", async () => {
    await expect(
      pages.set({ id: editorId, role: "editor" }, "footer", { whatsapp: "+1..." })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- page-content.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PageContentService`**

```ts
// apps/api/src/lib/services/page-content.ts
import type { PrismaClient, Prisma } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";
import type { Actor } from "./approvable-resource.js";

export class PageContentService {
  constructor(private prisma: PrismaClient) {}

  async get(pageKey: string) {
    return this.prisma.pageContent.findUnique({ where: { pageKey } });
  }

  async set(actor: Actor, pageKey: string, data: Prisma.InputJsonValue) {
    if (actor.role !== "superadmin") {
      throw new Error("Only superadmin can edit page content");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.pageContent.findUnique({ where: { pageKey } });
      const record = await tx.pageContent.upsert({
        where: { pageKey },
        create: { pageKey, data, updatedBy: actor.id },
        update: { data, updatedBy: actor.id },
      });

      await writeAuditRow(tx, {
        entity: "PageContent",
        entityId: record.id,
        action: before ? "update" : "create",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(before, record),
      });
      return record;
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- page-content.test`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 40 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/services/page-content.ts apps/api/src/lib/services/page-content.test.ts
git commit -m "feat(api): add PageContentService (superadmin-only, upsert by pageKey)"
```

---

## Task 5: 2FA/password crypto utilities

**Files:**
- Modify: `apps/api/package.json` (add `bcryptjs`, `@types/bcryptjs`)
- Modify: `apps/api/.env.example` (add `ADMIN_2FA_ENCRYPTION_KEY`)
- Create: `apps/api/src/lib/auth/crypto.ts`
- Test: `apps/api/src/lib/auth/crypto.test.ts`

**Interfaces:**
- Produces: `encryptSecret`, `decryptSecret`, `hashPassword`, `verifyPassword`, `hashRecoveryCode`, `verifyRecoveryCode`, `generateRecoveryCodes`, `generateRawToken`, `hashToken`, `generateTempPassword` — consumed by Tasks 7-10 and 14.

- [ ] **Step 1: Add dependencies**

Run: `npm install --workspace=apps/api bcryptjs` then `npm install --workspace=apps/api -D @types/bcryptjs`

- [ ] **Step 2: Add the env var placeholder**

Append to `apps/api/.env.example`:

```
ADMIN_2FA_ENCRYPTION_KEY="replace-with-64-hex-chars-32-bytes"
```

Add the same key to your local `apps/api/.env` with a real generated value — run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output.

- [ ] **Step 3: Write the failing test**

```ts
// apps/api/src/lib/auth/crypto.test.ts
import { describe, it, expect } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  hashPassword,
  verifyPassword,
  hashRecoveryCode,
  verifyRecoveryCode,
  generateRecoveryCodes,
  generateRawToken,
  hashToken,
  generateTempPassword,
} from "./crypto.js";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext secret", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-secret");
    const b = encryptSecret("same-secret");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt a tampered payload", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    const tampered = encrypted.slice(0, -2) + "00";
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });
});

describe("hashRecoveryCode / verifyRecoveryCode", () => {
  it("verifies a correct code and rejects a wrong one", async () => {
    const hash = await hashRecoveryCode("ab12cd34ef");
    expect(await verifyRecoveryCode("ab12cd34ef", hash)).toBe(true);
    expect(await verifyRecoveryCode("wrong-code", hash)).toBe(false);
  });
});

describe("generateRecoveryCodes", () => {
  it("generates 8 unique codes by default", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });
});

describe("generateRawToken / hashToken", () => {
  it("hashes deterministically so a stored hash can be matched later", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("generates a different raw token each call", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });
});

describe("generateTempPassword", () => {
  it("generates a non-empty, reasonably long password", () => {
    const pw = generateTempPassword();
    expect(pw.length).toBeGreaterThanOrEqual(10);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- crypto.test`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `crypto.ts`**

```ts
// apps/api/src/lib/auth/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";

const ALGO = "aes-256-gcm";
const BCRYPT_ROUNDS = 12;

function getEncryptionKey(): Buffer {
  const key = process.env.ADMIN_2FA_ENCRYPTION_KEY;
  if (!key) throw new Error("ADMIN_2FA_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error("ADMIN_2FA_ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  return buf;
}

/** Encrypts a TOTP secret for storage. Format: "iv:authTag:ciphertext", all hex. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted secret payload");
  const decipher = createDecipheriv(ALGO, getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}

export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/** 8 codes of 10 hex characters each, e.g. "a1b2c3d4e5". Shown once, never stored plaintext. */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => randomBytes(5).toString("hex"));
}

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** A URL-safe, human-typeable temporary password for a newly-created admin. */
export function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- crypto.test`
Expected: PASS, 9 tests.

- [ ] **Step 7: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 49 tests passing.

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/.env.example apps/api/src/lib/auth/crypto.ts apps/api/src/lib/auth/crypto.test.ts
git commit -m "feat(api): add 2FA/password crypto utilities (AES-256-GCM, bcrypt)"
```

---

## Task 6: JWT access-token and pending-2FA-token utilities

**Files:**
- Modify: `apps/api/package.json` (add `jsonwebtoken`, `@types/jsonwebtoken`)
- Modify: `apps/api/.env.example` (add `JWT_SECRET`)
- Create: `apps/api/src/lib/auth/jwt.ts`
- Test: `apps/api/src/lib/auth/jwt.test.ts`

**Interfaces:**
- Produces: `signAccessToken(adminId, role)`, `verifyAccessToken(token)`, `signPendingTwoFAToken(adminId)`, `verifyPendingTwoFAToken(token)` — consumed by Tasks 7-11.

- [ ] **Step 1: Add dependencies**

Run: `npm install --workspace=apps/api jsonwebtoken` then `npm install --workspace=apps/api -D @types/jsonwebtoken`

- [ ] **Step 2: Add the env var placeholder**

Append to `apps/api/.env.example`:

```
JWT_SECRET="replace-with-a-long-random-string"
```

Add a real generated value to your local `.env` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

- [ ] **Step 3: Write the failing test**

```ts
// apps/api/src/lib/auth/jwt.test.ts
import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signPendingTwoFAToken,
  verifyPendingTwoFAToken,
} from "./jwt.js";

describe("access tokens", () => {
  it("round-trips adminId and role", () => {
    const token = signAccessToken("admin-1", "editor");
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("admin-1");
    expect(payload.role).toBe("editor");
  });

  it("rejects a pending-2FA token presented as an access token", () => {
    const token = signPendingTwoFAToken("admin-1");
    expect(() => verifyAccessToken(token)).toThrow();
  });
});

describe("pending-2FA tokens", () => {
  it("round-trips adminId", () => {
    const token = signPendingTwoFAToken("admin-2");
    const payload = verifyPendingTwoFAToken(token);
    expect(payload.sub).toBe("admin-2");
  });

  it("rejects an access token presented as a pending-2FA token", () => {
    const token = signAccessToken("admin-2", "superadmin");
    expect(() => verifyPendingTwoFAToken(token)).toThrow();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- jwt.test`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `jwt.ts`**

```ts
// apps/api/src/lib/auth/jwt.ts
import jwt from "jsonwebtoken";

export type AdminRole = "superadmin" | "editor";
export type AccessTokenPayload = { sub: string; role: AdminRole; purpose: "access" };
export type PendingTwoFATokenPayload = { sub: string; purpose: "pending-2fa" };

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signAccessToken(adminId: string, role: AdminRole): string {
  const payload: AccessTokenPayload = { sub: adminId, role, purpose: "access" };
  return jwt.sign(payload, getSecret(), { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as AccessTokenPayload;
  if (decoded.purpose !== "access") throw new Error("Not an access token");
  return decoded;
}

export function signPendingTwoFAToken(adminId: string): string {
  const payload: PendingTwoFATokenPayload = { sub: adminId, purpose: "pending-2fa" };
  return jwt.sign(payload, getSecret(), { expiresIn: "2m" });
}

export function verifyPendingTwoFAToken(token: string): PendingTwoFATokenPayload {
  const decoded = jwt.verify(token, getSecret()) as PendingTwoFATokenPayload;
  if (decoded.purpose !== "pending-2fa") throw new Error("Not a pending-2FA token");
  return decoded;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- jwt.test`
Expected: PASS, 4 tests.

- [ ] **Step 7: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 53 tests passing.

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/.env.example apps/api/src/lib/auth/jwt.ts apps/api/src/lib/auth/jwt.test.ts
git commit -m "feat(api): add JWT access-token and pending-2FA-token utilities"
```

---

## Task 7: `AuthService.login()` — password verification and lockout

**Files:**
- Create: `apps/api/src/lib/auth/auth.ts`
- Test: `apps/api/src/lib/auth/auth.test.ts`

**Interfaces:**
- Consumes: `verifyPassword` from `./crypto.js`; `signPendingTwoFAToken` from `./jwt.js`.
- Produces: `login(email, password): Promise<{ pendingToken: string; twoFAEnabled: boolean }>`, `InvalidCredentialsError`, `AccountLockedError` — consumed by Task 12's login controller, and by Tasks 8-10 which extend this same file.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/auth/auth.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./crypto.js";
import { verifyPendingTwoFAToken } from "./jwt.js";
import * as authService from "./auth.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

let adminId: string;

beforeEach(async () => {
  const admin = await prisma.admin.create({
    data: {
      name: "Login Test",
      email: "login-test@zolvex.test",
      passwordHash: await hashPassword("correct-password"),
      role: "editor",
    },
  });
  adminId = admin.id;
});

afterEach(async () => {
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("login", () => {
  it("issues a pending-2FA token on correct credentials", async () => {
    const result = await authService.login("login-test@zolvex.test", "correct-password");
    expect(result.twoFAEnabled).toBe(false);
    expect(verifyPendingTwoFAToken(result.pendingToken).sub).toBe(adminId);
  });

  it("throws InvalidCredentialsError on a wrong password", async () => {
    await expect(authService.login("login-test@zolvex.test", "wrong-password")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("throws InvalidCredentialsError for a nonexistent email", async () => {
    await expect(authService.login("nobody@zolvex.test", "anything")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("locks the account after 5 failed attempts", async () => {
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login("login-test@zolvex.test", "wrong-password")
      ).rejects.toBeInstanceOf(authService.InvalidCredentialsError);
    }
    // 5th failure locks
    await expect(
      authService.login("login-test@zolvex.test", "wrong-password")
    ).rejects.toBeInstanceOf(authService.AccountLockedError);

    // even the correct password is rejected while locked
    await expect(
      authService.login("login-test@zolvex.test", "correct-password")
    ).rejects.toBeInstanceOf(authService.AccountLockedError);
  });

  it("resets failedLoginAttempts on a successful login", async () => {
    await expect(
      authService.login("login-test@zolvex.test", "wrong-password")
    ).rejects.toBeInstanceOf(authService.InvalidCredentialsError);

    await authService.login("login-test@zolvex.test", "correct-password");

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.failedLoginAttempts).toBe(0);
  });

  it("throws InvalidCredentialsError for a deactivated account", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: { isActive: false } });
    await expect(
      authService.login("login-test@zolvex.test", "correct-password")
    ).rejects.toBeInstanceOf(authService.InvalidCredentialsError);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the `login` function in `auth.ts`**

```ts
// apps/api/src/lib/auth/auth.ts
import { prisma } from "../../db/prisma.js";
import { verifyPassword } from "./crypto.js";
import { signPendingTwoFAToken } from "./jwt.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export class InvalidCredentialsError extends Error {}
export class AccountLockedError extends Error {
  constructor(public lockedUntil: Date) {
    super("Account is locked");
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ pendingToken: string; twoFAEnabled: boolean }> {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) throw new InvalidCredentialsError();

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new AccountLockedError(admin.lockedUntil);
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    const attempts = admin.failedLoginAttempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
    if (lockedUntil) throw new AccountLockedError(lockedUntil);
    throw new InvalidCredentialsError();
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { failedLoginAttempts: 0 } });

  return { pendingToken: signPendingTwoFAToken(admin.id), twoFAEnabled: admin.twoFAEnabled };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 60 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/auth/auth.ts apps/api/src/lib/auth/auth.test.ts
git commit -m "feat(api): add AuthService.login with lockout after 5 failed attempts"
```

---

## Task 8: 2FA setup and setup-verification

**Files:**
- Modify: `apps/api/package.json` (add `otplib`)
- Modify: `apps/api/src/lib/auth/auth.ts`
- Modify: `apps/api/src/lib/auth/auth.test.ts`

**Interfaces:**
- Consumes: `encryptSecret`, `decryptSecret`, `generateRecoveryCodes`, `hashRecoveryCode` from `./crypto.js`.
- Produces: `setupTwoFA(adminId): Promise<{ otpauthUrl: string; recoveryCodes: string[] }>`, `verifyTwoFASetup(adminId, code): Promise<void>` — consumed by Task 12's `/2fa/setup` and its verify endpoint.

- [ ] **Step 1: Add the dependency**

Run: `npm install --workspace=apps/api otplib`

- [ ] **Step 2: Write the failing tests**

Add to `apps/api/src/lib/auth/auth.test.ts`:

```ts
import { authenticator } from "otplib";
// ...(keep existing imports)

describe("2FA setup", () => {
  it("generates a secret, an otpauth URL, and 8 recovery codes", async () => {
    const result = await authService.setupTwoFA(adminId);
    expect(result.otpauthUrl).toContain("otpauth://totp/");
    expect(result.recoveryCodes).toHaveLength(8);

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.twoFASecret).not.toBeNull();
    expect(admin.twoFAEnabled).toBe(false); // not enabled until verified
    expect(admin.twoFARecoveryCodes).toHaveLength(8);
    expect(admin.twoFARecoveryCodes[0]).not.toBe(result.recoveryCodes[0]); // stored hashed
  });

  it("throws if 2FA is already enabled", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: { twoFAEnabled: true } });
    await expect(authService.setupTwoFA(adminId)).rejects.toThrow();
  });
});

describe("2FA setup verification", () => {
  it("enables 2FA when the submitted code matches the generated secret", async () => {
    const { otpauthUrl } = await authService.setupTwoFA(adminId);
    const secretMatch = /secret=([A-Z0-9]+)/.exec(otpauthUrl);
    const secret = secretMatch![1];
    const code = authenticator.generate(secret);

    await authService.verifyTwoFASetup(adminId, code);

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.twoFAEnabled).toBe(true);
  });

  it("throws InvalidCredentialsError on a wrong code", async () => {
    await authService.setupTwoFA(adminId);
    await expect(authService.verifyTwoFASetup(adminId, "000000")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: FAIL — `setupTwoFA is not a function`.

- [ ] **Step 4: Implement `setupTwoFA` and `verifyTwoFASetup`**

Add to `apps/api/src/lib/auth/auth.ts`:

```ts
import { authenticator } from "otplib";
import { verifyPassword, encryptSecret, decryptSecret, generateRecoveryCodes, hashRecoveryCode } from "./crypto.js";
// (keep existing imports, add the above alongside them)

export async function setupTwoFA(
  adminId: string
): Promise<{ otpauthUrl: string; recoveryCodes: string[] }> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new InvalidCredentialsError();
  if (admin.twoFAEnabled) throw new Error("2FA is already enabled for this account");

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(admin.email, "Zolvex Admin", secret);
  const recoveryCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(recoveryCodes.map(hashRecoveryCode));

  await prisma.admin.update({
    where: { id: adminId },
    data: { twoFASecret: encryptSecret(secret), twoFARecoveryCodes: hashedCodes },
  });

  // recoveryCodes returned in plaintext exactly once here; never stored or logged plaintext again.
  return { otpauthUrl, recoveryCodes };
}

export async function verifyTwoFASetup(adminId: string, code: string): Promise<void> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin?.twoFASecret) throw new InvalidCredentialsError();

  const secret = decryptSecret(admin.twoFASecret);
  const valid = authenticator.verify({ token: code, secret });
  if (!valid) throw new InvalidCredentialsError();

  await prisma.admin.update({ where: { id: adminId }, data: { twoFAEnabled: true } });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: PASS, 11 tests (7 previous + 4 new).

- [ ] **Step 6: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 64 tests passing.

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/src/lib/auth/auth.ts apps/api/src/lib/auth/auth.test.ts
git commit -m "feat(api): add TOTP 2FA setup and setup-verification"
```

---

## Task 9: 2FA login-verification and recovery-code login (session creation)

**Files:**
- Modify: `apps/api/src/lib/auth/auth.ts`
- Modify: `apps/api/src/lib/auth/auth.test.ts`

**Interfaces:**
- Consumes: `signAccessToken` from `./jwt.js`; `generateRawToken`, `hashToken`, `verifyRecoveryCode` from `./crypto.js`.
- Produces: `verifyTwoFALogin(adminId, code)`, `loginWithRecoveryCode(adminId, code)` — both returning `{ accessToken: string; refreshToken: string; sessionId: string }`. A shared internal `createSession` helper is also produced, consumed directly by Task 10.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/lib/auth/auth.test.ts`:

```ts
describe("2FA login verification", () => {
  async function enableTwoFA() {
    const { otpauthUrl } = await authService.setupTwoFA(adminId);
    const secret = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
    await authService.verifyTwoFASetup(adminId, authenticator.generate(secret));
    return secret;
  }

  it("issues a real session on a correct code", async () => {
    const secret = await enableTwoFA();
    const result = await authService.verifyTwoFALogin(adminId, authenticator.generate(secret));

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();

    const session = await prisma.adminSession.findUniqueOrThrow({ where: { id: result.sessionId } });
    expect(session.adminId).toBe(adminId);
    expect(session.revokedAt).toBeNull();
  });

  it("rejects a wrong code", async () => {
    await enableTwoFA();
    await expect(authService.verifyTwoFALogin(adminId, "000000")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("rejects login-verification when 2FA was never enabled", async () => {
    await expect(authService.verifyTwoFALogin(adminId, "000000")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});

describe("recovery-code login", () => {
  it("issues a session and consumes exactly the used code", async () => {
    const { recoveryCodes } = await authService.setupTwoFA(adminId);
    const usedCode = recoveryCodes[0];

    const result = await authService.loginWithRecoveryCode(adminId, usedCode);
    expect(result.accessToken).toBeTruthy();

    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.twoFARecoveryCodes).toHaveLength(7);

    // the same code cannot be used twice
    await expect(authService.loginWithRecoveryCode(adminId, usedCode)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("rejects an unknown code", async () => {
    await authService.setupTwoFA(adminId);
    await expect(authService.loginWithRecoveryCode(adminId, "not-a-real-code")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: FAIL — `verifyTwoFALogin is not a function`.

- [ ] **Step 3: Implement `createSession`, `verifyTwoFALogin`, and `loginWithRecoveryCode`**

Add to `apps/api/src/lib/auth/auth.ts`:

```ts
import { signAccessToken } from "./jwt.js";
import { generateRawToken, hashToken, verifyRecoveryCode } from "./crypto.js";
// (add alongside existing imports)

const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function createSession(
  adminId: string,
  role: "superadmin" | "editor",
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const refreshToken = generateRawToken();
  const session = await prisma.adminSession.create({
    data: {
      adminId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });

  return { accessToken: signAccessToken(adminId, role), refreshToken, sessionId: session.id };
}

export async function verifyTwoFALogin(
  adminId: string,
  code: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin?.twoFASecret || !admin.twoFAEnabled) throw new InvalidCredentialsError();

  const secret = decryptSecret(admin.twoFASecret);
  const valid = authenticator.verify({ token: code, secret });
  if (!valid) throw new InvalidCredentialsError();

  return createSession(admin.id, admin.role, meta);
}

export async function loginWithRecoveryCode(
  adminId: string,
  code: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new InvalidCredentialsError();

  let matchedIndex = -1;
  for (let i = 0; i < admin.twoFARecoveryCodes.length; i++) {
    if (await verifyRecoveryCode(code, admin.twoFARecoveryCodes[i])) {
      matchedIndex = i;
      break;
    }
  }
  if (matchedIndex === -1) throw new InvalidCredentialsError();

  const remaining = admin.twoFARecoveryCodes.filter((_, i) => i !== matchedIndex);
  await prisma.admin.update({ where: { id: admin.id }, data: { twoFARecoveryCodes: remaining } });

  return createSession(admin.id, admin.role, meta);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: PASS, 16 tests (11 previous + 5 new).

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 69 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/auth/auth.ts apps/api/src/lib/auth/auth.test.ts
git commit -m "feat(api): add 2FA login-verification and recovery-code login (session creation)"
```

---

## Task 10: Refresh, logout, and session revocation

**Files:**
- Modify: `apps/api/src/lib/auth/auth.ts`
- Modify: `apps/api/src/lib/auth/auth.test.ts`

**Interfaces:**
- Produces: `refreshSession(rawRefreshToken): Promise<{ accessToken: string }>`, `logout(rawRefreshToken): Promise<void>`, `revokeSession(sessionId): Promise<void>`, `listSessions(): Promise<AdminSession[]>` — consumed by Task 12 (refresh/logout controllers) and Task 13 (sessions controller).

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/lib/auth/auth.test.ts`:

```ts
describe("refreshSession", () => {
  async function loggedInSession() {
    const secret = await (async () => {
      const { otpauthUrl } = await authService.setupTwoFA(adminId);
      const s = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
      await authService.verifyTwoFASetup(adminId, authenticator.generate(s));
      return s;
    })();
    return authService.verifyTwoFALogin(adminId, authenticator.generate(secret));
  }

  it("issues a fresh access token for a valid, unrevoked session", async () => {
    const { refreshToken } = await loggedInSession();
    const result = await authService.refreshSession(refreshToken);
    expect(result.accessToken).toBeTruthy();
  });

  it("rejects an unknown refresh token", async () => {
    await expect(authService.refreshSession("not-a-real-token")).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });

  it("rejects a revoked session's refresh token", async () => {
    const { refreshToken, sessionId } = await loggedInSession();
    await authService.revokeSession(sessionId);

    await expect(authService.refreshSession(refreshToken)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});

describe("logout", () => {
  it("revokes the session so a later refresh fails", async () => {
    const { refreshToken } = await (async () => {
      const { otpauthUrl } = await authService.setupTwoFA(adminId);
      const s = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
      await authService.verifyTwoFASetup(adminId, authenticator.generate(s));
      return authService.verifyTwoFALogin(adminId, authenticator.generate(s));
    })();

    await authService.logout(refreshToken);
    await expect(authService.refreshSession(refreshToken)).rejects.toBeInstanceOf(
      authService.InvalidCredentialsError
    );
  });
});

describe("listSessions", () => {
  it("lists only unrevoked sessions, most-recently-active first", async () => {
    const { otpauthUrl } = await authService.setupTwoFA(adminId);
    const secret = /secret=([A-Z0-9]+)/.exec(otpauthUrl)![1];
    await authService.verifyTwoFASetup(adminId, authenticator.generate(secret));

    const first = await authService.verifyTwoFALogin(adminId, authenticator.generate(secret));
    await authService.revokeSession(first.sessionId);
    const second = await authService.verifyTwoFALogin(adminId, authenticator.generate(secret));

    const sessions = await authService.listSessions();
    const ids = sessions.map((s) => s.id);
    expect(ids).toContain(second.sessionId);
    expect(ids).not.toContain(first.sessionId);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: FAIL — `refreshSession is not a function`.

- [ ] **Step 3: Implement `refreshSession`, `logout`, `revokeSession`, `listSessions`**

Add to `apps/api/src/lib/auth/auth.ts`:

```ts
export async function refreshSession(rawRefreshToken: string): Promise<{ accessToken: string }> {
  const tokenHash = hashToken(rawRefreshToken);
  const session = await prisma.adminSession.findUnique({ where: { refreshTokenHash: tokenHash } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new InvalidCredentialsError();
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin || !admin.isActive) throw new InvalidCredentialsError();

  await prisma.adminSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } });
  return { accessToken: signAccessToken(admin.id, admin.role) };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.adminSession.updateMany({
    where: { refreshTokenHash: tokenHash },
    data: { revokedAt: new Date() },
  });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.adminSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function listSessions() {
  return prisma.adminSession.findMany({
    where: { revokedAt: null },
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { lastActiveAt: "desc" },
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- auth.test`
Expected: PASS, 21 tests (16 previous + 5 new).

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 74 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/auth/auth.ts apps/api/src/lib/auth/auth.test.ts
git commit -m "feat(api): add session refresh, logout, revocation, and listing"
```

---

## Task 11: `requireAuth` and `requireRole` middleware

**Files:**
- Create: `apps/api/src/lib/auth/middleware.ts`
- Test: `apps/api/src/lib/auth/middleware.test.ts`

**Interfaces:**
- Consumes: `verifyAccessToken` from `./jwt.js`.
- Produces: `requireAuth(req, res, next)`, `requireRole(role)`, `AuthedRequest` type (adds `req.actor`) — consumed by Task 12 (auth routes needing role checks) and every controller in Plan 2.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/auth/middleware.test.ts
import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { signAccessToken } from "./jwt.js";
import { requireAuth, requireRole, type AuthedRequest } from "./middleware.js";

function buildApp() {
  const app = express();
  app.get("/protected", requireAuth, (req: AuthedRequest, res) => {
    res.status(200).json({ actorId: req.actor?.id });
  });
  app.get("/superadmin-only", requireAuth, requireRole("superadmin"), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe("requireAuth", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    const res = await request(buildApp()).get("/protected").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("attaches req.actor and calls next() for a valid token", async () => {
    const token = signAccessToken("admin-1", "editor");
    const res = await request(buildApp()).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.actorId).toBe("admin-1");
  });
});

describe("requireRole", () => {
  it("returns 403 for the wrong role", async () => {
    const token = signAccessToken("admin-1", "editor");
    const res = await request(buildApp())
      .get("/superadmin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows the matching role through", async () => {
    const token = signAccessToken("admin-1", "superadmin");
    const res = await request(buildApp())
      .get("/superadmin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- middleware.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `middleware.ts`**

```ts
// apps/api/src/lib/auth/middleware.ts
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AdminRole } from "./jwt.js";

export interface AuthedRequest extends Request {
  actor?: { id: string; role: AdminRole };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.actor = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

export function requireRole(role: AdminRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.actor) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (req.actor.role !== role) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- middleware.test`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 79 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/auth/middleware.ts apps/api/src/lib/auth/middleware.test.ts
git commit -m "feat(api): add requireAuth and requireRole Express middleware"
```

---

## Task 12: Auth routes and controllers, mounted in `app.ts`

**Files:**
- Modify: `apps/api/package.json` (add `cookie-parser`, `@types/cookie-parser`, `express-rate-limit`, `zod`)
- Create: `apps/api/src/views/admin/auth.view.ts`
- Create: `apps/api/src/controllers/admin/auth.controller.ts`
- Create: `apps/api/src/routes/admin/auth.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/controllers/admin/auth.controller.test.ts`

**Interfaces:**
- Consumes: everything from `lib/auth/auth.ts` and `lib/auth/middleware.ts`.
- Produces: `POST /admin/api/auth/login`, `POST /admin/api/auth/2fa/setup`, `POST /admin/api/auth/2fa/setup/verify`, `POST /admin/api/auth/2fa/login/verify`, `POST /admin/api/auth/2fa/recovery`, `POST /admin/api/auth/refresh`, `POST /admin/api/auth/logout` — the full HTTP surface Plan 3's frontend proxy layer calls.

- [ ] **Step 1: Add dependencies**

Run: `npm install --workspace=apps/api cookie-parser express-rate-limit zod` then `npm install --workspace=apps/api -D @types/cookie-parser`

- [ ] **Step 2: Add cookie parsing and JSON body parsing to `app.ts`**

In `apps/api/src/app.ts`, add near the top:

```ts
import cookieParser from "cookie-parser";
import { adminAuthRouter } from "./routes/admin/auth.routes.js";
```

Inside `createApp()`, before the existing `/health`/`/ready` routes:

```ts
app.use(express.json());
app.use(cookieParser());
app.use("/admin/api/auth", adminAuthRouter);
```

- [ ] **Step 3: Create the response-shaping view**

```ts
// apps/api/src/views/admin/auth.view.ts
/** Pure response-shaping — no business logic, just what the client sees. */

export function loginPendingView(result: { pendingToken: string; twoFAEnabled: boolean }) {
  return { pendingToken: result.pendingToken, twoFAEnabled: result.twoFAEnabled };
}

export function twoFASetupView(result: { otpauthUrl: string; recoveryCodes: string[] }) {
  return { otpauthUrl: result.otpauthUrl, recoveryCodes: result.recoveryCodes };
}

export function sessionAccessTokenView(result: { accessToken: string }) {
  return { accessToken: result.accessToken };
}
```

- [ ] **Step 4: Write the failing controller test**

```ts
// apps/api/src/controllers/admin/auth.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { authenticator } from "otplib";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

beforeEach(async () => {
  await prisma.admin.create({
    data: {
      name: "Controller Test",
      email: "controller-test@zolvex.test",
      passwordHash: await hashPassword("correct-password"),
      role: "editor",
    },
  });
});

afterEach(async () => {
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /admin/api/auth/login", () => {
  it("returns 200 with a pendingToken on correct credentials", async () => {
    const res = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "correct-password" });
    expect(res.status).toBe(200);
    expect(res.body.pendingToken).toBeTruthy();
    expect(res.body.twoFAEnabled).toBe(false);
  });

  it("returns 401 on a wrong password", async () => {
    const res = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 400 on a malformed request body", async () => {
    const res = await request(app).post("/admin/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("full login -> 2FA setup -> 2FA verify -> refresh -> logout flow", () => {
  it("works end to end", async () => {
    const loginRes = await request(app)
      .post("/admin/api/auth/login")
      .send({ email: "controller-test@zolvex.test", password: "correct-password" });
    const pendingToken = loginRes.body.pendingToken;

    const setupRes = await request(app)
      .post("/admin/api/auth/2fa/setup")
      .set("Authorization", `Bearer ${pendingToken}`);
    expect(setupRes.status).toBe(200);
    const secret = /secret=([A-Z0-9]+)/.exec(setupRes.body.otpauthUrl)![1];

    const setupVerifyRes = await request(app)
      .post("/admin/api/auth/2fa/setup/verify")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: authenticator.generate(secret) });
    expect(setupVerifyRes.status).toBe(200);

    const loginVerifyRes = await request(app)
      .post("/admin/api/auth/2fa/login/verify")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({ code: authenticator.generate(secret) });
    expect(loginVerifyRes.status).toBe(200);
    expect(loginVerifyRes.body.accessToken).toBeTruthy();
    const cookies = loginVerifyRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const refreshRes = await request(app).post("/admin/api/auth/refresh").set("Cookie", cookies);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();

    const logoutRes = await request(app).post("/admin/api/auth/logout").set("Cookie", cookies);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogoutRes = await request(app).post("/admin/api/auth/refresh").set("Cookie", cookies);
    expect(refreshAfterLogoutRes.status).toBe(401);
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- auth.controller.test`
Expected: FAIL — route not found (404s).

- [ ] **Step 6: Implement the controller**

```ts
// apps/api/src/controllers/admin/auth.controller.ts
import type { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../../lib/auth/auth.js";
import { verifyPendingTwoFAToken } from "../../lib/auth/jwt.js";
import { loginPendingView, twoFASetupView, sessionAccessTokenView } from "../../views/admin/auth.view.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function pendingAdminId(req: Request): string {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new authService.InvalidCredentialsError();
  return verifyPendingTwoFAToken(token).sub;
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const result = await authService.login(parsed.data.email, parsed.data.password);
    res.status(200).json(loginPendingView(result));
  } catch (error) {
    if (error instanceof authService.AccountLockedError) {
      res.status(423).json({ error: "account_locked", lockedUntil: error.lockedUntil });
      return;
    }
    res.status(401).json({ error: "invalid_credentials" });
  }
}

export async function setupTwoFA(req: Request, res: Response) {
  try {
    const adminId = pendingAdminId(req);
    const result = await authService.setupTwoFA(adminId);
    res.status(200).json(twoFASetupView(result));
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

const codeSchema = z.object({ code: z.string().min(6).max(10) });

export async function verifyTwoFASetup(req: Request, res: Response) {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const adminId = pendingAdminId(req);
    await authService.verifyTwoFASetup(adminId, parsed.data.code);
    res.status(200).json({ ok: true });
  } catch {
    res.status(401).json({ error: "invalid_credentials" });
  }
}

export async function verifyTwoFALogin(req: Request, res: Response) {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const adminId = pendingAdminId(req);
    const result = await authService.verifyTwoFALogin(adminId, parsed.data.code, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTS);
    res.status(200).json(sessionAccessTokenView(result));
  } catch {
    res.status(401).json({ error: "invalid_credentials" });
  }
}

const recoverySchema = z.object({ code: z.string().min(1) });

export async function loginWithRecoveryCode(req: Request, res: Response) {
  const parsed = recoverySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const adminId = pendingAdminId(req);
    const result = await authService.loginWithRecoveryCode(adminId, parsed.data.code, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTS);
    res.status(200).json(sessionAccessTokenView(result));
  } catch {
    res.status(401).json({ error: "invalid_credentials" });
  }
}

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const result = await authService.refreshSession(rawToken);
    res.status(200).json(sessionAccessTokenView(result));
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

export async function logout(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (rawToken) await authService.logout(rawToken);
  res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTS);
  res.status(204).send();
}
```

- [ ] **Step 7: Wire the routes**

```ts
// apps/api/src/routes/admin/auth.routes.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../../controllers/admin/auth.controller.js";

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", loginRateLimit, authController.login);
adminAuthRouter.post("/2fa/setup", authController.setupTwoFA);
adminAuthRouter.post("/2fa/setup/verify", authController.verifyTwoFASetup);
adminAuthRouter.post("/2fa/login/verify", authController.verifyTwoFALogin);
adminAuthRouter.post("/2fa/recovery", authController.loginWithRecoveryCode);
adminAuthRouter.post("/refresh", authController.refresh);
adminAuthRouter.post("/logout", authController.logout);
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- auth.controller.test`
Expected: PASS, 4 tests.

- [ ] **Step 9: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 83 tests passing (79 previous + 4 new).

- [ ] **Step 10: Typecheck**

Run: `npm run typecheck --workspace=apps/api`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/src/app.ts apps/api/src/views apps/api/src/controllers apps/api/src/routes apps/api/src/controllers/admin/auth.controller.test.ts
git commit -m "feat(api): wire auth routes/controllers into app.ts (login, 2FA, refresh, logout)"
```

---

## Task 13: Sessions endpoints (list, revoke)

**Files:**
- Create: `apps/api/src/controllers/admin/sessions.controller.ts`
- Create: `apps/api/src/routes/admin/sessions.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/controllers/admin/sessions.controller.test.ts`

**Interfaces:**
- Consumes: `listSessions`, `revokeSession` from `lib/auth/auth.js`; `requireAuth`, `requireRole` from `lib/auth/middleware.js`.
- Produces: `GET /admin/api/sessions`, `POST /admin/api/sessions/:id/revoke` — both superadmin-only.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/controllers/admin/sessions.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import { authenticator } from "otplib";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/auth/crypto.js";
import { signAccessToken } from "../../lib/auth/jwt.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const app = createApp();

let editorAccessToken: string;
let superadminAccessToken: string;
let sessionId: string;

beforeEach(async () => {
  const editor = await prisma.admin.create({
    data: {
      name: "Editor",
      email: "sessions-editor@zolvex.test",
      passwordHash: await hashPassword("x"),
      role: "editor",
    },
  });
  const superadmin = await prisma.admin.create({
    data: {
      name: "Super",
      email: "sessions-super@zolvex.test",
      passwordHash: await hashPassword("x"),
      role: "superadmin",
    },
  });
  editorAccessToken = signAccessToken(editor.id, "editor");
  superadminAccessToken = signAccessToken(superadmin.id, "superadmin");

  const session = await prisma.adminSession.create({
    data: {
      adminId: editor.id,
      refreshTokenHash: "test-hash-" + Math.random(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  sessionId = session.id;
});

afterEach(async () => {
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /admin/api/sessions", () => {
  it("returns 403 for a non-superadmin", async () => {
    const res = await request(app)
      .get("/admin/api/sessions")
      .set("Authorization", `Bearer ${editorAccessToken}`);
    expect(res.status).toBe(403);
  });

  it("returns the active session list for a superadmin", async () => {
    const res = await request(app)
      .get("/admin/api/sessions")
      .set("Authorization", `Bearer ${superadminAccessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((s: { id: string }) => s.id === sessionId)).toBe(true);
  });
});

describe("POST /admin/api/sessions/:id/revoke", () => {
  it("revokes the target session", async () => {
    const res = await request(app)
      .post(`/admin/api/sessions/${sessionId}/revoke`)
      .set("Authorization", `Bearer ${superadminAccessToken}`);
    expect(res.status).toBe(200);

    const session = await prisma.adminSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.revokedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- sessions.controller.test`
Expected: FAIL — 404 (route not mounted).

- [ ] **Step 3: Implement the controller and routes**

```ts
// apps/api/src/controllers/admin/sessions.controller.ts
import type { Response } from "express";
import * as authService from "../../lib/auth/auth.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

export async function list(_req: AuthedRequest, res: Response) {
  const sessions = await authService.listSessions();
  res.status(200).json(sessions);
}

export async function revoke(req: AuthedRequest, res: Response) {
  await authService.revokeSession(req.params.id);
  res.status(200).json({ ok: true });
}
```

```ts
// apps/api/src/routes/admin/sessions.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as sessionsController from "../../controllers/admin/sessions.controller.js";

export const adminSessionsRouter = Router();

adminSessionsRouter.get("/", requireAuth, requireRole("superadmin"), sessionsController.list);
adminSessionsRouter.post(
  "/:id/revoke",
  requireAuth,
  requireRole("superadmin"),
  sessionsController.revoke
);
```

In `apps/api/src/app.ts`, add the import and mount:

```ts
import { adminSessionsRouter } from "./routes/admin/sessions.routes.js";
// ...
app.use("/admin/api/sessions", adminSessionsRouter);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/api -- sessions.controller.test`
Expected: PASS, 3 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 86 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/admin/sessions.controller.ts apps/api/src/controllers/admin/sessions.controller.test.ts apps/api/src/routes/admin/sessions.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add superadmin-only session list/revoke endpoints"
```

---

## Task 14: Admin user management and the first-superadmin seed script

**Files:**
- Create: `apps/api/src/lib/services/admin-user.ts`
- Create: `apps/api/src/controllers/admin/users.controller.ts`
- Create: `apps/api/src/routes/admin/users.routes.ts`
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (add `"prisma": {"seed": "tsx prisma/seed.ts"}`, a `db:seed` script)
- Modify: `apps/api/.env.example` (add `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_NAME`)
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/lib/services/admin-user.test.ts`

**Interfaces:**
- Consumes: `writeAuditRow`, `buildAuditDiff` from `./audit.js`; `hashPassword`, `generateTempPassword` from `../auth/crypto.js`.
- Produces: `AdminUserService` with `create`, `setActive`, `changeRole`, `list`; `POST /admin/api/users`, `PATCH /admin/api/users/:id`, `GET /admin/api/users` — closes the bootstrap gap.

- [ ] **Step 1: Write the failing service test**

```ts
// apps/api/src/lib/services/admin-user.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AdminUserService } from "./admin-user.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});
const users = new AdminUserService(prisma);

let superadminId: string;
let editorId: string;

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.admin.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedActors() {
  const superadmin = await prisma.admin.create({
    data: { name: "Boss", email: "boss@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  superadminId = superadmin.id;
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "ed@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
}

describe("AdminUserService.create", () => {
  it("creates a new admin with a one-time temp password and writes an audit row", async () => {
    await seedActors();
    const result = await users.create(
      { id: superadminId, role: "superadmin" },
      { name: "New Editor", email: "new-editor@zolvex.test", role: "editor" }
    );

    expect(result.admin.email).toBe("new-editor@zolvex.test");
    expect(result.admin.twoFAEnabled).toBe(false);
    expect(result.tempPassword).toBeTruthy();
    expect(result.admin.passwordHash).not.toBe(result.tempPassword);

    const logs = await prisma.auditLog.findMany({ where: { entityId: result.admin.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].entity).toBe("Admin");
  });

  it("rejects a non-superadmin creating an account", async () => {
    await seedActors();
    await expect(
      users.create({ id: editorId, role: "editor" }, { name: "X", email: "x@zolvex.test", role: "editor" })
    ).rejects.toThrow();
  });
});

describe("AdminUserService.setActive / changeRole", () => {
  it("deactivates and reactivates an account", async () => {
    await seedActors();
    const deactivated = await users.setActive({ id: superadminId, role: "superadmin" }, editorId, false);
    expect(deactivated.isActive).toBe(false);

    const reactivated = await users.setActive({ id: superadminId, role: "superadmin" }, editorId, true);
    expect(reactivated.isActive).toBe(true);
  });

  it("changes an account's role", async () => {
    await seedActors();
    const updated = await users.changeRole({ id: superadminId, role: "superadmin" }, editorId, "superadmin");
    expect(updated.role).toBe("superadmin");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/api -- admin-user.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AdminUserService`**

```ts
// apps/api/src/lib/services/admin-user.ts
import type { PrismaClient, AdminRole } from "@prisma/client";
import { writeAuditRow, buildAuditDiff } from "./audit.js";
import type { Actor } from "./approvable-resource.js";
import { hashPassword, generateTempPassword } from "../auth/crypto.js";

export class AdminUserService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.admin.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, twoFAEnabled: true, lastLogin: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(actor: Actor, data: { name: string; email: string; role: AdminRole }) {
    if (actor.role !== "superadmin") throw new Error("Only superadmin can create admin accounts");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const admin = await this.prisma.$transaction(async (tx) => {
      const created = await tx.admin.create({ data: { ...data, passwordHash } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: created.id,
        action: "create",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff(null, { name: created.name, email: created.email, role: created.role }),
      });
      return created;
    });

    // tempPassword returned in plaintext exactly once; never stored or logged plaintext again.
    return { admin, tempPassword };
  }

  async setActive(actor: Actor, id: string, isActive: boolean) {
    if (actor.role !== "superadmin") throw new Error("Only superadmin can change account status");

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.admin.findUnique({ where: { id } });
      if (!before) throw new Error(`Admin ${id} not found`);

      const record = await tx.admin.update({ where: { id }, data: { isActive } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff({ isActive: before.isActive }, { isActive: record.isActive }),
      });
      return record;
    });
  }

  async changeRole(actor: Actor, id: string, role: AdminRole) {
    if (actor.role !== "superadmin") throw new Error("Only superadmin can change roles");

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.admin.findUnique({ where: { id } });
      if (!before) throw new Error(`Admin ${id} not found`);

      const record = await tx.admin.update({ where: { id }, data: { role } });
      await writeAuditRow(tx, {
        entity: "Admin",
        entityId: id,
        action: "update",
        actorId: actor.id,
        ipAddress: actor.ipAddress,
        diff: buildAuditDiff({ role: before.role }, { role: record.role }),
      });
      return record;
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- admin-user.test`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the controller and routes**

```ts
// apps/api/src/controllers/admin/users.controller.ts
import type { Response } from "express";
import { z } from "zod";
import { AdminUserService } from "../../lib/services/admin-user.js";
import { prisma } from "../../db/prisma.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const users = new AdminUserService(prisma);

export async function list(_req: AuthedRequest, res: Response) {
  res.status(200).json(await users.list());
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["editor", "superadmin"]),
});

export async function create(req: AuthedRequest, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    const result = await users.create(req.actor!, parsed.data);
    res.status(201).json({
      id: result.admin.id,
      name: result.admin.name,
      email: result.admin.email,
      role: result.admin.role,
      tempPassword: result.tempPassword,
    });
  } catch {
    res.status(403).json({ error: "forbidden" });
  }
}

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["editor", "superadmin"]).optional(),
});

export async function patch(req: AuthedRequest, res: Response) {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  try {
    let record;
    if (parsed.data.isActive !== undefined) {
      record = await users.setActive(req.actor!, req.params.id, parsed.data.isActive);
    }
    if (parsed.data.role !== undefined) {
      record = await users.changeRole(req.actor!, req.params.id, parsed.data.role);
    }
    res.status(200).json(record);
  } catch {
    res.status(403).json({ error: "forbidden" });
  }
}
```

```ts
// apps/api/src/routes/admin/users.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth/middleware.js";
import * as usersController from "../../controllers/admin/users.controller.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/", requireAuth, requireRole("superadmin"), usersController.list);
adminUsersRouter.post("/", requireAuth, requireRole("superadmin"), usersController.create);
adminUsersRouter.patch("/:id", requireAuth, requireRole("superadmin"), usersController.patch);
```

In `apps/api/src/app.ts`:

```ts
import { adminUsersRouter } from "./routes/admin/users.routes.js";
// ...
app.use("/admin/api/users", adminUsersRouter);
```

- [ ] **Step 6: Write the seed script**

```ts
// apps/api/prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword, generateTempPassword } from "../src/lib/auth/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const name = process.env.SEED_SUPERADMIN_NAME ?? "Superadmin";
  if (!email) {
    throw new Error("SEED_SUPERADMIN_EMAIL is required to seed the first superadmin");
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Superadmin ${email} already exists, skipping seed.`);
    return;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.admin.create({ data: { name, email, passwordHash, role: "superadmin" } });

  console.log(`Created superadmin ${email}`);
  console.log(`Temporary password (save this now, it will not be shown again): ${tempPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Add to `apps/api/package.json`, alongside the existing `"scripts"` block:

```json
"scripts": {
  "db:seed": "tsx prisma/seed.ts"
}
```

(merge this key into the existing `scripts` object rather than replacing it)

And add a top-level `"prisma"` key to the same file:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Append to `apps/api/.env.example`:

```
SEED_SUPERADMIN_EMAIL="you@example.com"
SEED_SUPERADMIN_NAME="Your Name"
```

- [ ] **Step 7: Run the full suite**

Run: `npm run test --workspace=apps/api`
Expected: 90 tests passing (86 previous + 4 new).

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck --workspace=apps/api`
Expected: no errors.

- [ ] **Step 9: Manually verify the seed script**

Set `SEED_SUPERADMIN_EMAIL` and `SEED_SUPERADMIN_NAME` in your local `apps/api/.env`, then run: `npm run db:seed --workspace=apps/api`
Expected: console output showing the created superadmin's email and a one-time temp password. Confirm the row exists: check `SELECT email, role FROM "Admin";` via `psql` or a Prisma Studio session.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/lib/services/admin-user.ts apps/api/src/lib/services/admin-user.test.ts apps/api/src/controllers/admin/users.controller.ts apps/api/src/routes/admin/users.routes.ts apps/api/prisma/seed.ts apps/api/package.json apps/api/package-lock.json apps/api/.env.example apps/api/src/app.ts
git commit -m "feat(api): add admin user management and the first-superadmin seed script"
```

---

## Final verification (do this once, after all 14 tasks)

- [ ] Run `npm run typecheck --workspace=apps/api` — no errors.
- [ ] Run `npm run test --workspace=apps/api` — all ~90 tests passing.
- [ ] Run `npm run build --workspace=apps/api` — compiles cleanly.
- [ ] Start the dev server (`npm run dev --workspace=apps/api`) and manually walk the full flow with `curl` or a REST client: create the seeded superadmin → login → 2FA setup → 2FA verify → refresh → create a second admin (editor) via `/admin/api/users` → log that editor in → confirm `/admin/api/sessions` lists both sessions as the superadmin → revoke one → confirm its refresh now fails.
- [ ] Push the branch and open a PR (or hand the user the compare link if `gh` still isn't authenticated).
