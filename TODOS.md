# TODOS

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

## Security

### Encrypt/hash `Admin.twoFASecret` and `twoFARecoveryCodes` before write

**What:** The Foundation Prisma schema stores `twoFASecret` as a plain `TEXT` column and `twoFARecoveryCodes` as a plain `TEXT[]` (`apps/api/prisma/schema.prisma`, `Admin` model). The original plan requires the TOTP secret to be "encrypted at rest" and recovery codes to be "hashed one-time recovery codes" — neither is enforced by the schema itself; it has to happen in application code before the values are ever written.

**Why:** A background security review of the Foundation commit flagged these columns. They're not a defect in the schema (Foundation only defines storage shape, not the auth flow), but if Gate 2's admin-auth implementation writes to these columns without encrypting/hashing first, real TOTP secrets and recovery codes end up in plaintext in the database.

**Context:** Surfaced by an automated security review during `/plan-eng-review`'s subagent-driven build (Task 2, commit `02fe209`). `passwordHash` is correctly a hash by design and needs no further action. This TODO exists so Gate 2's implementation plan explicitly includes: encrypt `twoFASecret` with an application-level key (e.g. via a KMS-backed envelope encryption or at minimum AES-GCM with a secret from environment/secrets manager, never committed) before `create`/`update`, and hash each recovery code (e.g. bcrypt, same as `passwordHash`) before storing — comparing on verification the same way passwords are checked, never storing or logging the plaintext code after the one-time display at setup.

**Effort:** S (a few functions in the Gate 2 auth service, not a schema change)
**Priority:** P1 — must land before any real admin account is created, i.e. before Gate 2 goes live, not before Foundation/Gate 1
**Depends on:** Gate 2's admin-auth implementation task (2FA setup/login flow)
