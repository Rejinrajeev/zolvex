# Gate 2: Admin Panel — Design

Status: approved (brainstormed and confirmed with the user 2026-08-25)
Parent design: `~/.gstack/projects/zolvex/rejin-unknown-design-20260823-221524.md` (approved 2026-08-23)
Depends on: the `foundation` branch (Prisma schema, `ApprovableResourceService`) merging in first.

## Problem statement

Zolvex's 3+ non-technical admin/editor staff need to manage every piece of content on the public site (services, blog posts, testimonials, FAQ, service areas, Instagram posts, and site-wide copy like hero text and the footer) without engineering support for routine changes, behind a governance stack (2FA, approval workflow, audit log, session revocation, trash/restore) that a multi-editor team publishing live content justifies from day one — this was explicitly decided (Approach B) in the parent design doc over a lighter phased alternative.

## Scope

**In scope for this spec:**
- Admin login with mandatory TOTP 2FA, account lockout, session management/revocation
- CRUD + approval workflow UI for Service, BlogPost, Testimonial, Faq, and a new InstagramPost content type; simple non-workflow CRUD for Place
- Image upload via Cloudinary
- PageContent editor (hero copy, footer, WhatsApp number, Google Review URL) — superadmin-only, no approval queue
- Cross-content Approvals dashboard, Audit Log viewer, Trash/restore
- Express API: routes/controllers/views (MVC) layer added on top of the existing Foundation service layer

