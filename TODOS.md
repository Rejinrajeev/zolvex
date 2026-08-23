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
