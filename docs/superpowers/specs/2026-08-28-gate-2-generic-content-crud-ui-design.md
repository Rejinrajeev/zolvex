# Gate 2 Frontend — Generic Content CRUD UI — Design

## Problem statement

Plan 3a built the admin panel's auth UI and an empty authenticated shell. Editors and superadmins have nowhere yet to actually manage the five approvable content types (Service, BlogPost, Testimonial, Faq, InstagramPost) that Plan 2's backend already fully supports (`/admin/api/content/:type/**`, ground-truthed below). This plan (3b) builds that surface: one generic, config-driven list/create/edit/reorder/approve/reject UI serving all five types identically, plus the image-upload flow they share.

## Scope

**In scope:** the generic per-type CRUD screens (list, create, edit, reorder, approve, reject) for exactly the five types the backend's `CONTENT_TYPES` allowlist defines, and the shared image-upload component they use.

**Explicitly out of scope, deferred to Plan 3c** (per user decision during brainstorming): the cross-type Approvals dashboard (`GET /admin/api/dashboard/approvals`), Places, PageContent editor, Enquiries, Trash, Audit Log, Sessions, and Users screens — all "bespoke" per the parent spec's own section split, none sharing this plan's generic config-driven shape.

## Backend contract (ground-truthed against Plan 2's actual shipped code, not the parent spec's prose)

All endpoints below already exist and are tested in `apps/api`; this plan adds no backend code.

- `CONTENT_TYPES = ["service", "blog-post", "testimonial", "faq", "instagram-post"]` (`apps/api/src/controllers/admin/content.schemas.ts`) — the exact five route-param values, one-to-one with the five generic types.
- Routes, all under `/admin/api/content` and all `requireAuth` (superadmin or editor) except `reorder`, which additionally `requireRole("superadmin")`:
  - `GET /:type?status=<ApprovalStatus>&q=<search>` → array of raw Prisma records (`contentListView` is presently a pure passthrough — no field renaming/shaping happens server-side).
  - `GET /:type/:id` → single record, 404 if soft-deleted or missing.
  - `POST /:type` → creates; body validated against a **named per-type Zod schema** (below), never auto-derived from the client config. `approvalStatus` is set server-side by `ApprovableResourceService.statusFor(actor)` — `"published"` for a superadmin, `"pending_approval"` for anyone else. **There is no draft path**: the parent spec's prose mentions "or Save Draft," but `statusFor` only ever returns those two values — ground-truth correction, ship one submit action per form, not two.
  - `PATCH /:type/:id` → updates; same per-type schema (partial). Editing a `published` record resets it to `pending_approval` if the editor isn't a superadmin (`approvalReset` in the service) — the edit form must not imply an instant re-publish for a non-superadmin.
  - `DELETE /:type/:id` → soft-delete (sets `deletedAt`), returns the updated record.
  - `POST /:type/:id/restore` → clears `deletedAt`; a `SlugConflictError` (409, `Service` only) must render as a specific, actionable message, not a generic failure.
  - `POST /:type/:id/approve` → superadmin-effective action (service throws `ForbiddenActionError`/403 for a non-superadmin caller — the UI must not even show the control to an editor). 409 (`invalid_state`) if the record isn't currently `pending_approval`.
  - `POST /:type/:id/reject {reason}` → same actor gating as approve; `reason` is required (`z.string().min(1)`).
  - `PATCH /:type/reorder {items: [{id, order}]}` → superadmin-only at the route level; returns the updated list.
