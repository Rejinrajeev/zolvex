---
name: Zolvex
description: Commercial cleaning, on the record — a ledger-native design system of ruled grids, punch-perforation edges, and ink-stamp accents.
colors:
  ink: "#161b1f"
  ink-soft: "#232a30"
  paper: "#fefefd"
  paper-dim: "#f3f1ea"
  olive: "#ada477"
  olive-ink: "#6f6841"
  slate: "#616054"
  gold: "#eed77b"
typography:
  display:
    fontFamily: "Zilla Slab, Georgia, serif"
    fontSize: "clamp(2.75rem, 7vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Special Elite, Courier New, monospace"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.15em"
rounded:
  none: "0px"
  sm: "2px"
  full: "9999px"
spacing:
  xs: "0.75rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2.5rem"
  xl: "3.5rem"
  section-y: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "44px"
  input-error:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "44px"
---

# Design System: Zolvex

## Overview

**Creative North Star: "The Punch-Clock Ledger"**

Zolvex proves reliability the way a ledger does — an accumulating, timestamped record — not the way the cleaning industry usually does, with pastel spray-bottle branding and soft rounded cards. The system is built from the material grammar of a physical logbook: ruled grids as page texture, punch-perforation edges where sections seam together, ink-stamp accents that mark completed entries, and a near-black/warm-white ground pairing that reads as ledger page and cover rather than "brand dark mode." A facilities buyer scrolls past proof, not promises — every completed job reads as a stamped ledger entry — and books, trusting a company that visibly tracks its own discipline.

Density is confident but not cramped: generous section padding (`py-24`), a wide `90rem` container, and a restrained type palette (three families, each doing one job) keep the ledger metaphor from tipping into clutter. The system explicitly rejects rounded-corner softness, pastel color, and generic feature-grid decoration — corners stay square everywhere except the small set of elements playing the "stamp/mark" role, where a circle or a hand-rotated badge is the point.

**Key Characteristics:**
- Ruled-grid grounds (dark and light variants) as the world's signature background texture, not decoration bolted onto a plain fill.
- Ink-stamp accent language: rotated badges, corner-mounted photo frames, a `◆` marker glyph — all reusing the same physical stamping motif rather than inventing new ones per component.
- Square-cornered structure everywhere (buttons, cards, inputs, modal); roundness is reserved exclusively for stamp/mark elements.
- No box-shadow elevation system — depth comes from borders, the ruled ground, and rotation, not blur.
- Three fonts, three jobs: Zilla Slab (display/headlines), Archivo (body), Special Elite (stamped labels, dates, tallies).

## Colors

A near-monochrome ledger duo (ink/paper) structures every section; olive and slate carry secondary text and iconography; gold is the one accent, spent only on stamps, CTAs, and marks.

### Primary
- **Ledger Gold** (`#EED77B`): the system's only accent. Used for primary CTA fills (Book Now, Submit Enquiry), the date/status stamp line in the hero, focus rings and text-selection color on dark grounds, gold-tinted hairline borders on dark sections, and hover states on dark-ground links/icons. Never used as a body-text color or a large fill outside buttons.

