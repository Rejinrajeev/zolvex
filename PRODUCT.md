# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router). Carried over from the `/plan-eng-review` architecture decision: Next.js Route Handlers proxy all admin API calls to the Express/Prisma backend (already built — see `apps/api/`), and Next.js ISR with on-demand revalidation serves the public site so published content updates without a full rebuild.

## Users

**Primary: home and business customers** — homeowners and businesses in Kerala deciding whether to trust Zolvex with a service in their home or premises. They are weighing whether this company will show up, send a trustworthy person, do the job right, and keep doing it reliably — not browsing for entertainment.

**Secondary: Zolvex's own admin/editor staff (3+ people)** — manage all site content (services, blog posts, testimonials, FAQ) through the backend admin panel. Not a design audience for the public site, but a durable constraint: every piece of public content originates from an admin upload, not hardcoded copy.

## Product Purpose

A marketing website for **Zolvex Home Services**, a residential and commercial services company (cleaning, maintenance, repairs, installation, AC service, plumbing, electrical, handyman work, home improvement, property management), that builds enough trust for a customer to submit an enquiry — and pushes that enquiry into Zolvex's existing CRM. The site is the first real digital storefront the company has had.

## Positioning

100% dedication, hard-working, on-time. Zolvex is one team for the whole to-do list — home or business — so a customer doesn't line up separate vendors for a cleaner, a plumber, an electrician and a handyman. Every technician is background-verified, police-cleared and trained; every visit is logged. The trust question a visitor is answering is "will a stranger I let into my home or premises show up, be honest, do the job right, and be reliable." Design personality follows from that: disciplined, dependable, professional — warm and approachable, never sloppy or gimmicky.

## Operating Context

All public content (services, blog posts, testimonials, FAQ, page copy) is created and published by admin staff through a backend admin panel (already built — see `apps/api/src/lib/services/approvable-resource.ts`), not hardcoded into the site. Enquiries submitted on the public site are pushed into an existing external CRM. A WhatsApp click-to-chat entry point exists site-wide. Content moves through an editor → superadmin approval workflow before going live. Each published service has its own page at `/services/[slug]` with its own SEO metadata; the home page's Services grid links to them.

## Capabilities and Constraints

- Every content section on the public site (services list, blog posts, testimonials, FAQ) is backend-driven and starts genuinely empty until admin staff publish real content — the design must handle a real zero-content state gracefully, not just a "coming soon" placeholder.
- The enquiry form is the single conversion-critical action on the site; it must feel effortless, not bureaucratic. It can be opened from any "Book a visit" CTA and, from a service page, is tagged with that service.
- The service list spans several trades (cleaning, AC, plumbing, electrical, handyman, painting, maintenance, property management); real services, copy and pricing come from the backend — do not invent specific SKUs, prices, or regional claims as if confirmed.

## Brand Commitments

- Name: **Zolvex** (legal entity: **Zolvex Home Services**). Logo/wordmark sits top-left in the nav.
- Confirmed color palette (binding, not illustrative): `#161B1F` (near-black — primary dark), `#FEFEFD` (near-white — primary light), `#ADA477` (muted gold/olive), `#616054` (warm gray), `#EED77B` (bright gold — accent).
- Nav structure (user-specified): logo left; Services, About Us, and a Contact icon at the right end.
- Contact (single source of truth is `apps/web/lib/contact.ts`): email `info@zolvex.in`, phone `+91 80896 31909`, WhatsApp `+91 85905 70373`, location Kerala, India.
- Primary CTA wording site-wide: **"Book a visit."**

## Evidence on Hand

**None yet.** No real photography, no real testimonials, no real Instagram handle exist at the time of this record. All of it will be uploaded through the backend admin panel later. This design must use clearly-understood placeholder content (placeholder photography treatment, placeholder testimonial copy, a placeholder Instagram handle/grid) structured so real content drops in via the backend without a redesign — never fabricate specific customer names, quotes, review counts, or service claims as if they are real.

## Product Principles

1. **Reliability over flash.** The design communicates dependability, punctuality and a trustworthy person at the door first — customers are evaluating trustworthiness, not novelty.
2. **Speaks to both a homeowner and a business owner.** Tone and copy stay professional and plainspoken and work whether the space is a house or an office; avoid language that assumes only one ("the whole building", "facilities manager").
3. **Content is backend-driven, so design for real emptiness.** Every content section must have a considered placeholder/empty state, because that is genuinely the starting condition, not an edge case.
4. **Trust is earned by specificity, not decoration.** When real testimonials, photos, and an Instagram feed do land, the design should reward that specificity (real names, real quotes, real work) rather than burying it under generic ornamentation.

## Accessibility & Inclusion

WCAG 2.1 AA baseline (established in the project's design review): keyboard-navigable enquiry form, visible focus states, ARIA landmarks on nav/main/footer, 44px minimum touch targets, 4.5:1 minimum contrast on body text.
