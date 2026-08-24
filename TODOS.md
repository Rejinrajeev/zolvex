# TODOS

## Security

### Encrypt/hash Admin.twoFASecret and twoFARecoveryCodes before write

**What:** The Foundation Prisma schema stores `twoFASecret` as a plain `TEXT` column and `twoFARecoveryCodes` as a plain `TEXT[]` (`apps/api/prisma/schema.prisma`, `Admin` model). The original plan requires the TOTP secret to be "encrypted at rest" and recovery codes to be "hashed one-time recovery codes" — neither is enforced by the schema itself; it has to happen in application code before the values are ever written.

**Why:** A background security review of the Foundation commit flagged these columns. They're not a defect in the schema (Foundation only defines storage shape, not the auth flow), but if Gate 2's admin-auth implementation writes to these columns without encrypting/hashing first, real TOTP secrets and recovery codes end up in plaintext in the database.

**Context:** Surfaced by an automated security review during the Foundation build. `passwordHash` is correctly a hash by design and needs no further action. This TODO exists so Gate 2's implementation plan explicitly includes: encrypt `twoFASecret` with an application-level key before create/update, and hash each recovery code (e.g. bcrypt) before storing.

**Effort:** S (a few functions in the Gate 2 auth service, not a schema change)
**Priority:** P1 — must land before any real admin account is created
**Depends on:** Gate 2's admin-auth implementation task (2FA setup/login flow)

## Foundation

### Partial slug index is invisible to Prisma — `migrate dev` may silently drop it

**What:** Slug uniqueness on `Service` is enforced by a hand-written partial unique index, `Service_slug_live_key` (`CREATE UNIQUE INDEX ... ON "Service"("slug") WHERE "deletedAt" IS NULL`), created in migration `apps/api/prisma/migrations/20260823175559_partial_slug_index/migration.sql`. `schema.prisma` can only express `@@index([slug])`, which is a plain NON-unique lookup index. Prisma therefore sees the real constraint as drift and a future `prisma migrate dev` may generate a migration that DROPS it.

**Why:** Accepting such a migration would silently remove slug-uniqueness enforcement with no error and no warning — duplicate live service slugs would then be creatable, breaking public URL routing. Prisma 6.1 happened not to propose the drop when the `20260823182332_...` migration was generated, but that is version-dependent behaviour, not a guarantee.

**Context:** Two guards are already in place: a prominent MIGRATION HAZARD comment block above `Service.slug` in `apps/api/prisma/schema.prisma`, and a regression test — "rejects two live Services sharing a slug (partial unique index)" in `apps/api/src/lib/services/approvable-resource.test.ts` — which was verified to go red when the index is dropped. Anyone generating a migration must still read the generated SQL and delete any `DROP INDEX "Service_slug_live_key"` line, re-adding the `CREATE UNIQUE INDEX` if needed. The real fix would be Prisma gaining native partial-index support (or moving to a check-constraint/trigger approach), neither of which is worth doing now.

**Effort:** S per migration (a manual read of generated SQL); M to eliminate structurally
**Priority:** P2 — no action needed until the next schema change, but must not be forgotten
**Depends on:** None

### Denylist field-strip depends on an HTTP-layer allowlist

**What:** `stripWorkflowFields` in `apps/api/src/lib/services/approvable-resource.ts` is a DENYLIST: it removes a fixed list of known workflow-control fields (`id`, `approvalStatus`, `submittedBy`, `approvedBy`, `approvedAt`, `rejectionReason`, `deletedAt`, `createdAt`, `updatedAt`) from caller-supplied `data` in `create()`/`update()`. It does not validate types, and it does not reject unknown fields.

**Why:** A denylist is only safe if something upstream has already constrained the field set. If a Gate 1/Gate 2 route handler ever passes a raw `req.body` straight into `create()`/`update()`, any column not on the denylist is mass-assignable, and any new sensitive column added to a model later is mass-assignable by default until someone remembers to extend `WORKFLOW_FIELDS`.

**Context:** This is a hard requirement on whoever builds the Gate 1/Gate 2 routes: **every** request body must be parsed and allowlisted with Zod (or equivalent) before it reaches this service — never pass raw/unvalidated request bodies into `create()`/`update()`. The contract is documented in the INPUT-VALIDATION CONTRACT block at the top of `approvable-resource.ts`. Converting the service itself to an allowlist would require it to know each model's editable field set, which is deferred along with making the service generic over a record type.

**Effort:** S per route (Zod schema alongside each handler)
**Priority:** P1 — must be honoured by the first route that mutates content
**Depends on:** Gate 1/Gate 2 route implementation

### `ApprovalStatus.draft` is currently unreachable — no `submit()` transition exists

**What:** `ApprovalStatus.draft` is the database default for `Service`, `BlogPost`, `Testimonial`, and `Faq` (`apps/api/prisma/schema.prisma`), but `ApprovableResourceService.create()` always overrides it — to `pending_approval` for an editor, or `published` for a superadmin. There is no code path that produces a `draft` record, and no method that transitions one out of `draft`.

**Why:** The enum value reads like a working feature but is dead in practice. Anyone building the admin UI could reasonably assume "save as draft" already works because the state exists in the schema, and ship a half-wired feature — records written directly as `draft` (bypassing the service) would then be stuck, since `approve()`/`reject()` both require `pending_approval` and would refuse them.

**Context:** Only rows inserted outside the service (e.g. `schema.test.ts`'s direct `prisma.service.create`) ever end up `draft`. If Gate 2 wants a real "save as draft, don't submit yet" feature it needs new work: a `create()`/`update()` option to keep the record in `draft`, plus a `submit()`-style transition method moving `draft` → `pending_approval` (with its own audit action). Do not assume one already exists. Alternatively, if drafts are not wanted, drop `draft` from the enum so the schema stops advertising it.

**Effort:** S (one new transition method plus an option flag), or S to remove the enum value
**Priority:** P3 — decide when the admin content-editing UI is designed
**Depends on:** Gate 2 admin UI scope decision

## Platform

### Quantify content/editorial volume post-Gate-1

**What:** Once the public site (Gate 1) is live, measure actual content volume (blog posts/month) and enquiry volume (per week) with real usage data.

**Why:** The full governance stack (approval workflow, audit log, session-revocation, trash/restore) was sized for "3+ non-technical editors" without ever quantifying how much content they actually produce. Real numbers either validate the investment or reveal it's oversized for the actual editorial load — informs whether Gate 2's scope stays as designed.

**Context:** Surfaced during /plan-eng-review's outside-voice pass on the Zolvex design doc (`~/.gstack/projects/zolvex/rejin-unknown-design-20260823-221524.md`). Not actionable pre-launch since no usage data exists yet.

**Effort:** S
**Priority:** P3
**Depends on:** Gate 1 (public launch) shipping

### Define post-launch ops ownership

**What:** Decide who runs and maintains the system after launch — Postgres/Prisma migrations, the Umami container, the CRM-retry cron, session-revocation debugging — since Zolvex's admin staff are explicitly non-technical.

**Why:** Without a named owner, a production incident (e.g. the CRM-retry pipeline silently failing, or a migration going wrong) has nobody on call to catch or fix it. This is an operational gap, not a technical one.

**Context:** Surfaced during /plan-eng-review's outside-voice pass on the Zolvex design doc. Options include a retained contractor, the original builder staying on retainer, or an in-house technical hire — not yet decided, likely resolvable closer to the actual launch date once staffing plans firm up.

**Effort:** S (just a decision, not build work)
**Priority:** P2
**Depends on:** None — can be resolved any time before Gate 1 launch
