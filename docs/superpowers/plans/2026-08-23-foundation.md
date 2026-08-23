# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Express/Prisma/Postgres project skeleton and the shared approvable-resource service (with transactional audit logging) that both the public site (Gate 1) and admin panel (Gate 2) depend on.

**Architecture:** A single `apps/api` Express service owns Postgres via Prisma. Every content type (services, blog posts, testimonials, FAQs, places) shares one generic `ApprovableResourceService` for create/update/soft-delete/restore/approve/reject — each write and its audit-log row happen in one Prisma transaction, so a failed audit write rolls back the content change instead of drifting silently out of sync (this was a specific decision from `/plan-eng-review`'s failure-mode analysis). This is Foundation only — no HTTP routes, no auth, no admin UI yet. Those are separate follow-up plans (Gate 1: public site + enquiry flow; Gate 2: admin panel + governance), per the design doc's own Worktree Parallelization Strategy.

**Tech Stack:** Node 20+, TypeScript, Express, Prisma 6 + PostgreSQL, Vitest for tests, npm workspaces for the monorepo.

**Spec:** `C:\Users\rejin\.gstack\projects\zolvex\rejin-unknown-design-20260823-221524.md` — see "Content Model", "Architecture Decisions" (items 3, 4), "Failure Modes" (audit-log atomicity), and "Implementation Tasks" (T1).

## Global Constraints

- Validation library: Zod (locked in `/plan-eng-review`) — not used directly in this plan (no HTTP input yet), but any future request-parsing code must use it, not Joi.
- DRY: one shared `ApprovableResourceService`, not a per-entity reimplementation (Architecture Decision 4).
- Audit-log write and the content write it logs must be in the same DB transaction — a failed audit write must roll back the content write (Failure Modes decision).
- `pageContent` does NOT go through the approval workflow (Architecture Decision 3) — it has no `approvalStatus` field and is not managed by `ApprovableResourceService`.
- Soft delete only — no hard deletes anywhere in this schema.

---

## File Structure

```
zolvex/
  package.json                              <- npm workspace root
  apps/
    api/
      package.json
      tsconfig.json
      vitest.config.ts
      .env.example
      prisma/
        schema.prisma
      src/
        app.ts                              <- Express app factory (no server.listen)
        server.ts                           <- entrypoint, calls app.listen
        app.test.ts                         <- health check test
        db/
          prisma.ts                         <- PrismaClient singleton
        lib/
          services/
            approvable-resource.ts
            approvable-resource.test.ts
```

- `app.ts` is separated from `server.ts` so tests can import the Express app without binding a port (standard supertest pattern).
- `db/prisma.ts` is a singleton so the whole app (and tests) share one PrismaClient instance rather than each file creating its own connection pool.
- `lib/services/approvable-resource.ts` is the one generic service every content type will configure against in Gate 1/Gate 2 — it has no knowledge of which specific entity (service, blog post, etc.) it's operating on beyond a delegate name string, so it stays reusable.

---

### Task 1: Monorepo scaffold + Express skeleton + Postgres/Prisma connection

**Files:**
- Create: `package.json` (root)
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/prisma/schema.prisma` (datasource/generator only — models come in Task 2)
- Create: `apps/api/src/db/prisma.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Test: `apps/api/src/app.test.ts`

**Interfaces:**
- Produces: `createApp(): express.Express` from `src/app.ts` — Task 2 and Task 3's tests do not consume this directly, but Gate 1/Gate 2 route tasks will. `prisma` singleton exported from `src/db/prisma.ts` — every later task imports this, never `new PrismaClient()` directly.

- [ ] **Step 1: Create the workspace root**

`package.json`:
```json
{
  "name": "zolvex",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:api": "npm run dev --workspace=apps/api",
    "test:api": "npm run test --workspace=apps/api"
  }
}
```

- [ ] **Step 2: Create the API package manifest**

`apps/api/package.json`:
```json
{
  "name": "@zolvex/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^6.1.0",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "prisma": "^6.1.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Run the install**

Run: `npm install` (from the repo root — npm workspaces hoist installs to root `node_modules`)
Expected: install completes, `apps/api/node_modules` symlinked into root, no errors.

- [ ] **Step 4: Create the TypeScript config**

`apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create the Prisma schema (datasource/generator only)**

`apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 6: Create the env example and your local env file**

`apps/api/.env.example`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zolvex?schema=public"
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/zolvex_test?schema=public"
PORT=4000
```

Copy this to `apps/api/.env` and point both URLs at a real local Postgres instance (Docker: `docker run --name zolvex-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`, then `createdb -U postgres -h localhost zolvex && createdb -U postgres -h localhost zolvex_test`).

- [ ] **Step 7: Create the Prisma client singleton**

`apps/api/src/db/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 8: Write the failing health-check test**

`apps/api/src/app.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 9: Create the Vitest config**

`apps/api/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `npm run test --workspace=apps/api`
Expected: FAIL — `Cannot find module './app.js'` (or similar), since `src/app.ts` doesn't exist yet.

- [ ] **Step 11: Write the minimal Express app**

`apps/api/src/app.ts`:
```typescript
import express, { type Express } from "express";

export function createApp(): Express {
  const app = express();

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
}
```

`apps/api/src/server.ts`:
```typescript
import { createApp } from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`zolvex api listening on :${port}`);
});
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api`
Expected: PASS — 1 test passed.

- [ ] **Step 13: Commit**

```bash
git add package.json apps/api
git commit -m "feat: scaffold api workspace with health-check endpoint"
```

---

### Task 2: Prisma schema — core tables

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Test: `apps/api/src/db/schema.test.ts`

**Interfaces:**
- Consumes: `prisma` singleton from Task 1 (`src/db/prisma.ts`).
- Produces: Prisma models `Admin`, `AdminSession`, `Service`, `BlogPost`, `Testimonial`, `Faq`, `Place`, `PageContent`, `Enquiry`, `AuditLog`, and enums `ApprovalStatus`, `AdminRole`, `AuditAction` — Task 3 and every Gate 1/Gate 2 task rely on these exact model and field names.

- [ ] **Step 1: Write the failing schema round-trip test**

This test creates one row per table (the minimum fields each requires) and asserts it reads back correctly — it exists to catch typos/required-field mistakes in the schema itself, not business logic (that's Task 3).

`apps/api/src/db/schema.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.pageContent.deleteMany();
  await prisma.place.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.service.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("Prisma schema round-trip", () => {
  it("creates and reads back one row of every model", async () => {
    const admin = await prisma.admin.create({
      data: {
        name: "Test Admin",
        email: "admin@zolvex.test",
        passwordHash: "hash",
        role: "superadmin",
      },
    });
    expect(admin.id).toBeTruthy();

    const session = await prisma.adminSession.create({
      data: { adminId: admin.id, deviceInfo: "test-device" },
    });
    expect(session.adminId).toBe(admin.id);

    const service = await prisma.service.create({
      data: {
        name: "Deep Cleaning",
        slug: "deep-cleaning",
        shortDescription: "Short",
        fullDescription: "Full",
        submittedBy: admin.id,
      },
    });
    expect(service.approvalStatus).toBe("draft");

    const blogPost = await prisma.blogPost.create({
      data: {
        title: "Post",
        image: "https://example.com/a.jpg",
        instagramUrl: "https://instagram.com/p/x",
        submittedBy: admin.id,
      },
    });
    expect(blogPost.id).toBeTruthy();

    const testimonial = await prisma.testimonial.create({
      data: { name: "Jane", rating: 5, message: "Great!", submittedBy: admin.id },
    });
    expect(testimonial.id).toBeTruthy();

    const faq = await prisma.faq.create({
      data: { question: "Q?", answer: "A.", submittedBy: admin.id },
    });
    expect(faq.id).toBeTruthy();

    const place = await prisma.place.create({ data: { name: "Downtown" } });
    expect(place.id).toBeTruthy();

    const pageContent = await prisma.pageContent.create({
      data: { pageKey: "landing_hero", data: { headline: "Welcome" } },
    });
    expect(pageContent.pageKey).toBe("landing_hero");

    const enquiry = await prisma.enquiry.create({
      data: {
        serviceId: service.id,
        serviceName: service.name,
        name: "Customer",
        phone: "555-0100",
        place: "Downtown",
      },
    });
    expect(enquiry.status).toBe("new");

    const auditLog = await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "create",
        entity: "Service",
        entityId: service.id,
        diff: { after: { name: service.name } },
      },
    });
    expect(auditLog.id).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=apps/api`
Expected: FAIL — Prisma client has no `admin`/`service`/etc. properties yet (schema only has datasource/generator).

- [ ] **Step 3: Write the full schema**

`apps/api/prisma/schema.prisma` (append to the existing datasource/generator block from Task 1):
```prisma
enum ApprovalStatus {
  draft
  pending_approval
  published
  rejected
}

enum AdminRole {
  superadmin
  editor
}

enum AuditAction {
  create
  update
  delete
  restore
  publish
  reject
}

model Admin {
  id                  String    @id @default(cuid())
  name                String
  email               String    @unique
  passwordHash        String
  role                AdminRole
  isActive            Boolean   @default(true)
  lastLogin           DateTime?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  twoFAEnabled        Boolean   @default(false)
  twoFASecret         String?
  twoFARecoveryCodes  String[]  @default([])
  deletedAt           DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  sessions  AdminSession[]
  auditLogs AuditLog[]
}

model AdminSession {
  id           String    @id @default(cuid())
  adminId      String
  admin        Admin     @relation(fields: [adminId], references: [id])
  deviceInfo   String?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime  @default(now())
  lastActiveAt DateTime  @default(now())
  revokedAt    DateTime?

  @@index([adminId])
}

model Service {
  id               String         @id @default(cuid())
  name             String
  slug             String         @unique
  shortDescription String
  fullDescription  String
  image            String?
  icon             String?
  isHighlighted    Boolean        @default(false)
  order            Int            @default(0)
  isActive         Boolean        @default(true)
  metaTitle        String?
  metaDescription  String?
  ogImage          String?
  approvalStatus   ApprovalStatus @default(draft)
  submittedBy      String?
  approvedBy       String?
  approvedAt       DateTime?
  rejectionReason  String?
  deletedAt        DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([approvalStatus])
  @@index([deletedAt])
}

model BlogPost {
  id              String         @id @default(cuid())
  title           String
  image           String
  instagramUrl    String
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
}

model Testimonial {
  id              String         @id @default(cuid())
  name            String
  rating          Int
  message         String
  isFeatured      Boolean        @default(false)
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
}

model Faq {
  id              String         @id @default(cuid())
  question        String
  answer          String
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
}

model Place {
  id        String    @id @default(cuid())
  name      String
  isActive  Boolean   @default(true)
  order     Int       @default(0)
  deletedAt DateTime?
}

model PageContent {
  id        String   @id @default(cuid())
  pageKey   String   @unique
  data      Json
  updatedAt DateTime @updatedAt
  updatedBy String?
}

model Enquiry {
  id            String    @id @default(cuid())
  serviceId     String?
  serviceName   String
  name          String
  phone         String
  place         String
  preferredDate DateTime?
  status        String    @default("new")
  crmResponse   Json?
  claimedAt     DateTime?
  attemptCount  Int       @default(0)
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime  @default(now())

  @@index([status])
}

model AuditLog {
  id        String      @id @default(cuid())
  adminId   String
  admin     Admin       @relation(fields: [adminId], references: [id])
  action    AuditAction
  entity    String
  entityId  String
  diff      Json
  ipAddress String?
  timestamp DateTime    @default(now())

  @@index([entity, entityId])
}
```

- [ ] **Step 4: Generate the Prisma client and run the migration**

Run: `npm run prisma:migrate --workspace=apps/api -- --name init`
Expected: migration created and applied against `DATABASE_URL`; Prisma client regenerated with all new model types.

Then apply the same migration to the test database:
Run: `DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`
Expected: test database schema matches.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api`
Expected: PASS — both the health-check test and the schema round-trip test pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma apps/api/src/db/schema.test.ts
git commit -m "feat: add core Prisma schema (admins, content types, enquiries, audit log)"
```

---

### Task 3: Approvable-resource service with transactional audit logging

**Files:**
- Create: `apps/api/src/lib/services/approvable-resource.ts`
- Test: `apps/api/src/lib/services/approvable-resource.test.ts`

**Interfaces:**
- Consumes: `prisma` singleton (Task 1), `Service`/`AuditLog` Prisma models (Task 2).
- Produces: `ApprovableResourceService` class with methods `create(actor, data)`, `update(actor, id, data)`, `softDelete(actor, id)`, `restore(actor, id)`, `approve(actor, id)`, `reject(actor, id, reason)`; `Actor` type `{ id: string; role: "superadmin" | "editor" }`; `SlugConflictError` class. Gate 1 and Gate 2 route handlers instantiate one `ApprovableResourceService` per content type (e.g. `new ApprovableResourceService(prisma, "Service", "service")`) and call these methods instead of touching Prisma directly.

- [ ] **Step 1: Write the failing test for create() as an editor (pending_approval)**

`apps/api/src/lib/services/approvable-resource.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ApprovableResourceService, SlugConflictError } from "./approvable-resource.js";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

