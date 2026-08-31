# Gate 1 — Public Site Content Integration — Design

## Problem statement

The public marketing site (`apps/web`'s non-admin routes) was built as a static design/branding deliverable — every content section (Services, Blog, Testimonials, FAQ, Instagram) is hardcoded, and the site has zero public API routes to read from. Meanwhile Gate 2's backend (`apps/api`) already has a complete, tested, approval-gated content management system for exactly these five types, plus a `PageContent` model for site-wide settings (hero copy, footer, WhatsApp number, Google Review URL) — none of it wired to anything the public sees. `PRODUCT.md`'s own stated design ("every content section... starts genuinely empty until admin staff publish real content") isn't true of the site as it stands today.

This plan connects the two: the public site starts reading real data from the backend, with genuine empty states, instead of hardcoded arrays.

## Scope

**In scope:**
- A new public (no-auth), read-only API surface exposing only `published` + `isActive` content.
- Wiring Services, FeaturedService, Blog, Testimonials, FAQ, and InstagramFeed to that real data.
- Wiring the four `PageContent` keys (hero, footer, whatsapp, google-review) — including defining their JSON shape for the first time, since the admin editor is currently a freeform textarea with no defined contract.
- A new floating WhatsApp chat button (sitewide) and a Google-Review external-link button (near Testimonials) — neither exists on the public site today; PRODUCT.md names WhatsApp click-to-chat as a real site-wide requirement, and the `google-review` PageContent key has had no consumer at all until now.
- Empty states per content section (an explicit, already-tracked product/design requirement).

**Explicitly out of scope:**
- Enquiry submission (`EnquiryModal`'s stub `setTimeout`) and the CRM push pipeline — a separate, already-identified follow-up (see conversation history; not part of this plan).
- `WhyUs.tsx` — pure brand-positioning copy, never named as backend-driven in `PRODUCT.md`; stays hardcoded.
- Any change to the Prisma schema. Every mapping below uses fields that already exist; where a hardcoded UI element has no backing field (see "Content-model mismatches" below), the UI is simplified to fit the real data rather than the schema being extended. A schema change is a bigger, separate decision than "wire the frontend to what's already there."

## Backend contract — new public API (ground-truthed: zero public routes exist today besides `/health`/`/ready`)

- **`GET /api/content/:type`** — mirrors the admin generic route's shape (same `CONTENT_TYPES` allowlist: `service`, `blog-post`, `testimonial`, `faq`, `instagram-post`), but:
  - No auth middleware.
  - `status` is hardcoded to `"published"` server-side inside the controller — never accepted as a query param, so there is no way for a request to ask for `draft`/`pending_approval`/`rejected` content. This is the one security-relevant design point in this whole plan: the admin route trusts an authenticated caller's `?status=` filter; the public route must never do that.
  - Also filters `isActive: true`. `ApprovableResourceService.list()` currently has no `isActive` filter at all (confirmed by reading it directly) — a `published` but deactivated record would leak through today via the admin route too, incidentally. Extend `list()`'s filter signature to `{status?, search?, isActive?}` (an optional, backward-compatible addition — the admin route's existing calls are unaffected since they never pass it) rather than filtering in the controller after the fact, so both callers benefit from the same fix.
  - Response is **not** the admin's pass-through `contentRecordView` — a new `publicContentView()` strips workflow-internal fields (`submittedBy`, `approvedBy`, `approvedAt`, `rejectionReason`, `deletedAt`) before responding. The public API has no business exposing which admin approved something or why something was rejected.
- **`GET /api/pages/:pageKey`** — public read for the 4 known keys (see shapes below). 404 (or a defined empty default — see per-key shapes) if never configured, matching the genuine-emptiness requirement.
- No new write endpoints. No new auth. No changes to any existing admin route's behavior beyond the `list()` filter addition (additive, opt-in).

## `PageContent` shapes (defined here for the first time — the admin editor has never enforced one)

Each shape below is the *minimum* needed to replace what's currently hardcoded in the corresponding component, not a redesign of the components themselves.

- **`hero`**: `{ headline: string, subheadline: string }`
  - Replaces the hardcoded `<h1>` and the paragraph beneath it in `Hero.tsx`.
  - **Content-model simplification**: the current headline ("Commercial cleaning you can set your **clock** to.") has a hand-drawn SVG underline animation hard-coded under the literal word "clock" — that can't generalize to arbitrary admin-edited text. Fixed by underlining whatever the *last word* of the dynamic headline is, computed by splitting on whitespace, using a plain CSS gold underline instead of the animated SVG path (the animation was a nice flourish, not a functional requirement — dropping it for a static equivalent is the honest trade-off for making the text truly editable).
- **`footer`**: `{ tagline: string, instagramUrl: string }`
  - `tagline` replaces the "Commercial cleaning, logged and on time..." paragraph under the Footer's Zolvex wordmark.
  - `instagramUrl` replaces the Footer's hardcoded `https://www.instagram.com/` link.
  - The Footer's phone link is powered by `whatsapp`'s number (below), not a separate field — one real number, one source of truth.
- **`whatsapp`**: `{ phoneNumber: string }` (E.164 format, e.g. `"+15551234567"`)
  - Powers two things, both currently missing or wrong:
    1. **New floating WhatsApp button** (see Architecture below) — sitewide, `href="https://wa.me/{phoneNumber}"`.
    2. The Footer's existing `tel:` contact link, updated to use this real number instead of the placeholder `+10000000000`.
  - Nav's existing phone-call icon button is a **separate, already-correct concern** (a plain phone call, not chat) — out of scope for this key; if Nav's own placeholder number needs a real value later, that's Nav's own field, not reusing `whatsapp`'s. (No PageContent key currently covers a distinct "business phone number" — noting this as a gap for a future pass, not solved here, since PRODUCT.md doesn't call out a phone-call requirement the way it does WhatsApp.)
