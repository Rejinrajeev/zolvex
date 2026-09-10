# Automatic CRM Push for Website Leads — Design

## Problem statement

The `Enquiry` model has carried the shape of a CRM integration since it was written — a `status` enum of `new` / `pushed_to_crm` / `failed` / `needs_manual_push`, plus `crmResponse`, `attemptCount` and `claimedAt` — but **none of it has ever been filled in**. Ground-truthed against the repository:

- No source file calls any CRM. Outside tests, the only occurrences of "CRM" anywhere are three labels in the admin UI (`enquiries/page.tsx` status filter, a page description, and a `crmResponse` viewer in `enquiries/[id]/page.tsx`).
- Nothing writes `pushed_to_crm`, `crmResponse`, `attemptCount` or `claimedAt`. A grep for writes to those fields across `apps/api/src` returns zero hits.
- `apps/api/src/controllers/admin/enquiries.controller.ts` is **read-only**: `list` and `getOne`. There is no way to change an enquiry's status even by hand.
- There is no worker, cron, or queue in the API.

So today every lead stops at the database with `status: "new"` forever, and staff read them out of the admin panel manually.

Separately, the ZOLVEX CRM dev team has asked for our field list and stack in order to issue an endpoint, auth and request format. That specification **does not exist yet**. This design is written so that its absence blocks only one small file.

## Scope

**In scope:**

- Automatic, asynchronous delivery of each new enquiry to the ZOLVEX CRM, with retries and backoff.
- Two new optional lead fields, `email` and `message`, captured by the public form (explicitly **not required** — see Decisions).
- An admin-triggered manual re-push, audited.
- A payload preview in admin, usable both for debugging and as a concrete sample to send the CRM team.
- Hosting change from Render free to Render Starter (see Decisions).

**Explicitly out of scope:**

- The CRM wire format itself. `mapper.ts` is deliberately a stub until their spec arrives; everything else ships complete and disabled.
- Any change to how enquiries are validated beyond adding the two optional fields.
- Bulk/batch push, CRM-side deduplication, or two-way sync. Nothing has asked for these.
- A generic outbox/event table. See Decisions.

## Hosting precondition

`render.yaml` currently pins `plan: free`, and `docs/DEPLOYMENT.md` documents that the service sleeps after ~15 minutes idle. An in-process timer cannot run while the service is asleep, which would otherwise force a protected drain endpoint, a shared secret, a GitHub Actions cron, and a wake-up catch-up sweep into this design purely as workarounds.

This design therefore assumes **`plan: starter`** (always-on). That single line removes four moving parts. Reverting to free later is possible but requires re-adding the drain path; it is not supported by this design as written.

## Data model

Additive migration only. Every new column is nullable, so no backfill and no downtime.

| Column | Type | Purpose |
| --- | --- | --- |
| `email` | `String?` | Optional, from the public form |
| `message` | `String?` | Optional, from the public form |
| `nextAttemptAt` | `DateTime?` | Earliest time this row may be attempted again |
| `lastError` | `String?` | Short reason for the most recent failure, surfaced in admin |

Also:

- `@@index([status, nextAttemptAt])` — the claim query filters on exactly this pair.
- A new `push` value on the `AuditAction` enum. Verified safe: nothing in `apps/web` references `AuditAction` or hardcodes action names, so the audit log renders new values generically.

The four existing statuses gain precise, non-overlapping meanings, which they have never had:

| Status | Meaning |
| --- | --- |
| `new` | Never attempted |
| `failed` | Attempted, failed transiently, retry scheduled via `nextAttemptAt` |
| `needs_manual_push` | Terminal. Either a non-retryable rejection or attempts exhausted. A human must act |
| `pushed_to_crm` | Accepted by the CRM. `crmResponse` holds their reply |

## Architecture

New directory `apps/api/src/lib/crm/`, following the precedent set by `apps/api/src/lib/uploads/cloudinary.ts` (lazy env configuration, typed error classes that distinguish "not configured" from "configured but rejected").