const services = new ApprovableResourceService(prisma, "Service", "service");

let editorId: string;
let superadminId: string;

beforeAll(async () => {
  await prisma.$connect();
  const editor = await prisma.admin.create({
    data: { name: "Editor", email: "editor@zolvex.test", passwordHash: "x", role: "editor" },
  });
  editorId = editor.id;
  const superadmin = await prisma.admin.create({
    data: { name: "Super", email: "super@zolvex.test", passwordHash: "x", role: "superadmin" },
  });
  superadminId = superadmin.id;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.service.deleteMany();
});

afterAll(async () => {
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("ApprovableResourceService.create", () => {
  it("saves an editor's create as pending_approval and writes one audit row", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Deep Cleaning", slug: "deep-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    expect(record.approvalStatus).toBe("pending_approval");
    expect(record.submittedBy).toBe(editorId);

    const logs = await prisma.auditLog.findMany({ where: { entityId: record.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("create");
    expect(logs[0].adminId).toBe(editorId);
  });

  it("saves a superadmin's create as published directly, no approval queue", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Carpet Cleaning", slug: "carpet-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    expect(record.approvalStatus).toBe("published");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=apps/api -- approvable-resource`
Expected: FAIL — `./approvable-resource.js` does not exist yet.

- [ ] **Step 3: Implement create() and update() minimally**

`apps/api/src/lib/services/approvable-resource.ts`:
```typescript
import type { PrismaClient } from "@prisma/client";

export class SlugConflictError extends Error {}

export interface Actor {
  id: string;
  role: "superadmin" | "editor";
}

type DelegateName = "service" | "blogPost" | "testimonial" | "faq" | "place";

export class ApprovableResourceService {
  constructor(
    private prisma: PrismaClient,
    private entityName: string,
    private delegateName: DelegateName
  ) {}

  private delegate(tx: any) {
    return tx[this.delegateName];
  }

  private statusFor(actor: Actor): "published" | "pending_approval" {
    return actor.role === "superadmin" ? "published" : "pending_approval";
  }

  async create(actor: Actor, data: Record<string, unknown>) {
    const approvalStatus = this.statusFor(actor);

    return this.prisma.$transaction(async (tx) => {
      const record = await this.delegate(tx).create({
        data: { ...data, approvalStatus, submittedBy: actor.id },
      });
      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "create",
          entity: this.entityName,
          entityId: record.id,
          diff: { after: data },
        },
      });
      return record;
    });
  }

  async update(actor: Actor, id: string, data: Record<string, unknown>) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);

      const approvalStatus = this.statusFor(actor);
      const record = await this.delegate(tx).update({
        where: { id },
        data: { ...data, approvalStatus, submittedBy: actor.id },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "update",
          entity: this.entityName,
          entityId: id,
          diff: { before, after: data },
        },
      });
      return record;
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- approvable-resource`
Expected: PASS — both create() tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/services/approvable-resource.ts apps/api/src/lib/services/approvable-resource.test.ts
git commit -m "feat: approvable-resource service create/update with transactional audit log"
```

- [ ] **Step 6: Write the failing test for softDelete() and restore() (including the slug-conflict rule)**

Add to `apps/api/src/lib/services/approvable-resource.test.ts`:
```typescript
describe("ApprovableResourceService.softDelete / restore", () => {
  it("soft-deletes, then restores cleanly when no slug conflict exists", async () => {
    const record = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Window Cleaning", slug: "window-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    const deleted = await services.softDelete({ id: superadminId, role: "superadmin" }, record.id);
    expect(deleted.deletedAt).not.toBeNull();

    const restored = await services.restore({ id: superadminId, role: "superadmin" }, record.id);
    expect(restored.deletedAt).toBeNull();
  });

  it("refuses to restore when another live record has taken the same slug", async () => {
    const original = await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    await services.softDelete({ id: superadminId, role: "superadmin" }, original.id);

    await services.create(
      { id: superadminId, role: "superadmin" },
      { name: "New Sofa Cleaning", slug: "sofa-cleaning", shortDescription: "s2", fullDescription: "f2" }
    );

    await expect(
      services.restore({ id: superadminId, role: "superadmin" }, original.id)
    ).rejects.toThrow(SlugConflictError);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm run test --workspace=apps/api -- approvable-resource`
Expected: FAIL — `services.softDelete` and `services.restore` are not functions yet.

- [ ] **Step 8: Implement softDelete() and restore()**

Add to `apps/api/src/lib/services/approvable-resource.ts` (inside the class, after `update`):
```typescript
  async softDelete(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);
      if (before.deletedAt) throw new Error(`${this.entityName} ${id} already deleted`);

      const record = await this.delegate(tx).update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "delete",
          entity: this.entityName,
          entityId: id,
          diff: { before: { deletedAt: before.deletedAt }, after: { deletedAt: record.deletedAt } },
        },
      });
      return record;
    });
  }

  async restore(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);
      if (!before.deletedAt) throw new Error(`${this.entityName} ${id} is not deleted`);

      if ("slug" in before && before.slug) {
        const conflict = await this.delegate(tx).findFirst({
          where: { slug: before.slug, deletedAt: null, NOT: { id } },
        });
        if (conflict) {
          throw new SlugConflictError(
            `Cannot restore ${this.entityName} ${id}: slug "${before.slug}" is in use by ${conflict.id}`
          );
        }
      }

      const record = await this.delegate(tx).update({
        where: { id },
        data: { deletedAt: null },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "restore",
          entity: this.entityName,
          entityId: id,
          diff: { before: { deletedAt: before.deletedAt }, after: { deletedAt: null } },
        },
      });
      return record;
    });
  }
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- approvable-resource`
Expected: PASS — all four tests pass.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/lib/services/approvable-resource.ts apps/api/src/lib/services/approvable-resource.test.ts
git commit -m "feat: approvable-resource soft-delete/restore with slug-conflict rule"
```

- [ ] **Step 11: Write the failing test for approve() and reject()**

Add to `apps/api/src/lib/services/approvable-resource.test.ts`:
```typescript
describe("ApprovableResourceService.approve / reject", () => {
  it("approve() publishes a pending record and writes a publish audit row", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Office Cleaning", slug: "office-cleaning", shortDescription: "s", fullDescription: "f" }
    );
    expect(record.approvalStatus).toBe("pending_approval");

    const approved = await services.approve({ id: superadminId, role: "superadmin" }, record.id);
    expect(approved.approvalStatus).toBe("published");
    expect(approved.approvedBy).toBe(superadminId);

    const logs = await prisma.auditLog.findMany({
      where: { entityId: record.id, action: "publish" },
    });
    expect(logs).toHaveLength(1);
  });

  it("reject() requires a non-empty reason and records it", async () => {
    const record = await services.create(
      { id: editorId, role: "editor" },
      { name: "Gutter Cleaning", slug: "gutter-cleaning", shortDescription: "s", fullDescription: "f" }
    );

    await expect(
      services.reject({ id: superadminId, role: "superadmin" }, record.id, "")
    ).rejects.toThrow(/rejectionReason is required/);

    const rejected = await services.reject(
      { id: superadminId, role: "superadmin" },
      record.id,
      "Photo quality too low"
    );
    expect(rejected.approvalStatus).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Photo quality too low");
  });
});
```

- [ ] **Step 12: Run the test to verify it fails**

Run: `npm run test --workspace=apps/api -- approvable-resource`
Expected: FAIL — `services.approve` and `services.reject` are not functions yet.

- [ ] **Step 13: Implement approve() and reject()**

Add to `apps/api/src/lib/services/approvable-resource.ts` (inside the class, after `restore`):
```typescript
  async approve(actor: Actor, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);

      const record = await this.delegate(tx).update({
        where: { id },
        data: { approvalStatus: "published", approvedBy: actor.id, approvedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "publish",
          entity: this.entityName,
          entityId: id,
          diff: {
            before: { approvalStatus: before.approvalStatus },
            after: { approvalStatus: "published" },
          },
        },
      });
      return record;
    });
  }

  async reject(actor: Actor, id: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error("rejectionReason is required");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await this.delegate(tx).findUnique({ where: { id } });
      if (!before) throw new Error(`${this.entityName} ${id} not found`);

      const record = await this.delegate(tx).update({
        where: { id },
        data: { approvalStatus: "rejected", rejectionReason: reason },
      });

      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          action: "reject",
          entity: this.entityName,
          entityId: id,
          diff: {
            before: { approvalStatus: before.approvalStatus },
            after: { approvalStatus: "rejected", rejectionReason: reason },
          },
        },
      });
      return record;
    });
  }