- **`google-review`**: `{ url: string }` (a Google Maps/Business review-page URL)
  - Powers a new "Read our reviews on Google" external-link button, placed in the Testimonials section header (next to the existing "Placeholder entries shown below..." note) — the most contextually relevant spot, and the section that already talks about reviews.

Each of these 4 records may not exist yet (admin hasn't configured them) — every consumer below has a defined fallback (see Error handling).

## Content-model mismatches found during brainstorming (ground-truthed against the real Zod schemas, not assumed)

- **Blog**: the hardcoded cards show `title`, `excerpt`, `tag`, and a "Read the entry" link implying an internal article page. The real `BlogPost` schema is `{title, image, instagramUrl, order, isActive}` — no excerpt, no tag, no article body. This isn't a gap to fill; `instagramUrl` reveals the actual intent: these are Instagram-post teaser cards, not full articles. Fixed: drop `excerpt`/`tag` from the card entirely, replace "Read the entry" with an outbound link to `instagramUrl` (opens in a new tab), matching what the data actually models.
- **FeaturedService**: the current section hardcodes a 5-item bullet checklist with no backing field anywhere on `Service`. Fixed: render `Service.fullDescription` as the body paragraph (it already exists for exactly this "long-form service detail" purpose) and drop the itemized checklist rather than inventing a new schema field for this integration pass.
- **Testimonials, FAQ, InstagramFeed**: clean, already-anticipated mappings — no simplification needed. `Testimonial.name` (despite the field name) already holds a role-style label per `PRODUCT.md`'s own instruction ("role-based labels, not invented personal names"), matching the current placeholder copy exactly.

## Architecture

- **Server Components, not the admin panel's BFF/client-fetch pattern.** Public content has no auth/cookie concerns — there's no reason to route it through `callExpress`'s cookie-relay machinery. Each section fetches server-side at request time via `fetch(`${getApiBaseUrl()}/api/...`, { next: { revalidate: 90 } })` (90s: "a minute or two is fine," confirmed) — good for SEO (content is in the initial HTML), no client-side loading-spinner flash on a marketing page, and a fresh page render picks up new content automatically within the revalidation window after an admin approves something.
- **`app/page.tsx` needs a Server/Client split it doesn't have today.** Ground-truthed: the whole homepage is currently one `"use client"` file (`Home`) holding the booking-modal's `bookingOpen` state and composing every section directly. A Client Component can't itself be `async`/fetch server-side. Fix: `app/(site)/page.tsx` becomes a plain `async` Server Component that fetches every section's data (all 5 content types + all 4 PageContent keys, in parallel) and renders a new `HomePageClient` component, passing the fetched data down as props; `HomePageClient` (`"use client"`) keeps exactly the `bookingOpen` state and modal wiring the current `Home` has today, now receiving data instead of hardcoding it.
- **Which components become Server Components**: `Services`, `FeaturedService`, `Blog`, `Testimonials`, `FAQ`, `InstagramFeed` currently have no interactivity that requires `"use client"` except `Testimonials`' and `FAQ`'s scroll/`<details>` behavior, which are native HTML/CSS, not React state — all six become plain Server Components taking data as props (fetched once by the page above, not fetched individually by each section) rather than each doing its own client-side fetch. `Hero` and `Nav` stay `"use client"` (existing `onBookNow` callback wiring, scroll listener) but likewise receive their `PageContent` data as props.
- **New `app/(site)/` route group**, needed for the floating WhatsApp button below: ground-truthed that `app/admin/` is already its own separate top-level tree, but the public pages (`page.tsx`, `privacy/page.tsx`, `terms/page.tsx`) currently sit directly under `app/` with no grouping layout of their own — only the root `app/layout.tsx`, which also wraps every `/admin/**` route. Moving the three public pages into a literal-URL-preserving route group (`(site)` is parenthesized, so it does NOT appear in the URL — `/`, `/privacy`, `/terms` stay exactly as they are) gives the public site its own `app/(site)/layout.tsx`, a Server Component that fetches `whatsapp` PageContent once and renders the floating button plus `{children}` — without needing any path-based conditional logic, and without making the root layout client-side just to call `usePathname()`.
- **New floating WhatsApp button**: rendered from `app/(site)/layout.tsx` (see above), so it appears on every public page but never on `/admin/**`. A small presentational component (no interactivity beyond being a link — doesn't itself need `"use client"`) rendering a fixed-position (`fixed bottom-6 right-6` or equivalent, matching `DESIGN.md`'s icon-button conventions — round, gold-bordered, matching the existing Nav call-button's visual language) link to `https://wa.me/{phoneNumber}`. Doesn't render at all if `whatsapp` PageContent is unconfigured (see Error handling).
- **Icon mapping for `Service.icon`**: the field is a plain string; the site has real icon components (`IconOffice`, `IconCarpet`, etc.). A small lookup module (`apps/web/lib/service-icons.ts`) maps the same six string keys the current hardcoded array already uses (`"office"`, `"carpet"`, `"window"`, `"post-construction"`, `"floor"`, `"sanitize"`) to their component, defaulting to `IconOffice` for an unrecognized or blank value — admin-entered free text should never crash the page, and a real fallback icon (not a blank space) keeps a card from looking broken.

## Error handling / empty states

Per `PRODUCT.md`'s explicit, named requirement ("every content section must have a considered placeholder/empty state, because that is genuinely the starting condition, not an edge case") — each section gets its own, not a shared generic message:

- **Services / Blog / Testimonials / FAQ / InstagramFeed with zero published records**: each section renders its existing heading and framing copy, with a short, on-brand "nothing logged yet" message in the same `font-stamp` "ON FILE — PENDING" voice `PlaceholderPhoto` already uses elsewhere — not simply hidden (an entirely missing section reads as broken; an honestly-empty one reads as "not live yet," matching the brand's own "honest about what's not live yet" stance already established for photography).
- **FeaturedService with no `isHighlighted` Service**: the section doesn't render at all (there's nothing coherent to feature) — this is the one section allowed to disappear entirely rather than show an empty state, since it's not its own independent content type but a highlight of one Service record.
- **A `PageContent` key that's never been configured**: `hero`/`footer` fall back to the current hardcoded copy as a literal default (so the site never looks broken before an admin first touches these settings) — `whatsapp`/`google-review` simply don't render their button at all when unconfigured, rather than rendering a dead/placeholder link.
- **The public API itself unreachable** (Express down): each Server Component's fetch failure is caught and treated the same as a zero-content empty state, not a crashed page — a marketing site must never show a stack trace to a visitor.

## Testing

Matches the established split: automated tests cover pure backend logic (`publicContentView`'s field-stripping, `list()`'s new `isActive` filter, the public route's hardcoded-`published`-filter — a test proving a `?status=draft` query param has no effect is the one truly security-relevant test in this plan) and the icon-lookup module's fallback behavior. The actual rendered sections (real empty states, the floating WhatsApp button, the Google Review link, Hero's dynamic underline) are manually verified against a running backend with real published/unpublished content of each type, matching this project's already-established "manual for UI, automated for logic" convention.

## Decisions made during brainstorming (for the record)

- Scope covers all of PageContent (hero/footer/whatsapp/google-review) in the same plan as the 5 generic content types, per explicit user direction, rather than splitting into a smaller first pass and a PageContent fast-follow.
- Revalidation window: 90 seconds (ISR), not on-demand/webhook-triggered revalidation — simpler, and "a minute or two" was confirmed as fine.
- WhatsApp is a new, separate sitewide floating action button — not a repurposing of Nav's existing phone-call icon, per explicit user clarification.
- Google Review is a simple external link/button opening the Google Maps/Business review page in a new tab, placed in the Testimonials section — per explicit user clarification.
- Blog's card content is reshaped to match what `BlogPost` actually models (an Instagram-post teaser, not an internal article) rather than inventing excerpt/tag fields on the schema.
- FeaturedService's hardcoded checklist is dropped in favor of `fullDescription`, rather than adding a new schema field, keeping this plan frontend-only.