- `POST /admin/api/uploads` (multipart, field name `file`) → `{ url: string }` on success. Server re-validates MIME type (`image/jpeg`, `image/png`, `image/webp`) and size (5MB) even though the client should already have checked both; a `400 file_too_large` / `400 invalid_file_type` / `400 no_file` / `502 upload_failed` are all distinct, user-facing failure modes, not one generic error.
- Per-type field schemas (exact — the create/edit form's field list, types, and validation come directly from these, not a redesigned shape):
  - **Service**: `name` (required, ≤200), `slug` (required, ≤200), `shortDescription` (required, ≤500), `fullDescription` (required, ≤5000, textarea), `image` (optional, url), `icon` (optional, ≤200), `isHighlighted` (optional, boolean), `order` (optional, int), `isActive` (optional, boolean), `metaTitle` (optional, ≤200), `metaDescription` (optional, ≤500), `ogImage` (optional, url).
  - **BlogPost**: `title` (required, ≤200), `image` (required, url), `instagramUrl` (required, url), `order` (optional, int), `isActive` (optional, boolean).
  - **Testimonial**: `name` (required, ≤200), `rating` (required, int 1–5), `message` (required, ≤2000, textarea), `isFeatured` (optional, boolean), `isActive` (optional, boolean).
  - **Faq**: `question` (required, ≤500), `answer` (required, ≤5000, textarea), `order` (optional, int), `isActive` (optional, boolean).
  - **InstagramPost**: `image` (required, url), `permalink` (required, url), `order` (optional, int), `isActive` (optional, boolean).
- Every record (any type) also carries, read-only in the UI: `id`, `approvalStatus`, `submittedBy`, `approvedBy`, `approvedAt`, `rejectionReason`, `deletedAt`, `createdAt`, `updatedAt` — the list table and edit form surface the relevant subset (approvalStatus always; rejectionReason only when status is `rejected`) but never let these be hand-edited.

## Architecture

- **Config-driven, one file per type**: `apps/web/lib/admin-content/types.ts` defines the shared `ContentTypeConfig` shape (route segment, display name, list columns, field defs); `apps/web/lib/admin-content/configs/{service,blog-post,testimonial,faq,instagram-post}.ts` each export one config literal built directly from the schemas above. A single `configs/index.ts` maps route-param string → config, mirroring the backend's own `CONTENT_TYPES`/`TYPE_TO_DELEGATE` split so the two allowlists can be diffed against each other by inspection.
- **Pages**, all inside Plan 3a's `app/admin/(protected)/` route group (so they inherit the authenticated shell + its logout button, and are covered by Task 10's middleware gate automatically):
  - `app/admin/(protected)/content/[type]/page.tsx` — list.
  - `app/admin/(protected)/content/[type]/new/page.tsx` — create.
  - `app/admin/(protected)/content/[type]/[id]/page.tsx` — edit.
  - A `[type]` that isn't in the config map (mistyped URL) renders Next.js's `notFound()`, not a runtime crash.
- **BFF proxy**: `app/admin/api/content/[type]/route.ts` (GET list / POST create), `app/admin/api/content/[type]/[id]/route.ts` (GET one / PATCH update / DELETE soft-delete), `.../[id]/restore/route.ts`, `.../[id]/approve/route.ts`, `.../[id]/reject/route.ts`, `.../reorder/route.ts` — every one a thin `callExpress` passthrough (Plan 3a Task 3), validating only that `type` is a known config key before forwarding (the real validation is Express's named Zod schema; this layer's job is routing, not re-validating). `X-Forwarded-For` relay is **not** needed here — these endpoints aren't behind Express's login/2FA rate limiters (`content.routes.ts` carries no `rateLimit` middleware), so Plan 3a's relay pattern doesn't apply; confirm this against `apps/api/src/routes/admin/content.routes.ts` at implementation time rather than copying the auth-routes pattern reflexively.
- **Uploads proxy**: `app/admin/api/uploads/route.ts` — relays a multipart `FormData` body to Express's `/admin/api/uploads` via `callExpress`, returning `{ url }`.
- **Role-aware UI, not role-aware routing**: the same list/edit pages render for both roles. The client needs to know the caller's role to decide which controls to show at all (an editor should never even see an "Approve" button). This plan adds no backend code (see Backend contract above), so the role comes from the JWT the BFF already holds, not a new Express endpoint: a new `app/admin/api/auth/me/route.ts` reads the `admin_access_token` cookie via Plan 3a's `getAccessToken()`, base64url-decodes the JWT's payload segment (no signature check needed — this is a same-origin, server-side read of a token this app's own server already trusts for every proxied call; it's a UI hint, not a security boundary), and returns `{ role }` (401 if no access token). The protected layout fetches this once and passes the role down. Approve/reject/reorder controls hide when the role isn't `superadmin`; server-side `requireRole`/`ForbiddenActionError` (403) remains the actual enforcement boundary regardless — the UI hiding a control is a UX nicety, never the security control, and the 403 error-handling path above exists specifically because hiding isn't sufficient on its own (a stale page, a second tab, a demoted role).

## Visual design (extends `DESIGN.md`, doesn't replace it)

Tailwind v4 and the three brand fonts are already wired into `apps/web`'s root layout (confirmed: `@theme inline` in `app/globals.css` exposes `--color-ink`/`-paper`/`-olive`/`-olive-ink`/`-slate`/`-gold` and `--font-display`/`-body`/`-stamp`; `next/font/google` loads Zilla Slab/Archivo/Special Elite in `app/layout.tsx`, which wraps every route including `/admin/**`). This plan is additive to that system, not a new one:

- **List table** — square corners, `border-ink/10` hairlines between rows (no zebra striping, no box-shadow — matching the system's flat, border-driven depth language). This is the ledger metaphor's most natural extension: rows as ledger entries.
- **Approval-status badges** — reuse the existing "logged" text role directly: `font-stamp` (Special Elite), uppercase, tracked. `published` → gold; `pending_approval` → olive-ink; `rejected` → the existing 2px-border + `◆` error convention (the palette has no red, by design); `draft` → slate (present in the enum for completeness, even though no create/update path ever sets it today).
- **Forms** — `DESIGN.md`'s existing input spec applies verbatim: 44px min height, square corners, `border-ink/20`, Olive Ink focus border (no glow/ring), and its established error state (2px solid border + `stamp-rotate`d `◆` + `role="alert"` message via `aria-describedby`) for every Zod validation failure, field-level.
- **Image upload** — extends the existing `PlaceholderPhoto` component's empty-frame-with-corner-marks treatment as the pre-upload dropzone; drag-over shifts the border to Olive Ink (the same visual language as input focus); a rejected file (wrong type/too large) or a failed upload uses the identical error convention as an invalid form field, not a new one.
- **Drag-to-reorder** — a new grip-handle icon, drawn to the existing icon spec (24×24 viewBox, 1.5px stroke, round caps/joins, `currentColor`) since none of the current icon set is a drag affordance. A row being dragged picks up the system's existing `stamp-rotate` tilt (already used for "picked up" ticket-card hover states) and settles flat (no rotation) on drop.
- **Modals** (reject-reason prompt, confirm-delete) — reuse the existing modal panel spec verbatim: 2px top border, H2 at `1.5rem`, `p-6`–`p-9` internal padding, no box-shadow.
- **New pattern, not yet in `DESIGN.md`**: an inline banner for save/upload failures that aren't field-level (e.g. a 502 from Cloudinary, a network error) — a full-width bordered strip (2px `border-ink`, `text-ink` on `bg-paper`), square corners, no shadow, consistent with the system's existing visual grammar but not previously specified. This plan documents it as a deliberate, narrow extension (matching how the system's own `◆` error-mark glyph was itself introduced as "a narrow, reviewed exception" for the public site) rather than freelancing a shadowed/rounded toast that would clash with the rest of the system.

## Error handling

- **Zod 400s** (`invalid_request`, with `issues`) render inline on the matching form field, keyed by the issue's `path` — mirrors the public `EnquiryModal`'s existing pattern per the parent spec.
- **409 `slug_conflict`** (Service only, on create/update/restore) surfaces the server's own message, not a generic "something went wrong."
- **409 `invalid_state`** (approve/reject on a non-`pending_approval` record, or any mutation on a soft-deleted record) surfaces the server's own message and triggers a list refresh, since it means the record's state already changed under the user (matching the parent spec's "already handled by X" guidance for the approvals case).
- **403 `forbidden`** (an editor's approve/reject somehow reaching the server despite the UI hiding the control — e.g. a stale page, a second tab with a demoted role) shows a plain "You don't have permission for this action" message and does not crash the page.
- **404 `not_found`** (editing a record deleted by someone else in another tab) redirects back to the list with a notice, rather than rendering a broken edit form.
- **Upload failures** (400s and the 502) render in the new inline banner (see Visual design), and the form remains editable with no partial/broken image reference ever saved — the record save is only enabled once a successful upload has returned a real URL, for any required `image`-type field.

## Testing

Matches Plan 3a's and the parent spec's already-established split: automated tests cover pure logic (the config modules' shape, the BFF proxy handlers' status-code/body mapping — reusing Plan 3a's `parseJsonSafe` for every one of them, same rationale: Express's error responses are always JSON here, but consistency with the established helper avoids re-introducing the exact bug Plan 3a's final review found), while the CRUD screens themselves (forms, table, drag-to-reorder, upload dropzone) are manually verified per this plan's own Final Verification checklist — real per-type create → edit → approve/reject → soft-delete → restore walkthroughs against the running backend, plus the reorder drag interaction and an intentionally-oversized/wrong-type file upload.

## Decisions made during brainstorming (for the record)

- Real visual design for this plan (not functional-only like Plan 3a), extending `DESIGN.md` rather than starting a separate admin design language, adapted directly by the implementer (no separate `/design-consultation` pass) given `DESIGN.md` and the underlying Tailwind/font setup already exist.
- The cross-type Approvals dashboard stays out of scope, deferred to Plan 3c with the other bespoke screens.
- **Ground-truth correction**: the parent spec's "an editor's submit creates the record as pending_approval (or Save Draft)" does not match the shipped `ApprovableResourceService.statusFor()`, which has no draft-producing path. One submit action per form; status is entirely server-determined by role.