- **`config.ts`** — reads `CRM_API_URL`, `CRM_API_KEY`, `CRM_ENABLED`, `CRM_TIMEOUT_MS` lazily, mirroring `ensureConfigured()`. Throws `CrmNotConfiguredError` when required values are absent.
- **`mapper.ts`** — the *only* module that knows CRM field names. Sole export `toCrmLead(enquiry): CrmLeadPayload`. **This is the file that changes when the CRM spec arrives.** Until then it returns our own field names unchanged, which is what the admin preview renders.
- **`client.ts`** — transport. Builds the request, applies the timeout, and classifies the response into typed errors: `CrmAuthError`, `CrmRejectedError` (non-retryable), `CrmUnavailableError` (retryable). The transport function is injected so tests never touch the network.
- **`dispatcher.ts`** — claiming, one-row dispatch, status transitions, backoff arithmetic.
- **`worker.ts`** — the interval loop and its lifecycle.

### Flow

```
POST /api/enquiries
  ├─► save row (status: new) ──► 201 to visitor      never blocked
  └─► void nudge()                                    fire-and-forget
                     │
 worker tick (30s) ──┤
                     ▼
        claim due rows  (UPDATE … FOR UPDATE SKIP LOCKED)
                     │
                     ▼
        toCrmLead → client.send
                     ├─ success ──► pushed_to_crm, store crmResponse
                     └─ failure ──► classify (see Failure handling)
```

`nudge()` is invoked after `prisma.enquiry.create()` in the public controller and is **never awaited**; the 201 has already been sent. It is wrapped so a rejection can never surface in the request path. Its only job is to shorten the common-case delay from "up to 30s" to "immediate".

The worker holds an in-flight guard so a slow tick cannot overlap the next one, and clears its interval on shutdown. It does not start at all when `CRM_ENABLED` is falsy.

### Claiming

A row is **claimable** when all of the following hold:

- `status` is `new` or `failed`. The terminal states `pushed_to_crm` and `needs_manual_push` are never picked up automatically; the only route out of `needs_manual_push` is the admin action below.
- `nextAttemptAt` is null or in the past.
- `claimedAt` is null, or older than the 5-minute stale threshold.

Rows are claimed with a raw `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING *`. On a single always-on instance a plain select-then-update would be adequate, but `SKIP LOCKED` is the standard Postgres idiom, costs nothing extra, and means a second instance (or an overlapping manual push) can never double-send a lead.

A claim older than 5 minutes is considered stale and may be re-claimed, so a row cannot be stranded by a process that died mid-flight.

## Failure handling

| Outcome | Trigger | Transition |
| --- | --- | --- |
| Retryable | Network error, timeout, 408, 429, 5xx | `failed`, `attemptCount++`, `nextAttemptAt` = now + backoff |
| Non-retryable | 400, 401, 403, 422 | `needs_manual_push`, record `lastError` |
| Exhausted | `attemptCount` reaches 6 | `needs_manual_push` |
| Success | 2xx | `pushed_to_crm`, store `crmResponse`, clear `claimedAt` / `lastError` |

Backoff schedule, keyed on the value of `attemptCount` *after* the failed attempt is recorded:

| `attemptCount` | Next attempt in |
| --- | --- |
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 15 minutes |
| 4 | 1 hour |
| 5 | 6 hours |
| 6 | — terminal, `needs_manual_push` |

That is six attempts in total, spanning roughly seven and a quarter hours before a lead is handed to a human.

401 and 403 are deliberately terminal rather than retried. Wrong credentials do not heal on their own; retrying burns rate limit and hides the actual fault behind a queue that looks merely slow.

`claimedAt` is cleared on every terminal and every retry path, so a row is never left claimed.

Every request carries `Idempotency-Key: <enquiry.id>` (a cuid, already unique and stable) so that a retry after an ambiguous timeout cannot create a duplicate lead. Whether the CRM honours this header is on the outstanding question list for their team; if they do not support it, the risk is duplicate leads on timeout-then-retry, which is noted here as a known limitation rather than silently accepted.

## Admin surface

