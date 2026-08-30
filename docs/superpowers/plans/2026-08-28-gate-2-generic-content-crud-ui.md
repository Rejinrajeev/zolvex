# Gate 2 Frontend — Generic Content CRUD UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the config-driven list/create/edit/reorder/approve/reject UI for the five generic content types (Service, BlogPost, Testimonial, Faq, InstagramPost), plus the shared image-upload flow, on top of Plan 3a's auth/BFF foundation.

**Architecture:** A single `ContentTypeConfig` per type drives one generic set of pages (`/admin/content/[type]`, `.../new`, `.../[id]`) and one generic set of BFF Route Handlers (`/admin/api/content/[type]/**`), every handler a thin `callExpress` passthrough to Plan 2's already-built, already-tested Express endpoints. No backend code changes.

**Tech Stack:** Next.js 16.3.2 (App Router, Route Handlers), React 19.2.8, TypeScript, vitest, Tailwind v4 (already configured — `apps/web/app/globals.css`'s `@theme inline` block).

**Spec:** `docs/superpowers/specs/2026-08-28-gate-2-generic-content-crud-ui-design.md` (this plan's own design doc) and `docs/superpowers/specs/2026-08-25-gate-2-admin-panel-design.md` (the parent Gate 2 spec, for the backend contract and the "bespoke screens" boundary).

## Global Constraints

- **Every BFF Route Handler in this plan uses `callExpress` and `parseJsonSafe`** (`apps/web/lib/admin-auth/proxy.ts`, from Plan 3a) — never a bare `fetch` to Express, never `response.json()` directly. `parseJsonSafe` exists specifically because a non-JSON upstream body must not crash the handler; even though none of this plan's endpoints sit behind a rate limiter (see next point), using it everywhere keeps one consistent pattern rather than two.
- **No `X-Forwarded-For` relay needed in this plan.** Plan 3a's auth endpoints relay this header because they sit behind Express's `express-rate-limit` middleware. Confirmed by reading `apps/api/src/routes/admin/content.routes.ts` and `uploads.routes.ts` directly: neither has any `rateLimit` middleware. Do not copy the auth-routes relay pattern reflexively — it has nothing to protect here.
- **Import style**: every production (non-`.test.ts`) file uses the `@/*` path alias (`apps/web/tsconfig.json`, `moduleResolution: "bundler"`), never a `.js`-suffixed relative import — Turbopack cannot resolve those against `.ts` source (this bit several tasks in Plan 3a).
- **Dynamic Route Handler params are async in this Next.js version.** Confirmed against the installed `next@16.3.2` package's own docs (`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`): a Route Handler's second argument's `params` is a `Promise`, always `await`ed — e.g. `{ params }: { params: Promise<{ type: string }> }`, then `const { type } = await params;`. This plan hand-writes this type inline rather than using Next's generated `RouteContext<'...'>` helper, since that helper's types only exist after `next dev`/`next build`/`next typegen` has run once — an inline type has no such prerequisite and matches this codebase's existing style (Plan 3a never used generated types either).
- **Client Components read route params via `useParams()`** (`next/navigation`), not the async server-side `params` prop — this plan's pages are Client Components (`"use client"`), matching every page Plan 3a built (fetching via `fetch` against this app's own BFF routes, never `callExpress` directly from a page).
- **A Client Component calling `useSearchParams()` must be wrapped in `<Suspense>`** or the build fails ("should be wrapped in a suspense boundary") — this bit Plan 3a's Task 9. The list page (Task 7) uses `useSearchParams()` for its status/search filters and needs the same inner-component-plus-Suspense-wrapper split from the start.
- **Content-type allowlist single source of truth**: `apps/web/lib/admin-content/configs/index.ts`'s keys must exactly match Express's `CONTENT_TYPES` (`apps/api/src/controllers/admin/content.schemas.ts`): `service`, `blog-post`, `testimonial`, `faq`, `instagram-post`. A `[type]` not in this map renders `notFound()` (client-side: redirect or an inline "not found" render — Next's `notFound()` helper is designed for Server Components; a Client Component checks the config and renders its own not-found UI instead).
- **Restore is out of scope for this plan** — `ApprovableResourceService.list()` always filters `deletedAt: null`, so a soft-deleted record is never reachable from this plan's own list screen. No restore Route Handler, no restore UI. (Belongs with the Trash screen, Plan 3c.)
- **The Approvals dashboard is out of scope for this plan** (deferred to Plan 3c) — this plan's approve/reject controls are per-record, inline on the list/edit screens for the five generic types only.
- **Design language**: extends `DESIGN.md` (ink/paper/olive/gold, Zilla Slab/Archivo/Special Elite, square corners, border-driven depth, no box-shadow elevation) per this plan's own design spec's "Visual design" section — every component below follows it exactly; no new colors, no rounded corners outside the established stamp/badge exceptions, no box-shadow.
- **Testing split** (matches Plan 3a): automated tests cover pure logic (config shape, JWT-decode helper, BFF handlers' status/body mapping); the CRUD screens themselves (forms, table, drag-reorder, upload dropzone) are manually verified per this plan's Final Verification section.

---

## Task 1: Content-type config module

**Files:**
- Create: `apps/web/lib/admin-content/types.ts`
- Create: `apps/web/lib/admin-content/configs/service.ts`
- Create: `apps/web/lib/admin-content/configs/blog-post.ts`
- Create: `apps/web/lib/admin-content/configs/testimonial.ts`
- Create: `apps/web/lib/admin-content/configs/faq.ts`
- Create: `apps/web/lib/admin-content/configs/instagram-post.ts`
- Create: `apps/web/lib/admin-content/configs/index.ts`
- Test: `apps/web/lib/admin-content/configs.test.ts`

**Interfaces:**
- Produces: `ContentTypeConfig`, `FieldConfig`, `FieldType` (types); `CONTENT_TYPE_CONFIGS: Record<string, ContentTypeConfig>` and `configFor(type: string): ContentTypeConfig | undefined` (the allowlist + lookup every later task consumes).

Field shapes below are copied exactly from `apps/api/src/controllers/admin/content.schemas.ts` — do not add, remove, or rename a field relative to that file.

- [ ] **Step 1: Write the shared types**

```ts
// apps/web/lib/admin-content/types.ts
export type FieldType = "text" | "textarea" | "number" | "boolean" | "image";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  helpText?: string;
}

export interface ListColumn {
  key: string;
  label: string;
}

export interface ContentTypeConfig {
  /** Route-param value, must match Express's CONTENT_TYPES exactly. */
  type: string;
  displayName: string;
  displayNamePlural: string;
  listColumns: ListColumn[];
  fields: FieldConfig[];
}
```

- [ ] **Step 2: Write each type's config**

```ts
// apps/web/lib/admin-content/configs/service.ts
import type { ContentTypeConfig } from "../types";

export const serviceConfig: ContentTypeConfig = {
  type: "service",
  displayName: "Service",
  displayNamePlural: "Services",
  listColumns: [
    { key: "name", label: "Name" },
    { key: "shortDescription", label: "Short description" },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", required: true, helpText: "URL-friendly identifier; must be unique." },
    { name: "shortDescription", label: "Short description", type: "textarea", required: true },
    { name: "fullDescription", label: "Full description", type: "textarea", required: true },
    { name: "image", label: "Image", type: "image" },
    { name: "icon", label: "Icon name", type: "text" },
    { name: "isHighlighted", label: "Highlighted", type: "boolean" },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
    { name: "metaTitle", label: "Meta title", type: "text" },
    { name: "metaDescription", label: "Meta description", type: "textarea" },
    { name: "ogImage", label: "Social share image", type: "image" },
  ],
};
```

```ts
// apps/web/lib/admin-content/configs/blog-post.ts
import type { ContentTypeConfig } from "../types";

export const blogPostConfig: ContentTypeConfig = {
  type: "blog-post",
  displayName: "Blog post",
  displayNamePlural: "Blog posts",
  listColumns: [
    { key: "title", label: "Title" },
    { key: "instagramUrl", label: "Instagram URL" },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "image", label: "Image", type: "image", required: true },
    { name: "instagramUrl", label: "Instagram URL", type: "text", required: true },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
```

```ts
// apps/web/lib/admin-content/configs/testimonial.ts
import type { ContentTypeConfig } from "../types";

export const testimonialConfig: ContentTypeConfig = {
  type: "testimonial",
  displayName: "Testimonial",
  displayNamePlural: "Testimonials",
  listColumns: [
    { key: "name", label: "Name" },
    { key: "rating", label: "Rating" },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "rating", label: "Rating (1-5)", type: "number", required: true, helpText: "Whole number from 1 to 5." },
    { name: "message", label: "Message", type: "textarea", required: true },
    { name: "isFeatured", label: "Featured", type: "boolean" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
```

```ts
// apps/web/lib/admin-content/configs/faq.ts
import type { ContentTypeConfig } from "../types";

export const faqConfig: ContentTypeConfig = {
  type: "faq",
  displayName: "FAQ",
  displayNamePlural: "FAQs",
  listColumns: [{ key: "question", label: "Question" }],
  fields: [
    { name: "question", label: "Question", type: "text", required: true },
    { name: "answer", label: "Answer", type: "textarea", required: true },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
```

```ts
// apps/web/lib/admin-content/configs/instagram-post.ts
import type { ContentTypeConfig } from "../types";

export const instagramPostConfig: ContentTypeConfig = {
  type: "instagram-post",
  displayName: "Instagram post",
  displayNamePlural: "Instagram posts",
  listColumns: [{ key: "permalink", label: "Permalink" }],
  fields: [
    { name: "image", label: "Image", type: "image", required: true },
    { name: "permalink", label: "Instagram permalink", type: "text", required: true },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
```

- [ ] **Step 3: Write the allowlist + lookup**

```ts
// apps/web/lib/admin-content/configs/index.ts
import type { ContentTypeConfig } from "../types";
import { serviceConfig } from "./service";
import { blogPostConfig } from "./blog-post";
import { testimonialConfig } from "./testimonial";
import { faqConfig } from "./faq";
import { instagramPostConfig } from "./instagram-post";

// Mirrors apps/api/src/controllers/admin/content.schemas.ts's CONTENT_TYPES
// exactly -- these two lists must never drift apart.
export const CONTENT_TYPE_CONFIGS: Record<string, ContentTypeConfig> = {
  service: serviceConfig,
  "blog-post": blogPostConfig,
  testimonial: testimonialConfig,
  faq: faqConfig,
  "instagram-post": instagramPostConfig,
};

export function configFor(type: string): ContentTypeConfig | undefined {
  return CONTENT_TYPE_CONFIGS[type];
}
```

- [ ] **Step 4: Write the tests**

```ts
// apps/web/lib/admin-content/configs.test.ts
import { describe, it, expect } from "vitest";
import { CONTENT_TYPE_CONFIGS, configFor } from "./configs/index.js";

const EXPECTED_TYPES = ["service", "blog-post", "testimonial", "faq", "instagram-post"];

describe("content type configs", () => {
  it("has exactly the five types Express's CONTENT_TYPES allowlist defines", () => {
    expect(Object.keys(CONTENT_TYPE_CONFIGS).sort()).toEqual([...EXPECTED_TYPES].sort());
  });

  it("each config's own `type` field matches the map key it's stored under", () => {
    for (const [key, config] of Object.entries(CONTENT_TYPE_CONFIGS)) {
      expect(config.type).toBe(key);
    }
  });

  it("every field has a non-empty name and label", () => {
    for (const config of Object.values(CONTENT_TYPE_CONFIGS)) {
      for (const field of config.fields) {
        expect(field.name.length).toBeGreaterThan(0);
        expect(field.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("configFor returns undefined for an unknown type", () => {
    expect(configFor("not-a-real-type")).toBeUndefined();
  });

  it("configFor returns the matching config for each known type", () => {
    for (const type of EXPECTED_TYPES) {
      expect(configFor(type)?.type).toBe(type);
    }
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm run test --workspace=apps/web`
Expected: PASS, 5 new tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/admin-content
git commit -m "feat(web): add content-type config module for the 5 generic types"
```

---

## Task 2: Role exposure (`/admin/api/auth/me`)

**Files:**
- Create: `apps/web/lib/admin-auth/jwt.ts`
- Test: `apps/web/lib/admin-auth/jwt.test.ts`
- Create: `apps/web/app/admin/api/auth/me/route.ts`

**Interfaces:**
- Consumes: `getAccessToken` (Plan 3a, `apps/web/lib/admin-auth/cookies.ts`).
- Produces: `decodeJwtPayload(token: string): Record<string, unknown> | null`; `GET /admin/api/auth/me` → `{ role: string }` or 401.

This exists so the list/edit pages (Tasks 7-8) know whether to show approve/reject/reorder controls at all. It is a UI hint only — Express's `requireRole`/`ForbiddenActionError` remains the real enforcement boundary regardless of what this returns.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/admin-auth/jwt.test.ts
import { describe, it, expect } from "vitest";
import { decodeJwtPayload } from "./jwt.js";

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}.fake-signature`;
}

describe("decodeJwtPayload", () => {
  it("decodes a well-formed JWT's payload segment", () => {
    const token = fakeJwt({ sub: "admin-1", role: "superadmin", purpose: "access" });
    expect(decodeJwtPayload(token)).toEqual({ sub: "admin-1", role: "superadmin", purpose: "access" });
  });

  it("returns null for a string with the wrong number of segments", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(decodeJwtPayload("only.two")).toBeNull();
  });

  it("returns null when the payload segment isn't valid base64url JSON", () => {
    expect(decodeJwtPayload("header.!!!not-valid-base64!!!.sig")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test --workspace=apps/web`
Expected: FAIL — `Cannot find module './jwt.js'`.

- [ ] **Step 3: Implement `jwt.ts`**

```ts
// apps/web/lib/admin-auth/jwt.ts
/**
 * Decodes (does NOT verify the signature of) a JWT's payload segment. Used
 * only to read the `role` claim for a UI display decision (which controls to
 * show) -- the actual security boundary is Express's own signature-verified
 * requireAuth/requireRole on every proxied call. Never use this function's
 * output to make an authorization DECISION, only a display one.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=apps/web`
Expected: PASS, 3 new tests.

- [ ] **Step 5: Implement the Route Handler**

```ts
// apps/web/app/admin/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/admin-auth/cookies";
import { decodeJwtPayload } from "@/lib/admin-auth/jwt";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = decodeJwtPayload(accessToken);
  const role = payload?.role;
  if (typeof role !== "string") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ role });
}
```

- [ ] **Step 6: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors, `/admin/api/auth/me` registered.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/admin-auth/jwt.ts apps/web/lib/admin-auth/jwt.test.ts apps/web/app/admin/api/auth/me
git commit -m "feat(web): add JWT-payload decode helper and /admin/api/auth/me route"
```

---

## Task 3: Design primitives

**Files:**
- Create: `apps/web/components/admin/StatusBadge.tsx`
- Create: `apps/web/components/admin/ErrorBanner.tsx`
- Create: `apps/web/components/admin/Modal.tsx`
- Create: `apps/web/components/admin/Table.tsx`
- Modify: `apps/web/components/icons.tsx` (add `IconDragHandle`)

**Interfaces:**
- Produces: `StatusBadge`, `ErrorBanner`, `Modal`, `Table` (generic), `IconDragHandle` — consumed by Tasks 7-9.

These follow `DESIGN.md` exactly (square corners, `border-ink`/`border-gold`/`border-olive-ink` hairlines, no box-shadow, `font-stamp`/`font-display`/`font-body` for their respective roles). No visual verification is automated for these — they're checked in this plan's Final Verification section by actually looking at the rendered pages.

- [ ] **Step 1: Status badge**

```tsx
// apps/web/components/admin/StatusBadge.tsx
const LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  published: "Published",
  rejected: "Rejected",
};

/**
 * The five generic types' approvalStatus, rendered as a "logged" stamp --
 * font-stamp is DESIGN.md's role reserved for dates/statuses/tags, never
 * headings or body copy. No red anywhere: the palette has none by design.
 */
export function StatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status;
  const base = "inline-block font-stamp text-[0.7rem] uppercase tracking-wide px-2 py-1";

  if (status === "published") {
    return <span className={`${base} bg-gold text-ink`}>{label}</span>;
  }
  if (status === "pending_approval") {
    return <span className={`${base} border border-olive-ink/60 text-olive-ink`}>{label}</span>;
  }
  if (status === "rejected") {
    return (
      <span className={`${base} border-2 border-ink text-ink`}>
        <span aria-hidden="true" className="stamp-rotate inline-block mr-1">◆</span>
        {label}
      </span>
    );
  }
  return <span className={`${base} text-slate`}>{label}</span>;
}
```

- [ ] **Step 2: Error banner**

```tsx
// apps/web/components/admin/ErrorBanner.tsx
/**
 * A non-field-level failure (upload errors, network errors) -- a bordered
 * strip per DESIGN.md's border-driven depth language. A narrow, documented
 * extension to DESIGN.md (see this plan's design spec's "Visual design"
 * section) for a pattern the system didn't already define.
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="border-2 border-ink bg-paper px-4 py-3 font-body text-sm text-ink">
      {message}
    </div>
  );
}
```

- [ ] **Step 3: Modal**

```tsx
// apps/web/components/admin/Modal.tsx
"use client";

import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="w-full max-w-md border-t-2 border-ink bg-paper p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-modal-title" className="mb-4 font-display text-2xl text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Generic table**

```tsx
// apps/web/components/admin/Table.tsx
import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  renderActions,
  emptyMessage = "No records yet.",
}: {
  columns: TableColumn<T>[];
  rows: T[];
  renderActions?: (row: T) => ReactNode;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="border border-ink/10 px-4 py-6 font-body text-sm text-slate">{emptyMessage}</p>;
  }

  return (
    <table className="w-full border-collapse font-body text-sm">
      <thead>
        <tr className="border-b border-ink/10 text-left">
          {columns.map((col) => (
            <th key={col.key} className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
              {col.label}
            </th>
          ))}
          {renderActions && <th className="py-2" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-ink/10">
            {columns.map((col) => (
              <td key={col.key} className="py-3 pr-4 align-top text-ink">
                {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
              </td>
            ))}
            {renderActions && <td className="py-3 text-right">{renderActions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Add the drag-handle icon**

Read `apps/web/components/icons.tsx` first to match its exact pattern (a shared `base` SVG-props object, one exported function per icon, 24×24 viewBox, 1.5px stroke, round caps/joins). Add this function to the end of the file, following that same pattern exactly:

```tsx
export function IconDragHandle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
```

- [ ] **Step 6: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors. Run `npm run test --workspace=apps/web` — expect the 23 tests from Plan 3a plus Tasks 1-2 (15 + 5 + 3) still passing unchanged (this task adds no new automated tests; these are presentational components verified visually in Final Verification).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/admin apps/web/components/icons.tsx
git commit -m "feat(web): add admin design primitives (StatusBadge, ErrorBanner, Modal, Table, drag-handle icon)"
```

---

## Task 4: Generic content BFF proxy — CRUD basics

**Files:**
- Create: `apps/web/app/admin/api/content/[type]/route.ts`
- Create: `apps/web/app/admin/api/content/[type]/[id]/route.ts`

**Interfaces:**
- Consumes: `callExpress`, `parseJsonSafe` (Plan 3a); `configFor` (Task 1).
- Produces: `GET/POST /admin/api/content/[type]`, `GET/PATCH/DELETE /admin/api/content/[type]/[id]`.

- [ ] **Step 1: List + create**

```ts
// apps/web/app/admin/api/content/[type]/route.ts
import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { configFor } from "@/lib/admin-content/configs";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const { search } = new URL(request.url);
  const upstream = await callExpress(`/admin/api/content/${type}${search}`, { method: "GET" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}

export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const body = await request.text();
  const upstream = await callExpress(`/admin/api/content/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
```

- [ ] **Step 2: Get one, update, soft-delete**

```ts
// apps/web/app/admin/api/content/[type]/[id]/route.ts
import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { configFor } from "@/lib/admin-content/configs";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const upstream = await callExpress(`/admin/api/content/${type}/${id}`, { method: "GET" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const body = await request.text();
  const upstream = await callExpress(`/admin/api/content/${type}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const upstream = await callExpress(`/admin/api/content/${type}/${id}`, { method: "DELETE" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
```

- [ ] **Step 3: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors; confirm `/admin/api/content/[type]` and `/admin/api/content/[type]/[id]` are both registered as dynamic routes. This is the first dynamic-segment Route Handler in this codebase — if the build errors on the `params: Promise<...>` typing, re-read this plan's Global Constraints note on async params and the installed `next` package's own `15-route-handlers.md` doc before changing anything.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/admin/api/content"
git commit -m "feat(web): add generic content CRUD BFF proxy (list/create/get/update/delete)"
```

---

## Task 5: Generic content BFF proxy — approve, reject, reorder

**Files:**
- Create: `apps/web/app/admin/api/content/[type]/[id]/approve/route.ts`
- Create: `apps/web/app/admin/api/content/[type]/[id]/reject/route.ts`
- Create: `apps/web/app/admin/api/content/[type]/reorder/route.ts`

**Interfaces:**
- Consumes: `callExpress`, `parseJsonSafe` (Plan 3a); `configFor` (Task 1).
- Produces: `POST /admin/api/content/[type]/[id]/approve`, `POST /admin/api/content/[type]/[id]/reject`, `PATCH /admin/api/content/[type]/reorder`.

All three are superadmin-effective on the Express side (`approve`/`reject` throw `ForbiddenActionError`/403 for a non-superadmin; `reorder` is `requireRole("superadmin")` at the route level) — this plan's BFF layer does no role-checking of its own, it only proxies; Task 7/9's UI hides these controls for a non-superadmin using Task 2's `/me` role, but the 403 these return if reached anyway must render cleanly (see Task 7/8's error handling).

- [ ] **Step 1: Approve**

```ts
// apps/web/app/admin/api/content/[type]/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { configFor } from "@/lib/admin-content/configs";

export async function POST(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const upstream = await callExpress(`/admin/api/content/${type}/${id}/approve`, { method: "POST" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
```

- [ ] **Step 2: Reject**

```ts
// apps/web/app/admin/api/content/[type]/[id]/reject/route.ts
import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { configFor } from "@/lib/admin-content/configs";

export async function POST(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const body = await request.text();
  const upstream = await callExpress(`/admin/api/content/${type}/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
```

- [ ] **Step 3: Reorder**

```ts
// apps/web/app/admin/api/content/[type]/reorder/route.ts
import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { configFor } from "@/lib/admin-content/configs";

export async function PATCH(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const body = await request.text();
  const upstream = await callExpress(`/admin/api/content/${type}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
```

- [ ] **Step 4: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors; confirm all three routes registered.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/admin/api/content"
git commit -m "feat(web): add approve/reject/reorder BFF proxy for generic content"
```

---

## Task 6: Uploads BFF proxy

**Files:**
- Create: `apps/web/app/admin/api/uploads/route.ts`

**Interfaces:**
- Consumes: `callExpress` (Plan 3a) — NOT `parseJsonSafe` for the request body (this is a multipart passthrough, not JSON in), but still used for the response.
- Produces: `POST /admin/api/uploads` → `{ url: string }` or a 4xx/502 error body.

`callExpress`'s `init.body` accepts anything `fetch` accepts, including a `FormData` — no change needed to `callExpress` itself. The browser's own `multipart/form-data` boundary header is set automatically when `fetch` is given a `FormData` body directly; do not set a `Content-Type` header manually here, or the boundary will be wrong and Express's `multer` will fail to parse it.

- [ ] **Step 1: Implement the Route Handler**

```ts
// apps/web/app/admin/api/uploads/route.ts
import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";

export async function POST(request: Request) {
  const formData = await request.formData();
  const upstream = await callExpress("/admin/api/uploads", {
    method: "POST",
    body: formData,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
```

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors, `/admin/api/uploads` registered. Full behavioral verification (a real image upload) happens in this plan's Final Verification checklist against a running backend with real Cloudinary credentials.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/api/uploads
git commit -m "feat(web): add uploads BFF proxy"
```

---

## Task 7: List page

**Files:**
- Create: `apps/web/app/admin/(protected)/content/[type]/page.tsx`

**Interfaces:**
- Consumes: `configFor` (Task 1); `Table`, `StatusBadge`, `ErrorBanner`, `Modal` (Task 3); `GET /admin/api/content/[type]`, `POST /admin/api/content/[type]/[id]/approve`, `POST /admin/api/content/[type]/[id]/reject`, `DELETE /admin/api/content/[type]/[id]` (Tasks 4-5); `GET /admin/api/auth/me` (Task 2).
- Produces: `/admin/content/[type]` — the landing page for each content type, linked from later nav work (Plans 3b/3c's shared nav is out of scope here; this page is reachable by URL for this plan's own verification).

Search and status-filter state lives in the URL (`?status=&q=`), so a bookmarked/shared filtered view works and the back button behaves correctly — this requires `useSearchParams()`, which requires the Suspense split from this plan's Global Constraints.

- [ ] **Step 1: Implement the page**

```tsx
// apps/web/app/admin/(protected)/content/[type]/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { configFor } from "@/lib/admin-content/configs";
import { Table } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Modal } from "@/components/admin/Modal";

interface ContentRecord {
  id: string;
  approvalStatus: string;
  rejectionReason?: string | null;
  [key: string]: unknown;
}

const STATUS_OPTIONS = ["", "draft", "pending_approval", "published", "rejected"] as const;

function ContentListForType() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = params.type;
  const config = configFor(type);

  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  const [role, setRole] = useState<string | null>(null);
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ContentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRecords = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    const res = await fetch(`/admin/api/content/${type}${qs.toString() ? `?${qs}` : ""}`);
    const data = await res.json();
    if (!res.ok) {
      // On a non-ok response, `data` is always the error object (never the
      // records array) -- res.ok being false is exactly what routes here.
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : "Could not load records.");
      setRecords([]);
    } else {
      setRecords(data as ContentRecord[]);
    }
    setLoading(false);
  }, [config, type, status, q]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/admin/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
      }
    })();
  }, []);

  function updateFilter(key: "status" | "q", value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    router.push(`/admin/content/${type}?${qs.toString()}`);
  }

  async function handleApprove(record: ContentRecord) {
    const res = await fetch(`/admin/api/content/${type}/${record.id}/approve`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : data?.message ?? "Could not approve this record.");
      if (res.status === 409) fetchRecords();
      return;
    }
    fetchRecords();
  }

  async function handleReject() {
    if (!rejectTarget) return;
    const res = await fetch(`/admin/api/content/${type}/${rejectTarget.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setRejectTarget(null);
    setRejectReason("");
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : data?.message ?? "Could not reject this record.");
      if (res.status === 409) fetchRecords();
      return;
    }
    fetchRecords();
  }

  async function handleDelete(record: ContentRecord) {
    if (!window.confirm(`Delete this ${config?.displayName.toLowerCase()}? It can be restored from Trash later.`)) return;
    const res = await fetch(`/admin/api/content/${type}/${record.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error === "forbidden" ? "You don't have permission for this action." : "Could not delete this record.");
      return;
    }
    fetchRecords();
  }

  if (!config) {
    return <ErrorBanner message={`Unknown content type "${type}".`} />;
  }

  const isSuperadmin = role === "superadmin";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">{config.displayNamePlural}</h1>
        <Link
          href={`/admin/content/${type}/new`}
          className="border-2 border-ink px-6 py-3 font-display text-ink hover:bg-ink hover:text-paper"
        >
          New {config.displayName.toLowerCase()}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search..."
          defaultValue={q}
          onBlur={(e) => updateFilter("q", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("q", (e.target as HTMLInputElement).value);
          }}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="h-11 border border-ink/20 bg-paper px-3.5 font-body text-ink"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All statuses" : opt.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : (
        <Table
          columns={[
            ...config.listColumns.map((col) => ({ key: col.key, label: col.label })),
            {
              key: "approvalStatus",
              label: "Status",
              render: (row: ContentRecord) => <StatusBadge status={row.approvalStatus} />,
            },
          ]}
          rows={records}
          renderActions={(row) => (
            <div className="flex justify-end gap-2">
              <Link href={`/admin/content/${type}/${row.id}`} className="font-body text-sm text-olive-ink underline">
                Edit
              </Link>
              {isSuperadmin && row.approvalStatus === "pending_approval" && (
                <>
                  <button type="button" onClick={() => handleApprove(row)} className="font-body text-sm text-olive-ink underline">
                    Approve
                  </button>
                  <button type="button" onClick={() => setRejectTarget(row)} className="font-body text-sm text-ink underline">
                    Reject
                  </button>
                </>
              )}
              <button type="button" onClick={() => handleDelete(row)} className="font-body text-sm text-ink underline">
                Delete
              </button>
            </div>
          )}
          emptyMessage={`No ${config.displayNamePlural.toLowerCase()} yet.`}
        />
      )}

      {rejectTarget && (
        <Modal title={`Reject this ${config.displayName.toLowerCase()}`} onClose={() => setRejectTarget(null)}>
          <label className="mb-4 block font-body text-sm text-ink">
            Reason
            <textarea
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1 block w-full border border-ink/20 bg-paper p-3 font-body text-ink focus:border-olive-ink focus:outline-none"
              rows={3}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRejectTarget(null)} className="border-2 border-ink px-6 py-3 font-display text-ink">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={!rejectReason}
              className="bg-gold px-6 py-3 font-display text-ink disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ContentListPage() {
  return (
    <Suspense fallback={<p className="font-body text-sm text-slate">Loading…</p>}>
      <ContentListForType />
    </Suspense>
  );
}
```

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors, `/admin/content/[type]` registered. Full behavioral verification happens in this plan's Final Verification checklist against a running backend.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/admin/(protected)/content"
git commit -m "feat(web): add generic content list page (filters, approve/reject/delete)"
```

---

## Task 8: Create/Edit form page

**Files:**
- Create: `apps/web/components/admin/ImageUploadField.tsx`
- Create: `apps/web/components/admin/ContentForm.tsx`
- Create: `apps/web/app/admin/(protected)/content/[type]/new/page.tsx`
- Create: `apps/web/app/admin/(protected)/content/[type]/[id]/page.tsx`

**Interfaces:**
- Consumes: `configFor`, `FieldConfig` (Task 1); `ErrorBanner` (Task 3); `GET/POST/PATCH /admin/api/content/[type]` and `/[id]` (Task 4); `POST /admin/api/uploads` (Task 6).
- Produces: `/admin/content/[type]/new`, `/admin/content/[type]/[id]`.

Both pages render the same `ContentForm`, one with no `initialValues`/`recordId` (create) and one that fetches the record first (edit). The record's own submit always sends every configured field — no partial/dirty-only diffing, keeping this generic across five very different shapes.

- [ ] **Step 1: Image upload field**

```tsx
// apps/web/components/admin/ImageUploadField.tsx
"use client";

import { useRef, useState } from "react";

/**
 * Extends PlaceholderPhoto's empty-frame-with-corner-marks treatment
 * (components/PlaceholderPhoto.tsx) as an interactive dropzone: drag-over
 * shifts the border to Olive Ink (matching DESIGN.md's input focus
 * language), and a successful upload swaps the frame for the real image.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/admin/api/uploads", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      const messages: Record<string, string> = {
        file_too_large: "That file is too large (5MB max).",
        invalid_file_type: "Only JPEG, PNG, and WebP images are allowed.",
        no_file: "No file was received.",
        upload_failed: "Upload failed. Please try again.",
      };
      setError(messages[data?.error] ?? "Upload failed. Please try again.");
      return;
    }
    onChange(data.url);
  }

  return (
    <div>
      <label className="mb-1 block font-body text-sm text-ink">
        {label}
        {required && " *"}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) uploadFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex aspect-[4/3] max-w-xs cursor-pointer items-center justify-center overflow-hidden border bg-paper-dim ${
          dragOver ? "border-2 border-olive-ink" : "border-ink/12"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
            {uploading ? "Uploading…" : "Click or drag an image"}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
      </div>
      {error && <p role="alert" className="mt-1 font-body text-sm text-ink">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Generic content form**

```tsx
// apps/web/components/admin/ContentForm.tsx
"use client";

import { useState } from "react";
import type { ContentTypeConfig } from "@/lib/admin-content/types";
import { ImageUploadField } from "./ImageUploadField";
import { ErrorBanner } from "./ErrorBanner";

export type FormValues = Record<string, string | number | boolean>;

function defaultValueFor(type: string): string | number | boolean {
  if (type === "boolean") return false;
  if (type === "number") return "";
  return "";
}

export function ContentForm({
  config,
  initialValues,
  onSubmit,
  submitLabel,
}: {
  config: ContentTypeConfig;
  initialValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<{ fieldErrors?: Record<string, string>; generalError?: string } | void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of config.fields) {
      initial[field.name] = initialValues?.[field.name] ?? defaultValueFor(field.type);
    }
    return initial;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(name: string, value: string | number | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
    if (result?.generalError) setGeneralError(result.generalError);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {generalError && (
        <div className="mb-4">
          <ErrorBanner message={generalError} />
        </div>
      )}
      <div className="flex flex-col gap-5">
        {config.fields.map((field) => {
          const error = fieldErrors[field.name];
          const fieldId = `field-${field.name}`;
          if (field.type === "image") {
            return (
              <ImageUploadField
                key={field.name}
                label={field.label}
                required={field.required}
                value={String(values[field.name] ?? "")}
                onChange={(url) => setField(field.name, url)}
              />
            );
          }
          if (field.type === "boolean") {
            return (
              <label key={field.name} className="flex items-center gap-2 font-body text-sm text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => setField(field.name, e.target.checked)}
                />
                {field.label}
              </label>
            );
          }
          return (
            <div key={field.name}>
              <label htmlFor={fieldId} className="mb-1 block font-body text-sm text-ink">
                {field.label}
                {field.required && " *"}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={fieldId}
                  required={field.required}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => setField(field.name, e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fieldId}-error` : undefined}
                  className={`block w-full border bg-paper p-3 font-body text-ink focus:outline-none ${
                    error ? "border-2 border-ink" : "border-ink/20 focus:border-olive-ink"
                  }`}
                  rows={4}
                />
              ) : (
                <input
                  id={fieldId}
                  type={field.type === "number" ? "number" : "text"}
                  required={field.required}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) =>
                    setField(field.name, field.type === "number" ? e.target.valueAsNumber : e.target.value)
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fieldId}-error` : undefined}
                  className={`block h-11 w-full border bg-paper px-3.5 font-body text-ink focus:outline-none ${
                    error ? "border-2 border-ink" : "border-ink/20 focus:border-olive-ink"
                  }`}
                />
              )}
              {field.helpText && !error && <p className="mt-1 font-body text-xs text-slate">{field.helpText}</p>}
              {error && (
                <p id={`${fieldId}-error`} role="alert" className="mt-1 font-body text-sm text-ink">
                  <span aria-hidden="true" className="stamp-rotate inline-block mr-1">◆</span>
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 bg-gold px-6 py-3.5 font-display text-ink disabled:opacity-50"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create page**

```tsx
// apps/web/app/admin/(protected)/content/[type]/new/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { configFor } from "@/lib/admin-content/configs";
import { ContentForm, type FormValues } from "@/components/admin/ContentForm";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

interface ZodIssue {
  path: (string | number)[];
  message: string;
}

export default function NewContentPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type;
  const config = configFor(type);

  if (!config) {
    return <ErrorBanner message={`Unknown content type "${type}".`} />;
  }

  async function handleSubmit(values: FormValues) {
    const res = await fetch(`/admin/api/content/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/admin/content/${type}`);
      return;
    }
    if (data?.error === "invalid_request") {
      const fieldErrors: Record<string, string> = {};
      for (const issue of (data.issues ?? []) as ZodIssue[]) {
        if (typeof issue.path[0] === "string") fieldErrors[issue.path[0]] = issue.message;
      }
      return { fieldErrors };
    }
    if (data?.error === "slug_conflict") {
      return { generalError: data.message ?? "That slug is already in use." };
    }
    return { generalError: "Could not save. Please try again." };
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">New {config.displayName.toLowerCase()}</h1>
      <ContentForm config={config} onSubmit={handleSubmit} submitLabel="Create" />
    </div>
  );
}
```

- [ ] **Step 4: Edit page**

```tsx
// apps/web/app/admin/(protected)/content/[type]/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { configFor } from "@/lib/admin-content/configs";
import { ContentForm, type FormValues } from "@/components/admin/ContentForm";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

interface ZodIssue {
  path: (string | number)[];
  message: string;
}

export default function EditContentPage() {
  const params = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const { type, id } = params;
  const config = configFor(type);

  const [initialValues, setInitialValues] = useState<FormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    (async () => {
      const res = await fetch(`/admin/api/content/${type}/${id}`);
      if (res.status === 404) {
        setLoadError("This record no longer exists. It may have been deleted.");
        return;
      }
      if (!res.ok) {
        setLoadError("Could not load this record.");
        return;
      }
      const data = await res.json();
      const values: FormValues = {};
      for (const field of config.fields) {
        values[field.name] = data[field.name] ?? (field.type === "boolean" ? false : "");
      }
      setInitialValues(values);
    })();
  }, [config, type, id]);

  if (!config) {
    return <ErrorBanner message={`Unknown content type "${type}".`} />;
  }

  if (loadError) {
    return (
      <div>
        <ErrorBanner message={loadError} />
        <button
          type="button"
          onClick={() => router.push(`/admin/content/${type}`)}
          className="mt-4 border-2 border-ink px-6 py-3 font-display text-ink"
        >
          Back to {config.displayNamePlural.toLowerCase()}
        </button>
      </div>
    );
  }

  async function handleSubmit(values: FormValues) {
    const res = await fetch(`/admin/api/content/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/admin/content/${type}`);
      return;
    }
    if (data?.error === "invalid_request") {
      const fieldErrors: Record<string, string> = {};
      for (const issue of (data.issues ?? []) as ZodIssue[]) {
        if (typeof issue.path[0] === "string") fieldErrors[issue.path[0]] = issue.message;
      }
      return { fieldErrors };
    }
    if (data?.error === "slug_conflict") {
      return { generalError: data.message ?? "That slug is already in use." };
    }
    if (data?.error === "invalid_state" || data?.error === "not_found") {
      return { generalError: "This record changed since you loaded it. Go back and try again." };
    }
    return { generalError: "Could not save. Please try again." };
  }

  if (!initialValues) {
    return <p className="font-body text-sm text-slate">Loading…</p>;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">Edit {config.displayName.toLowerCase()}</h1>
      <ContentForm config={config} initialValues={initialValues} onSubmit={handleSubmit} submitLabel="Save" />
    </div>
  );
}
```

- [ ] **Step 5: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors, both routes registered. Full behavioral verification happens in Final Verification.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/admin/ImageUploadField.tsx apps/web/components/admin/ContentForm.tsx "apps/web/app/admin/(protected)/content"
git commit -m "feat(web): add generic content create/edit form pages"
```

---

## Task 9: Drag-to-reorder

**Files:**
- Modify: `apps/web/app/admin/(protected)/content/[type]/page.tsx`

**Interfaces:**
- Consumes: `IconDragHandle` (Task 3); `PATCH /admin/api/content/[type]/reorder` (Task 5).

Superadmin-only (matches the backend's own `requireRole("superadmin")` gate on this endpoint) and only meaningful for types that actually have an `order` field in their config (Service, BlogPost, Faq, InstagramPost — Testimonial has no `order` field, confirmed against its schema in Task 1). Uses native HTML5 drag-and-drop (`draggable`, `onDragStart`/`onDragOver`/`onDrop`) — no new dependency.

- [ ] **Step 1: Add reordering to the list page**

In `apps/web/app/admin/(protected)/content/[type]/page.tsx` (from Task 7), make these changes:

Add to the imports:

```tsx
import { IconDragHandle } from "@/components/icons";
```

Add a helper (module scope, alongside `STATUS_OPTIONS`) to determine reorderability from the config itself, not a hardcoded type list:

```tsx
function isReorderable(fields: { name: string }[]): boolean {
  return fields.some((f) => f.name === "order");
}
```

Add drag-state and handlers inside `ContentListForType`, alongside the other `useState` calls:

```tsx
const [draggedId, setDraggedId] = useState<string | null>(null);

async function handleDrop(targetId: string) {
  if (!draggedId || draggedId === targetId) {
    setDraggedId(null);
    return;
  }
  const fromIndex = records.findIndex((r) => r.id === draggedId);
  const toIndex = records.findIndex((r) => r.id === targetId);
  if (fromIndex === -1 || toIndex === -1) {
    setDraggedId(null);
    return;
  }
  const reordered = [...records];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  setRecords(reordered); // optimistic
  setDraggedId(null);

  const res = await fetch(`/admin/api/content/${type}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: reordered.map((r, i) => ({ id: r.id, order: i })) }),
  });
  if (!res.ok) {
    setError("Could not save the new order. Reloading the list.");
    fetchRecords();
  }
}
```

Replace the `<Table ... />` call's `columns` prop to conditionally prepend a drag-handle column when `isSuperadmin && isReorderable(config.fields)`, and wrap each row's rendering to support drag events. Since `Table` (Task 3) doesn't take per-row drag props directly, render the reorderable case with a small dedicated markup block instead of `Table` when reordering is active for this type and role — replace the existing:

```tsx
      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : (
        <Table
```

with:

```tsx
      {loading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : isSuperadmin && isReorderable(config.fields) ? (
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left">
              <th className="py-2 pr-2" />
              {config.listColumns.map((col) => (
                <th key={col.key} className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
                  {col.label}
                </th>
              ))}
              <th className="py-2 pr-4 font-stamp text-[0.7rem] uppercase tracking-wide text-slate">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {records.map((row) => (
              <tr
                key={row.id}
                draggable
                onDragStart={() => setDraggedId(row.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(row.id)}
                className={`border-b border-ink/10 ${draggedId === row.id ? "stamp-rotate opacity-70" : ""}`}
              >
                <td className="py-3 pr-2 cursor-grab text-slate">
                  <IconDragHandle className="h-5 w-5" />
                </td>
                {config.listColumns.map((col) => (
                  <td key={col.key} className="py-3 pr-4 align-top text-ink">
                    {String(row[col.key] ?? "")}
                  </td>
                ))}
                <td className="py-3 pr-4 align-top">
                  <StatusBadge status={row.approvalStatus} />
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/content/${type}/${row.id}`} className="font-body text-sm text-olive-ink underline">
                      Edit
                    </Link>
                    {row.approvalStatus === "pending_approval" && (
                      <>
                        <button type="button" onClick={() => handleApprove(row)} className="font-body text-sm text-olive-ink underline">
                          Approve
                        </button>
                        <button type="button" onClick={() => setRejectTarget(row)} className="font-body text-sm text-ink underline">
                          Reject
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => handleDelete(row)} className="font-body text-sm text-ink underline">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Table
```

(The existing `<Table ... />` call and its closing `)}` stay as the final `else` branch, unchanged, for the non-reorderable/non-superadmin case.)

- [ ] **Step 2: Manually verify**

Run `npm run build --workspace=apps/web` — expect no TypeScript errors. Run `npm run test --workspace=apps/web` — expect the same tests from Tasks 1-2 still passing (this task adds no automated tests; drag interaction is manually verified in Final Verification).

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/admin/(protected)/content"
git commit -m "feat(web): add superadmin drag-to-reorder on the generic content list"
```

---

## Final verification (do this once, after all 9 tasks)

- [ ] Run `npm run test --workspace=apps/web` — every test passing (23 total: 15 already passing from Plan 3a, plus 5 new from Task 1 and 3 new from Task 2 — confirm the actual running total matches what the task-by-task commits produced, rather than assuming this number if it drifts).
- [ ] Run `npm run build --workspace=apps/web` — compiles cleanly, no TypeScript errors, no Edge-runtime warnings.
- [ ] Run `npm run typecheck --workspace=apps/api` and `npm run test --workspace=apps/api` — confirm this plan didn't touch or break the backend (it shouldn't have modified any `apps/api` file).
- [ ] Start the real Express backend and Next.js dev server (`apps/web/.env.local`'s `API_BASE_URL` pointed at the running Express instance), with real Cloudinary credentials in `apps/api/.env` for the upload test.
- [ ] For at least one type with every field kind (Service — text, textarea, image, boolean, number): create a new record as an editor account → confirm it lands as `pending_approval`, appears in the list with that badge. Log in as a superadmin → approve it → confirm the badge updates to `published`. Create a second record as the editor → reject it with a reason as the superadmin → confirm the badge shows `rejected` and the reason is visible somewhere in the edit form.
- [ ] Create a record as a superadmin directly → confirm it lands as `published` immediately (no pending state).
- [ ] Trigger a Zod validation failure (e.g. submit Service with no `name`) → confirm the error renders on the correct field, not as a generic banner.
- [ ] Trigger a slug conflict (two Services with the same slug) → confirm the specific conflict message renders, not a generic failure.
- [ ] Upload a real image on a Service's `image` field → confirm it renders in the dropzone after upload and the field's value is a real Cloudinary URL. Attempt an oversized file and a non-image file → confirm each shows its own distinct message.
- [ ] As a superadmin, drag-reorder at least 3 Faq records → confirm the new order persists after a page reload. Confirm the drag handle does NOT appear for Testimonial (no `order` field) or for an editor account viewing any type.
- [ ] Soft-delete a record → confirm it disappears from the list immediately and there is no way to see or restore it from this plan's own screens (expected — Trash is Plan 3c).
- [ ] Log in as an editor and confirm Approve/Reject/reorder controls never render anywhere, for any type.
- [ ] Push the branch and open a PR against `gate-2-admin-panel` using `gh pr create`.