### Secondary
- **Punch-Clock Ink** (`#161B1F`): the primary dark ground (hero, Services, Blog, Instagram, Footer, Nav-on-scroll) and the primary text color on light grounds.
- **Ink Soft** (`#232A30`): a lighter dark-surface tone used for cards sitting *on* the ink ground (Services' ticket cards, the dark scrollbar track) so they read as a distinct layer without a shadow.

### Tertiary
- **Olive** (`#ADA477`): the brand's muted gold-olive, used at low opacity for corner-mount frame marks on light `PlaceholderPhoto` tiles and the scrollbar thumb. At full strength it falls to 2.5:1 contrast on paper — below the 3:1 floor for meaningful graphical UI — so it is never used at full opacity for text or icons on light grounds.
- **Olive Ink** (`#6F6841`): a darkened derivative of Olive, purpose-built to clear that contrast floor. This is the color actually used for small marks — checkmarks, chevrons, focus borders on inputs — anywhere Olive would have been the instinctive choice on a light ground.

### Neutral
- **Ledger Paper** (`#FEFEFD`): the primary light ground (WhyUs, FAQ, EnquiryModal) and primary text color on dark grounds.
- **Paper Dim** (`#F3F1EA`): a warmer, slightly deeper paper used for sections that need to sit visually behind or beside pure paper (FeaturedService, Testimonials) and for the light-tone `PlaceholderPhoto` fill.
- **Slate** (`#616054`): secondary/body-adjacent text on light grounds — descriptions, captions, FAQ answers, placeholder-content notices.

### Named Rules
**The One Accent Rule.** Gold is spent on stamps, CTAs, and marks only — never on body text, never as a large fill, never doubled up with olive/slate for the same role on one surface. Its rarity is what makes a gold element read as "stamped," not just "styled."

**The Accessible-Derivative Rule.** When a brand color fails contrast in a given role (Olive at 2.5:1 on paper), the fix is a same-hue darkened derivative (Olive Ink), not a substitute color from a different hue family. The system never solves a contrast problem by reaching for an unrelated color.

## Typography

**Display Font:** Zilla Slab (with Georgia, serif fallback)
**Body Font:** Archivo (with system-ui, sans-serif fallback)
**Label/Stamp Font:** Special Elite (with Courier New, monospace fallback)

**Character:** A slab-serif headline face gives the ledger world its authority and weight; a clean grotesque body face keeps long-form copy legible and unfussy; a typewriter-style stamp face is reserved entirely for the system's "logged" moments — dates, statuses, category tags, tallies — so those elements read as literally typed onto the record rather than styled as UI chrome.

### Hierarchy
- **Display** (600, `clamp(2.75rem, 7vw, 5.5rem)`, leading 0.98): the hero H1 only — "the ledger's boldest entry."
- **Headline** (600, `2.25rem`–`3rem` / `text-4xl sm:text-5xl`, leading tight): section H2s (Services, WhyUs, Testimonials, FAQ, Blog, Instagram).
- **Title** (500–600, `1.875rem`–`2.25rem` / `text-3xl sm:text-4xl`, leading snug/tight): subsection headers and pull-quotes within WhyUs; also the modal H2 at `1.5rem`.
- **Body** (400, `1.125rem`–`1.25rem` / `text-lg sm:text-xl`, leading relaxed): paragraph copy, capped by its container's `max-w` (typically 28rem–36rem, roughly 55–65ch at this size).
- **Body — compact** (400, `0.95rem`, leading relaxed/normal): a smaller step of the same body voice for UI-adjacent and secondary text that isn't long-form paragraph copy — nav links, card excerpts. Reused identically in two components (`Nav.tsx`, `Blog.tsx`); a third instance should confirm the value rather than inventing a nearby one.
- **Label** (400, `0.7rem`–`0.72rem`, uppercase, tracking `0.15em`–`0.2em`): date stamps, "Status: On Duty," footer column headers, blog category tags, `PlaceholderPhoto`'s "ON FILE — PENDING" mark.

### Named Rules
**The Stamp-Face Exclusivity Rule.** Special Elite is used only for label-role text (dates, statuses, tags, tallies, "on file" marks) — never for headings, body copy, or buttons. Its typewriter texture is the visual signal that a piece of text is "logged," not just labeled.

## Layout

The container is a single wide max-width (`90rem` / 1440px) with responsive horizontal padding (`1.25rem` mobile → `2rem` sm → `3rem` lg), used consistently across every section. Sections stack full-bleed with generous vertical rhythm (`py-24`, 6rem top and bottom) and alternate grounds section-to-section (ink → paper-dim → ink → paper, etc.) rather than clustering same-tone sections together — the alternation itself is part of the "ledger page vs. cover" read.

Grids are simple and content-driven: two-column `lg:grid-cols-2` splits for image/copy pairs (FeaturedService, WhyUs row 3), and horizontally-scrolling `snap-x` strips (not wrapping grids) for repeatable card sets (Services, Testimonials) — this keeps card width fixed and legible instead of squeezing to fit a column count. The Instagram tile grid is the one true CSS grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-6`), appropriate to its uniform-square content.

Two signature ground textures carry the "ruled ledger" motif at the CSS level:
- **Dark ruled ground** (`.ledger-ground-dark`): a two-axis grid — horizontal rules every `2.75rem` (row height) and vertical rules every `6rem` (column width) — in `rgba(238,215,123,0.28)` (a translucent gold) over Ink.
- **Light ruled ground** (`.ledger-ground-light`): horizontal rules only, every `2.75rem`, in `rgba(22,27,31,0.1)` (a translucent ink) over Paper.

Responsive breakpoints follow Tailwind's default scale (no custom `tailwind.config`; this is a Tailwind v4 project configured entirely through the `@theme inline` block in `globals.css`): `sm` 640px, `md` 768px, `lg` 1024px. The nav's desktop/mobile split happens at `md`; most grid/typography scale changes happen at `sm` and `lg`.

## Elevation & Depth

This system is flat by design — there is no box-shadow elevation vocabulary. Depth and separation are conveyed structurally instead: hairline borders between surfaces, the ruled-grid ground texture, layered ground tones (Ink vs. Ink Soft), and physical-object cues (rotation, punch-perforation edges, corner-mount frames) that read as "a paper artifact sitting on a surface" rather than "a card floating above a background." The one near-exception is the primary button's `box-shadow: 0 1px 0 rgba(0,0,0,0.2)` — a hard 1px offset, not a soft blur, meant to read as a printed edge rather than ambient lift.

### Named Rules
**The No-Float Rule.** Nothing in this system uses a soft, blurred box-shadow to suggest floating above the page. Where a hard, 1px offset shadow appears (the primary button), it simulates a physical edge, not elevation.

## Shapes

Corners are square by default everywhere — buttons, cards, inputs, the modal panel, `PlaceholderPhoto` frames — with roundness reserved exclusively for elements playing a "stamp/mark/icon-badge" role: the circular call button and success icon (`rounded-full`), the scrollbar thumb (`rounded-full`), and small stamp badges like "Status: On Duty" or the WhyUs value tags (`rounded-sm`, 2px). This split is deliberate and total: a rounded corner anywhere else in the system would read as the wrong material.

Borders are the primary shape device, at two weights: 1px hairlines (`border-ink/10`–`/12` on light grounds, `border-gold/15` on dark) for routine structural separation, and 2px borders for emphasis — the modal's top/full border, invalid-field states, and the WhyUs value tags' outline. A recurring hand-tilt (`.stamp-rotate`, `-4deg`, plus small `±1°`–`2°` variants on scrolling cards) is applied only to elements that are explicitly playing a stamped/ticket role — badges, the "Quality Verified" mark, `PlaceholderPhoto`'s pending stamp, and Services' ticket-style cards — never as a generic decorative tilt. Section seams use a punch-perforation edge (`.punch-edge`): a row of paper-colored circles cut via `radial-gradient`, simulating a torn perforation between an ink section and the paper section above it.

## Components

### Buttons
- **Shape:** square corners (0 radius) throughout; no button in the system uses a rounded corner.
- **Primary:** Gold fill (`#EED77B`), Ink text, `font-display font-semibold`, generous padding (`px-8 py-4` for hero-scale, `px-6 py-3.5` for form-scale). Hover lifts `-translate-y-0.5`; active scales to `0.98`. Carries the one hard offset shadow in the system (`0 1px 0 rgba(0,0,0,0.2)`).
- **Secondary/Ghost:** transparent fill, 2px Ink border, Ink text; hover inverts to Ink fill with Paper text (`FeaturedService`'s "Book This Service").
- **Icon Button:** `rounded-full`, 44×44px minimum (meets the 44px touch-target floor), gold-bordered on dark grounds — the nav's call button is the canonical example.

### Cards / Containers
- **Ticket cards** (Services, on Ink Soft): square corners, 1px `gold/15` border, small rotation (`±1°`) that straightens on hover, a perforated top edge simulating a torn ticket stub, and a `-translate-y-1` hover lift.
- **Flat cards** (Testimonials, on Paper): square corners, 1px `ink/12` border, no rotation — these are "on the record" reviews, not stamped ephemera, so they stay level.
- **Corner Style:** always square.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Internal Padding:** `p-4 pt-6` (ticket cards) to `p-6`–`p-7`/`p-9` (testimonial cards, modal panel).

### Inputs / Fields
- **Style:** square corners, 44px min height, 1px `ink/20` border on Paper, `px-3.5` internal padding.
- **Focus:** border color shifts to Olive Ink — no glow, no ring, consistent with the system's flat/no-shadow stance.
- **Error:** border weight doubles to 2px solid Ink (the palette has no red), paired with a small `stamp-rotate`d `◆` glyph and an ink-colored message beneath the field, connected via `aria-describedby` and announced with `role="alert"`.

### Navigation
- Fixed header, transparent at rest over the hero; on scroll (past 24px) transitions to `Ink/95` with `backdrop-blur` and a `gold/15` bottom border, eased with `--ease-out-exp` over 500ms.
- Desktop: logo (display font) left, text links + circular phone-icon button right, links go Paper/85 → Gold on hover.
- Mobile (below `md`): hamburger/close stroke icons swap in place; a max-height-transitioned panel drops down in Ink with the same link list plus a "Call Zolvex" row.

### PlaceholderPhoto (signature component)
The site's answer to having no real photography yet (see PRODUCT.md — Evidence on Hand). Rather than fake a stock photo, it renders as an empty ledger photo-slot: a bordered `4:3` frame with four corner-mount L-bracket marks (one per corner, each rotated to point inward) and a centered, `stamp-rotate`d "ON FILE — PENDING" label in the stamp font, with the item's name printed below it in smaller normal-case text. Ships in two tones (light — Paper Dim fill, Olive corner marks; dark — Ink Soft fill, Gold corner marks) and two sizes (`md`, `lg`). Every content section that would otherwise need a real photo — Services, FeaturedService, Blog, Instagram — uses this same component, so the "we're honest about what's not live yet" stance is visually consistent site-wide rather than improvised per section.

### Stamped (motion primitive)
The system's one authored animation: a section or card arrives like a physical stamp coming down onto the page — scaling in from `1.06`, translating up `10px`, and settling to rest — using `var(--ease-stamp)` (`cubic-bezier(0.34, 1.56, 0.64, 1)`), an overshoot-and-settle curve chosen to simulate stamp impact rather than decorative bounce. It runs as a pure CSS `@keyframes` triggered on paint (not on scroll), so content is never gated behind an `IntersectionObserver` event that might not fire for a fast render, a slow device, or a crawler — every element always resolves to its final visible frame. Reduced-motion users get the instant final frame via a global `animation-duration` override. List items within a `<Stamped>` group stagger via `delayMs` (typically 60–100ms per item).

### Icon System
A single hand-authored stroke-icon set (`icons.tsx`): 24×24 viewBox, `1.5px` stroke width, round caps and joins, `currentColor` stroke (a few icons use `strokeOpacity: 0.55` on secondary internal linework — carpet ribs, window mullions, floor-tile seams — to keep primary silhouette strokes dominant). Two icons (star-filled, and the Instagram camera's lens dot) use a solid `currentColor` fill instead of a stroke, by design, not as an inconsistency. No emoji and no icon-font glyphs are used as icons anywhere in this set; new icons should match the 1.5px/round-cap/24px spec exactly.

### Error-Mark Glyph (narrow, reviewed exception)
Invalid form fields (`EnquiryModal`) pair their 2px border escalation with a small `stamp-rotate`d `◆` (diamond) Unicode marker, `aria-hidden` and placed beside the error text. This is a deliberate, narrow reuse of the site's existing ink-stamp motif to solve a real constraint — the palette has no red, so color alone can't carry error state — and reads as a period-appropriate ledger/manifest notation mark rather than an icon. It is scoped to this one affordance: it is not a general license for glyph-based icons, which remain banned everywhere else in favor of the stroke-icon system above.

## Do's and Don'ts

### Do:
- **Do** keep every structural element square-cornered (buttons, cards, inputs, the modal) and reserve roundness (`rounded-full`, `rounded-sm`) exclusively for stamp/mark/icon-badge elements.
- **Do** convey depth with borders, the ruled-grid ground, and layered ground tones (Ink vs. Ink Soft) instead of box-shadow elevation.
- **Do** apply `stamp-rotate`/small-angle tilts only to elements explicitly playing a stamped, ticket, or verification-mark role — not as a generic "add some personality" tilt.
- **Do** use `PlaceholderPhoto`'s "ON FILE — PENDING" treatment for every missing-photo slot, and equivalent honestly-labeled placeholder copy for missing testimonials/Instagram content — real names, photos, and stats are never fabricated (PRODUCT.md, Evidence on Hand).
- **Do** reserve Gold for accents, CTAs, and stamps only — never body text, never a large fill.
- **Do** use Olive Ink (not raw Olive) for any small mark or icon on a light ground; raw Olive falls below the 3:1 graphical-contrast floor there.

### Don't:
- **Don't** add soft/blurred `box-shadow` elevation to cards or buttons; the one authorized shadow in the system is the primary button's hard 1px offset.
- **Don't** introduce a red or other new hue for error states; use the established thicker-border + `stamp-rotate`d `◆` glyph convention instead.
- **Don't** use emoji or icon-font glyphs as icons; use the `icons.tsx` stroke system (1.5px stroke, round caps, 24px viewBox), except for the one reviewed `◆` error-mark exception scoped to invalid form fields.
- **Don't** override `a:visited` color globally; a single visited color can't hold AA contrast on both Ink and Paper grounds without fighting per-context link-color utilities.
- **Don't** set a kicker/eyebrow label above a section heading as a generic decorative device — the system's only label-style text above other content is role-specific (the hero's date/status ledger line, footer column headers that ARE the heading, or a content-taxonomy tag), never an invented category label bolted on for visual rhythm.