- **`POST /admin/api/enquiries/:id/push`**, behind `requireAuth`. This is the only route out of `needs_manual_push`. It resets `attemptCount` to 0 and clears `nextAttemptAt` and `lastError`, then dispatches immediately — so a lead rescued by hand gets a full fresh retry budget rather than failing straight back to terminal on its next hiccup. It goes through the same `SKIP LOCKED` claim path as the worker, so it can never race a tick already dispatching that row. Writes an audit row with the new `push` action and returns the resulting status.
- **`GET /admin/api/enquiries/:id/crm-preview`**, behind `requireAuth`. Returns `toCrmLead(enquiry)` without sending anything. This is what makes the integration debuggable before the CRM spec exists, and produces a real sample payload to attach to correspondence with their dev team.
- The enquiry detail page gains: status, `attemptCount`, `lastError`, `nextAttemptAt`, the existing `crmResponse` viewer, and two actions — **Push to CRM now** and **Preview payload**. Calls go through the existing `adminFetch` helper.
- The list page's status filter already covers the four statuses and needs no change.

## Public form changes

`apps/web/components/EnquiryModal.tsx` gains two optional inputs, Email and Message, labelled so their optionality is obvious. The form stays phone-first; nothing becomes required.

Server validation extends the existing Zod schema in `controllers/public/enquiries.controller.ts`:

- `email: z.string().trim().email().max(200).optional()`, empty string normalised to `undefined`
- `message: z.string().trim().max(2000).optional()`, empty string normalised to `undefined`

The Next.js BFF at `apps/web/app/api/enquiries/route.ts` forwards the request body verbatim as text and needs **no change**.

## Configuration

`render.yaml`: `plan: free` → `plan: starter`, plus four env vars — `CRM_API_URL` and `CRM_API_KEY` with `sync: false`, `CRM_ENABLED` (default unset, i.e. off), and `CRM_TIMEOUT_MS` (default 10000). Mirrored into `apps/api/.env.example`.

Shipping with `CRM_ENABLED` unset means this can all merge before the CRM spec exists: the worker stays inert, leads queue safely at `new`, and nothing is lost.

## Testing

Tests run against a real Postgres test database via `DATABASE_URL_TEST` (`src/test-setup.ts`), which is the existing convention. The transport is injected, so no test performs real network I/O.

- **Unit** — `toCrmLead` output shape; the backoff schedule; failure classification for each status code and for network/timeout errors.
- **Integration** — creating an enquiry leaves it claimable; a successful dispatch transitions to `pushed_to_crm` and stores `crmResponse`; a retryable failure increments `attemptCount` and sets a future `nextAttemptAt`; a non-retryable failure goes terminal immediately; exhaustion at six attempts goes terminal; a claimed row is not claimed twice; `claimedAt` is always cleared.
- **Endpoints** — `POST /admin/api/enquiries/:id/push` rejects unauthenticated callers and writes an audit row; `GET …/crm-preview` sends nothing.
- **Regression** — the two new optional fields must not break existing submissions that omit them. All 74 existing tests stay green.

## Decisions made during brainstorming (for the record)

- **Async outbox, not inline.** The public controller's own comment calls this form "the single conversion-critical action on the public site". Blocking that request on a third-party HTTP call contradicts it. The visitor's 201 never waits on the CRM; a nudge plus a 30s tick keeps the common-case delay to roughly zero.
- **Render Starter over free.** Every workaround this design would otherwise need — drain endpoint, shared secret, external cron, wake-up sweep — exists solely because the free tier sleeps. Paying for always-on deletes them. For a business whose leads are its revenue, that is the cheapest item in the design.
- **The `Enquiry` table is the outbox.** A generic `OutboxEvent` table is more future-proof, but there is exactly one integration and the columns already exist for it. YAGNI.
- **Email and message optional, never required.** Requiring an email on a phone-first form costs conversions. If the CRM turns out to *mandate* email, that is a product decision to revisit deliberately, not a default to drift into.
- **Build now behind an adapter.** The unknown CRM contract is isolated to `mapper.ts` (and possibly one auth header in `client.ts`). Everything else is built, tested and merged disabled, so the day the spec arrives is a short session rather than a project.
- **401/403 are terminal.** Retrying bad credentials is noise that disguises a configuration fault as a transient one.