**Explicitly out of scope** (per the parent design doc's Gate split and NOT-in-scope list):
- CRM push / enquiry pipeline (Gate 1 — separate sub-project, blocked on confirming the real CRM contract)
- Umami analytics deployment (Gate 1)
- Redis/BullMQ, real-time (Slack/websocket) notifications, SMS/email OTP — all rejected in the parent design doc
- Rebuilding anything Foundation already provides (see "What Foundation already provides" below)

## What Foundation already provides (verified in code, not just planned)

`apps/api/src/lib/services/approvable-resource.ts` (on the unmerged `foundation` branch) already implements, generically over any approvable model, fully tested (`approvable-resource.test.ts`, 558 lines):
- `create`, `update`, `softDelete`, `restore`, `approve`, `reject` (reject requires a reason)
- Every write wrapped in one transaction with its `AuditLog` row — atomicity already solved, not new work here
- The partial unique slug index + regression test guarding it (see the MIGRATION HAZARD comment in `schema.prisma`)
- The documented contract: callers must Zod-validate and allowlist request bodies before calling `create`/`update` — the service only denylists known workflow-control fields

Gate 2's job is the auth layer, the Express routing/controller/view skin around this service, the Prisma additions it doesn't yet have, and the entire admin UI — not re-deriving the governance logic itself.

## Architecture & layout

- **Admin panel lives inside `apps/web`**, a new `app/(admin)/` route group beside the existing public site — not a separate app or subdomain (per the parent design doc's Decision 1/8, already settled: same-origin only, a subdomain split is not a live option under the current auth architecture). Every admin action goes through a Next.js Route Handler under `app/(admin)/api/**` that proxies server-side to Express with the real session cookie, so the browser only ever talks to the Next.js origin and the httpOnly refresh cookie stays SameSite=Lax with no cross-origin CSRF surface to build against.
- **Express (`apps/api`) gets an explicit MVC layer added over the existing service layer:**
  - `routes/admin/*.ts` — thin: method + path + which controller function handles it.
  - `controllers/admin/*.ts` — parses/validates the request with a named Zod schema per content type (the allowlist the service's denylist depends on), calls the service/model layer, shapes the response via the view layer. New; doesn't exist yet.
  - **Model** = Prisma (`schema.prisma` + generated client) plus the domain services: the existing `lib/services/approvable-resource.ts` and a new `lib/services/auth.ts` (login/2FA/lockout/sessions).
  - **View** = new `views/admin/*.ts`: small pure functions mapping a Prisma record to its public JSON shape, keeping response formatting separate from controller logic even though there's no template rendering (a pure JSON API's closest equivalent to a view layer).
  - Two new middlewares: `requireAuth` (verifies the 15-minute access JWT) and `requireRole('superadmin')` (governance-only routes: PageContent, Sessions, Audit Log).
- **Process note**: work lands as feature branches pushed to `github.com/Rejinrajeev/zolvex` with PRs opened against `master` as each meaningful chunk completes, rather than one large local branch landed at the end.

## Data model changes

One new Prisma model, following the exact shape of `BlogPost`/`Testimonial` so it runs through the existing shared service unmodified:

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

No other schema changes are needed — `Admin`, `AdminSession`, `AuditLog`, `PageContent`, and the image-URL fields on `Service`/`BlogPost` already exist from Foundation.

## Auth & 2FA

This directly closes the tracked `TODOS.md` P1 item: `twoFASecret`/`twoFARecoveryCodes` must never be written in plaintext.

1. **Login step 1** — `POST /admin/api/auth/login {email, password}`: verify against `passwordHash` (bcrypt); check `isActive` and `lockedUntil`. A wrong password increments `failedLoginAttempts`; the 5th failure sets `lockedUntil` (15-minute lock). A correct password issues a short-lived (2 min), single-purpose pending-2FA token — not a real session.
2. **First-time 2FA setup** — an admin whose `twoFAEnabled` is `false` is routed to setup instead of a dashboard: `POST /admin/api/auth/2fa/setup` (authenticated only by the pending-2FA token) generates a TOTP secret via `otplib`, **encrypts it with AES-256-GCM under an app-level key (`ADMIN_2FA_ENCRYPTION_KEY` env var) before it ever touches the database**, returns a QR code (`otpauth://` URL) plus a one-time-shown set of recovery codes (bcrypt-hashed before storage). Submitting one valid TOTP code flips `twoFAEnabled = true`.
3. **Login step 2** — `POST /admin/api/auth/2fa/verify {code}`: decrypts the stored secret, verifies the TOTP code (small clock-skew window). Success issues the 15-minute access JWT, creates an `AdminSession` row (storing a **hash** of the refresh token, not the raw value), and sets the refresh token as an httpOnly, SameSite=Lax cookie. A lost-device path, `POST /admin/api/auth/2fa/recovery {code}`, checks against the hashed recovery codes and consumes the one used.
4. **Refresh** — `POST /admin/api/auth/refresh`: looks up the session by the hashed cookie value, checks `revokedAt IS NULL` and not expired, issues a new 15-minute access token. No refresh-token rotation (matching the parent design doc's model — revocation, not rotation, is the safety mechanism; a revoked admin's already-issued access token can remain valid for up to 15 minutes, an accepted documented tradeoff).
5. **Sessions UI** (superadmin-only, Governance nav group) — `GET /admin/api/sessions` lists every admin's active sessions (device info, IP, last-active); `POST /admin/api/sessions/:id/revoke` sets `revokedAt`.
6. **Logout** — clears the cookie and self-revokes the current session row.
7. **Login rate limiting** — a lighter IP-based rate limit on `/admin/api/auth/login` (no CAPTCHA — internal tool, small fixed admin roster, unlike the public-facing Gate 1 enquiry form).

## Generic resource-admin UI

**Correction from Foundation's actual code** (not just the plan): only `Service`, `BlogPost`, `Testimonial`, and `Faq` carry the `approvalStatus`/`submittedBy`/`approvedBy`/`rejectionReason` columns `ApprovableResourceService` operates on (`ENTITY_NAMES` in `approvable-resource.ts` maps exactly these four delegate names). `Place` has no approval-workflow columns at all — it's `id, name, isActive, order, deletedAt, createdAt` only, explicitly called out in the service's own comments as "gets its own simple non-approval CRUD handling in a later Gate task." The new `InstagramPost` model (below) is written with the full workflow shape, bringing the generic set to **five**, not six.

- **One config object per content type** (Service, BlogPost, Testimonial, Faq, InstagramPost), living in `apps/web`: display name, list columns, and field definitions for the create/edit form (type — text/textarea/number/boolean/select/image — label, required, help text). One generic set of routes reads this config: `/admin/content/[type]` (list), `/admin/content/[type]/new`, `/admin/content/[type]/[id]` (edit).
- **List view**: table built from the config's columns, filterable by `approvalStatus`, free-text search. All five types have an `order` field and get drag-to-reorder, persisted via one `PATCH .../reorder` call.
- **Create/edit form**: one input per configured field; an `image`-type field shows a drag-and-drop zone that uploads to `POST /admin/api/uploads` first (Cloudinary), storing the returned URL in form state before the record itself is saved.
- **Role-aware actions**: an editor's submit creates the record as `pending_approval` (or Save Draft); a superadmin's submit publishes directly, bypassing the queue (no confirm step, per the parent design doc). Approve/Reject (reason required) available inline per-record and from the Approvals dashboard.
- **Server side**: one generic route file (`/admin/api/content/:type/...`) where `:type` is checked against an explicit allowlist (`service | blog-post | testimonial | faq | instagram-post`), each mapping to its own **named Zod schema** (never auto-derived from the client config) and its own configured `ApprovableResourceService` instance.
- **Image upload endpoint**: `POST /admin/api/uploads` takes a file, pushes it to Cloudinary via their SDK, returns the resulting URL. Client-side size/type validation before attempting upload, re-validated server-side.

## Bespoke screens (don't fit the generic shape)

- **Places** — simple CRUD (`GET/POST /admin/api/places`, `PATCH/DELETE /admin/api/places/:id`, `POST /admin/api/places/:id/restore`) through a small dedicated `lib/services/place.ts` (no approval workflow — any admin, editor or superadmin, can add/edit/remove a service area immediately; still soft-delete + restore since `deletedAt` exists on the model). Foundation's own code comment anticipates this: `writeAudit` gets extracted from `ApprovableResourceService` into a shared free function (`writeAuditRow(tx, {entity, ...})` in a new `lib/services/audit.ts`) so `place.ts` writes a real `AuditLog` row too, inside the same transaction — Place stays fully governed even though it skips the approval queue.
- **PageContent editor** — one form per known `pageKey` (hero, footer, WhatsApp number, Google Review URL); superadmin-only, saves immediately, no approval queue.
- **Approvals dashboard** — the parent design doc's `UNION ALL` query across the five approvable content types, sorted/paginated server-side, not five separate queries merged client-side.
- **Enquiries** — read/status view over the `Enquiry` table (its own `EnquiryStatus` enum, not approval-workflow shaped). Read-only in this spec — the CRM push pipeline itself is Gate 1 scope.
- **Trash** — soft-deleted rows across the five approvable types plus Place, with restore; the slug-conflict case (`Service` restoring onto a slug another live record has since taken) surfaces as an explicit, actionable error, never a generic failure.
- **Audit Log** — read-only, filterable by entity/admin/date. Covers all five approvable types plus Place (via the shared `writeAuditRow` extraction above) and `PageContent` (its own superadmin-only edits also write an audit row, same shared function) — everything mutable in the admin panel is traceable.
- **Sessions** — see Auth & 2FA above.
- **Admin nav** grouped by task per the parent design doc's Decision 2: Content (the five generic types + Places + Pages), Enquiries & Approvals (top billing), Governance (Audit Log/Sessions/Trash, superadmin-only), Users.

## Error handling

- **Auth**: wrong password or wrong 2FA code both return a generic "invalid credentials" (no oracle for which step failed); the 5th failure returns "locked, try again in N minutes." An expired pending-2FA token bounces back to step 1. A revoked session's next refresh returns 401; the Next.js proxy redirects to login rather than surfacing a raw API error.
- **Content CRUD**: Zod failures return field-level 400s, rendered inline on the matching form field (mirroring the public enquiry modal's existing pattern). A slug conflict on `Service` is a 409 with a specific message. Approving/rejecting a record someone else already resolved is a 409 ("already handled by X"); the list refreshes rather than silently no-op'ing.
- **Image upload**: a Cloudinary failure shows a banner and leaves the form editable; the record is never saved with a partial/broken image reference, since upload must finish before submit.
- **CSRF**: covered by the same-origin, SameSite cookie design — no separate CSRF token scheme.
- **Audit-log atomicity**: already solved in Foundation (same transaction as the content write) — nothing new needed.

## Testing

- **Automated (required)**: the new auth service (login, lockout-after-5, TOTP setup/verify, recovery-code consumption, refresh-with-revoked-session fails, JWT expiry). Foundation's `approvable-resource.test.ts` already covers create/update/approve/reject/audit-log at the service layer — new coverage is scoped to what Gate 2 actually adds (auth, controllers, the new `InstagramPost` type's route wiring).
- **E2E (recommended)**: full login incl. 2FA challenge; superadmin revokes a session → that session's next refresh fails; editor submits → superadmin approves → content goes live; restore-on-slug-conflict shows the actionable error.
- **Manual (not automated)**: the CRUD screens themselves and content rendering — matches the parent design doc's existing decision not to over-automate UI that's still changing fast.

## Dependencies / setup required from the user

- **Cloudinary account** — user confirmed they already have one; cloud name / API key / API secret go into `apps/api/.env` when implementation reaches that step (never pasted into chat).
- **`ADMIN_2FA_ENCRYPTION_KEY`** — a new app-level secret to generate for encrypting TOTP secrets at rest.
- **Merging `foundation`** — this spec assumes the `foundation` branch has landed (its own step, not part of this spec's implementation plan).

## Decisions made during brainstorming (for the record)

- Generic resource-admin UI framework over bespoke per-type screens (Approach 1 of 2 presented).
- Real Cloudinary upload over URL-paste-only.
- Instagram posts become a real admin-managed content type, not left hardcoded.
- "MVC" scoped to the Express API (routes/controllers, Prisma+services as Model, thin JSON-shaping functions as View); the Next.js admin app keeps its normal App Router structure.
- Work pushed to GitHub as branches + PRs per chunk, not batched into one local branch.
- **Correction during plan-writing**: the spec originally listed Place as a sixth generic approvable type. Reading Foundation's actual `schema.prisma` and `approvable-resource.ts` (not just the parent design doc's intent) showed Place has no workflow columns and is explicitly excluded from `ApprovableResourceService`. Fixed to five generic types + Place as bespoke simple CRUD, with a shared `writeAuditRow` extraction so Place (and PageContent) still get real audit coverage — ground truth over intention.