```

- [ ] **Step 14: Run the test to verify it passes**

Run: `npm run test --workspace=apps/api -- approvable-resource`
Expected: PASS — all six tests pass.

- [ ] **Step 15: Run the FULL test suite to confirm nothing regressed**

Run: `npm run test --workspace=apps/api`
Expected: PASS — health check, schema round-trip, and all approvable-resource tests all pass.

- [ ] **Step 16: Commit**

```bash
git add apps/api/src/lib/services/approvable-resource.ts apps/api/src/lib/services/approvable-resource.test.ts
git commit -m "feat: approvable-resource approve/reject with required rejection reason"
```

---

## Self-Review

**1. Spec coverage:**
- Content Model (services/blogPosts/testimonials/faqs/places/pageContent, approvalStatus enum, soft-delete) → Task 2's schema. ✓
- Architecture Decision 3 (`pageContent` is superadmin-only, no approval queue) → `PageContent` model has no `approvalStatus` field and `ApprovableResourceService`'s `DelegateName` type deliberately excludes `pageContent`. ✓
- Architecture Decision 4 (shared approvable-resource service + transactional audit log, not per-entity reimplementation) → Task 3. ✓
- Approach B implementation grain: audit log fields (`adminId, action, entity, entityId, diff, ipAddress, timestamp`) → matches Task 2's `AuditLog` model exactly (`ipAddress` is nullable here since Foundation has no HTTP layer yet to populate it from — Gate 1/Gate 2 route handlers will pass it in). ✓
- Approach B implementation grain: trash/restore slug-conflict rule → Task 3, Step 8. ✓
- Failure Modes: audit-log write failure rolls back the content write → every method wraps both writes in one `$transaction`; Prisma automatically rolls back the whole transaction if any statement inside throws. ✓
- Premise 6: superadmin publishes directly, editor goes to pending_approval → `statusFor()` helper, tested in Task 3 Step 1. ✓
- Not covered here (by design, deferred to later plans): HTTP routes, auth/2FA, session revocation, CRM push, public site, Next.js proxy layer, Zod validation at the request boundary.

**2. Placeholder scan:** No TBD/TODO markers; every step has runnable code. The one intentionally-deferred item (Gate 1/Gate 2 wiring `ipAddress` into audit log calls) is called out explicitly in Self-Review item 1, not hidden as a silent gap.

**3. Type consistency:** `Actor` type (`{ id: string; role: "superadmin" | "editor" }`) is defined once in `approvable-resource.ts` and used identically across all six test cases. `DelegateName` union type matches the five approvable Prisma model names lower-cased to their delegate form (`service`, `blogPost`, `testimonial`, `faq`, `place`) — verified against Task 2's model names.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-23-foundation.md`.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
