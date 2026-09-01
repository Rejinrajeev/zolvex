---
name: Zolvex
description: Fresh Start — a bright cream-and-spring-green world for a commercial cleaner. Compressed display type, fully rounded forms, drifting organic shapes and one authored scroll entrance on the marketing site; the same tokens in a dense, Sora-only Operate register for the admin panel.
colors:
  cream: "#fbfaf5"
  ink: "#161b1f"
  green: "#0fb877"
  green-ink: "#066b44"
  forest: "#0c3a2c"
  sky: "#a9e1ec"
  mist: "#e8f5ec"
  moss: "#55635b"
  paper: "#fefefd"
  gold: "#eed77b"
  danger: "#c1352a"
  danger-soft: "#fdecea"
typography:
  display:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(2.5rem, 12vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "0.005em"
    textTransform: "uppercase"
  body:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.75rem"
  xl: "2rem"
  pill: "9999px"
spacing:
  xs: "0.75rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2.5rem"
  xl: "3.5rem"
  section-y: "7rem"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.forest}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "{colors.green}"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "48px"
  input-error:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "48px"
---

# Design System: Zolvex

## Overview

**Creative North Star: "Fresh Start"**

Zolvex is the commercial cleaner that makes a workplace feel new again, and the site is built to feel that way on sight: a warm off-white page, one confident spring-green that carries every action, compressed display type set large and plain, fully rounded forms, and soft organic shapes drifting behind the content. It refuses the cleaning category's pastel spray-bottle clip-art and it refuses the dark, industrial "ledger" world the previous site used — a facilities buyer should read *bright, dependable, easy* in the first second, then scroll a short, legible story: what Zolvex covers, why it is reliable, the proof, book a walkthrough.

Density is generous and calm. A single `80rem` container, `py-20`–`py-28` section rhythm, and a restrained two-family type palette keep the brightness from tipping into noise. Colour is used in whole fields — a green marquee, a forest section, tinted cards — not as scattered accents on a neutral page.

**Key characteristics:**
- Warm cream ground (`#FBFAF5`) as the default field; sections alternate cream → mist → forest so the scroll has a pulse.
- One green. Spring green (`#0FB877`) is every primary button, every highlighted word, the marquee, the seal. Gold, sky and forest are section-variety only and never a second call-to-action colour.
- Anton, always uppercase, for display; Sora for everything else, including buttons.
- Fully rounded: pill buttons and chips, `1.25`–`2rem` cards, `2.5rem` on the footer's top edge. No square corners anywhere.
- One authored scroll entrance (`Reveal`: a short rise + fade on exponential ease-out); parallax blobs and the rotating seal are ambient; hover is a small spring lift.
- Depth is a soft green-forest-tinted shadow with real offset and blur — never a hard block shadow, never a flat halo.

## Colours

A near-monochrome base (cream ground, near-black `ink` text) structured by one saturated accent, with three support hues that own whole regions rather than details, plus one strictly-scoped negative colour.

### Primary
- **Spring Green** (`#0FB877`): the system's one accent. Every primary button fill (with `forest` text), the second line of the hero headline, the marquee field, the seal, icon dots, hover underlines. Used as a large fill freely — this is a Committed colour strategy, not an accent-on-neutral one. Not used for body text (fails contrast on cream); when green *text* is needed on a light ground, use **Green Ink** (`#066B44`).
- **Green Ink** (`#066B44`): the readable green, for links, small labels, and inline emphasis on cream or mist. ~5:1 on cream.

### Support (region colours)
- **Forest** (`#0C3A2C`): the one dark ground. Carries the WhyUs pull-quote panel, the FeaturedService section, and the footer. Cream text on forest, green accents. Sections and wrappers that sit on forest carry the `.on-forest` class, which flips focus rings and scrollbars to legible values.
- **Mist** (`#E8F5EC`): a pale green tint for alternating section grounds and for chips/list rows on cream.
- **Sky** (`#A9E1EC`): a soft blue, used at partial opacity for card tints and one hero blob.
- **Gold** (`#EED77B`): a warm accent retained from the brand palette, used at partial opacity for card tints and for review stars. Never a fill behind a CTA.

### Neutral
- **Cream** (`#FBFAF5`): the default page ground and the text colour on forest.
- **Paper** (`#FEFEFD`): pure white, for cards and chips that need to lift off cream or mist.
- **Ink** (`#161B1F`): primary text on all light grounds; also the ghost-button border and its hover fill.
- **Moss** (`#55635B`): secondary and supporting text on light grounds — a green-tinted grey, ~5.5:1 on cream, never a flat neutral grey.

### Named rules
**The One-Green Rule.** Spring green is the only colour that means "act" or "this matters." Gold, sky and forest set the mood of a region; none of them ever fills a button or marks a link. A second accent competing for the same job dilutes the signal that green carries.

**The Negative Colour.** `danger` (`#C1352A`) — with `danger-soft` (`#FDECEA`) as its wash — is the one red in the system, and it means only one thing: *this is wrong*. It marks invalid form fields (a `2px danger` ring), inline validation messages, the error `Notice`, and a "Rejected" status. It is never a decorative accent, never a heading colour, never used where the problem isn't an error the user must fix.

**Region colour, not detail colour.** Colour commits at section scale — a whole green strip, a whole forest block, a fully tinted card — not as a stripe, a corner, or an icon wash on an otherwise neutral surface.

**The Accessible-Green Rule.** Where green needs to be *read* rather than *seen* (text, small labels), the value darkens to Green Ink within the same hue; the fix for green-on-cream contrast is never a different colour.

## Typography

**Display:** Anton (self-hosted via next/font; `Arial Narrow`, sans-serif fallback)
**Body / UI:** Sora (self-hosted; `system-ui`, sans-serif fallback)

**Character:** Anton is a single-weight, tightly compressed grotesque — it reads as a plainspoken headline stamped in one motion, confident without ornament. Sora is a geometric humanist sans with even colour and open counters, unfussy at long measure and clean in UI. Two families, two jobs.

### Hierarchy (as built)
- **Hero display** (`text-[12vw]` → `sm:text-6xl` → `lg:text-7xl`, uppercase, leading `0.9`): the H1 only, split across two lines with the last line in Green Ink.
- **Section headline** (`text-5xl` → `sm:text-6xl`, sometimes `lg:text-7xl`, uppercase, leading `0.95`): every section H2, usually hard-wrapped to 2–3 short lines.
- **Card / panel title** (`text-xl`–`text-3xl`, uppercase): service and post titles, the featured-service name, the modal title.
- **Body** (`text-lg`–`text-xl` / `1.125`–`1.25rem`, Sora 400, leading `1.6`): paragraph copy, capped around `36rem` measure. `text-wrap: pretty` on multi-line paragraphs.
- **Body compact / label** (`text-sm`–`text-base`, Sora 500–600): nav links, chips, buttons, captions, footer links, form labels.
- **Numerals** (`.tabular`, Sora): times and counts in the hero panel and footer use tabular figures.

### Named rules
**Anton is display-only.** It sets headlines, card titles, the wordmark, and the marquee. It never sets body copy, and it never sets a button — buttons are Sora 600. Its compression is the signal that a line is a *headline*, not chrome.

**Uppercase is Anton's only case.** Every Anton string is uppercase; there is no mixed-case display style.

**No kicker line.** Section headings stand alone. There is no eyebrow, tag, or label set above a heading anywhere in the system; where a section needs a second thought it goes *below* the heading as a Moss sentence, or onto the artwork as a chip.

## Layout

One container width (`max-w-[80rem]` / 1280px) with responsive padding (`1.25rem` → `2rem` at `sm`). Sections are full-bleed, stacked, with `py-20` (mobile) to `py-28` (`sm`+) rhythm and **alternating grounds** — cream → mist → forest → cream → … — so no two adjacent sections share a tone. Forest appears roughly twice on the page and always as a deliberate dark beat.

Grids are content-led: 2- and 3-up card grids (`sm:grid-cols-2 lg:grid-cols-3`) for the backend-driven collections (services, posts, testimonials), a 6-up square grid for Instagram tiles, and 2-column `1fr 1fr` splits for the hero and image/copy pairs. The FAQ uses an asymmetric `0.8fr 1.2fr` split with a sticky left rail.

Two ambient background devices:
- **Blobs**: soft, blurred organic shapes (`border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%`) placed off the edges of the hero at low opacity, drifting on a slow scale/rotate loop and a light scroll parallax.
- **Marquee**: a thin green strip between the hero and the first section, its track duplicated for a seamless `translateX(-50%)` loop; pauses on hover, frozen entirely under reduced motion.

Breakpoints follow Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024); the nav collapses at `md`, most grid and type steps change at `sm` and `lg`. This is a Tailwind v4 project configured through the `@theme inline` block in `app/globals.css`; there is no `tailwind.config`.

## Elevation & depth

Depth is a single shadow shape: a soft drop with real vertical offset, a wide blur, and a negative spread, tinted with the forest colour — `0 Npx Mpx -Kpx rgba(12,58,44,0.25–0.45)`. Larger elements (hero card, featured photo) get a bigger, softer version of the same shadow; buttons get a tighter green-tinted one (`rgba(15,184,119,0.7)`). Cards also carry a `1px` `ink/5` or `cream/20` ring for a crisp edge under the blur.

### Named rules
**One shadow shape.** Every raised element uses the same offset-plus-blur-plus-negative-spread drop, scaled to its size. There is no hard block shadow, no zero-offset glow, and no second elevation style. A ring (`1px`) may accompany the shadow; it never replaces it with a flat outline.

## Shapes

Everything is rounded. Radius scales with the element: `0.75rem` (sm) for inline chips and inputs, `1.25rem` (md) for photos inside cards and small tiles, `1.75rem` (lg) for cards and list rows, `2rem` (xl) for the hero card, featured photo, and modal, `2.5rem` for the footer's top corners, and `9999px` (pill) for every button, the nav CTA, the WhatsApp button, chips, and the rotating seal. There is no square corner in the system; a right angle would read as unfinished.

Borders are hairlines only (`1px`, `ink/5`–`ink/15`, or `cream/10`–`cream/20` on forest). Emphasis comes from fill and weight, never from a thick or coloured border. Two elements earn a `2px` ring: the ghost button's ink outline (which inverts to a fill on hover), and an **invalid form field**, whose ring is `2px danger` — the only place a colour is allowed to carry structure, because a wrong field must be unmissable.

## Components

### Buttons
- **Primary:** Spring-green pill, Forest text, Sora 600, `px-7 py-4` (hero/section scale) or `px-5 py-2.5` (nav). Green-tinted drop shadow. Hover lifts `-translate-y-0.5`; active returns to `0`. An `IconArrow` that slides right on hover is the standard trailing affordance.
- **Ghost / secondary:** transparent pill, 2px Ink border, Ink text; hover inverts to Ink fill with Cream text.
- **Icon button:** `rounded-full`, ≥44×44, hairline border, green on hover — the nav phone button.
- **Text button:** Green-Ink, Sora 600, with a trailing chevron; used for in-rail links ("Book a walkthrough" in the FAQ).

### Cards & panels
- **Collection card** (services, posts): `rounded-[1.75rem]`, a cycling tint (`mist` → `sky/50` → `gold/40`), inner padding `p-4`, a `rounded-[1.25rem]` photo on top, then a small paper icon-dot, an Anton title, and a Moss line. Hover: `-translate-y-1.5` plus the standard shadow; the photo scales `1.04` inside its clip.
- **Testimonial card:** `rounded-[1.75rem]`, tint cycle `paper` → `sky/55` → `gold/45`, a gold star row, a Sora quote, an Anton name.
- **Forest panel** (WhyUs quote): `rounded-[2.25rem]`, forest fill, cream text, green sub-labels, the rotating seal in the corner on `lg`.
- **Hero card:** white `rounded-[2rem]` panel with a forest header bar, a 2-column grid of mist zone-rows each with a green check-dot, and a green summary bar; a filled green seal overlaps the top-right corner on `sm`+.

### Inputs (EnquiryModal)
- `rounded-xl`, 48px, Paper fill, `1px` `ink/15` ring; focus goes to a `2px` green ring (no glow). Error state is a `2px` `danger` ring plus a Sora-600 `danger` message with a drawn `IconAlert` — colour, ring weight, icon and text all carry it together, never colour alone.
- The enquiry flow is a modal (rounded, cream, slide-up) with a real focus trap, Escape-to-close, and focus restored to the opener — it is the one interruption the system permits, because the enquiry is the single conversion action.

### Photo frame
`PhotoFrame` is a rounded slot with an `aspectRatio` **prop** (never an `aspect-[…]` class, so two ratios can't collide). `tone="light"` fills unshot slots with mist and a faint ink ring; `tone="dark"` (on forest) uses a translucent cream fill and ring. `PlaceholderPhoto` fills it with a green icon-dot and a "Photo coming soon" note; the instant an image is uploaded from the admin panel, `Photo` swaps in a Cloudinary-optimised `<img>` (`f_auto,q_auto,c_limit,w_N`) in the same frame. Every backend collection renders through this one component so the "no real photography yet" state is consistent site-wide (PRODUCT.md — Evidence on Hand).

### Icon system
The existing hand-drawn stroke set (`icons.tsx`): 24×24 viewBox, `1.5px` stroke, round caps/joins, `currentColor`. One icon was added for this world (`IconAlert`, a circle-exclamation) following the same spec. No emoji, no icon-font glyphs; the `·` in the seal and `/` in the marquee are typographic separators, not icons.

### Motion
`MotionConfig reducedMotion="user"` wraps the whole public tree (Framer Motion / `motion`), so every `motion` component collapses to an instant state for reduced-motion users; CSS animations are separately killed in a `@media (prefers-reduced-motion)` block.
- **Reveal** (the one authored entrance): `opacity 0 → 1`, `y 26 → 0`, `cubic-bezier(0.16, 1, 0.3, 1)`, `0.7s`, fired once on `whileInView`. `Stagger`/`StaggerItem` run the same motion with `0.08s` between children.
- **Hero load:** the headline rises line-by-line, the sub and buttons follow, the card scales in, the zone rows deal in left-to-right — one orchestrated sequence, not per-element decoration.
- **Ambient:** blobs drift (18s scale/rotate loop) with scroll parallax; the **Seal** rotates a full turn every 26s; the marquee scrolls every 32s. All stop under reduced motion.
- **Hover:** a small `-translate-y` lift plus the standard shadow on cards, a `translate-x` nudge on trailing arrows, a growing underline on nav links.

### Named rules
**One authored entrance.** `Reveal` (rise + fade, exponential ease-out, once) is the only scroll-triggered entrance in the system. New sections use it; they do not invent a second reveal style. Ambient motion (blobs, seal, marquee) and hover feedback are separate, always-on layers and are not "entrances."

**Reduced motion is a first-class state.** Nothing important is gated behind an animation: `Reveal` content starts visible under reduced motion, the marquee freezes readable, the seal stops, parallax is disabled.

## Browser surfaces

Themed from the palette in `globals.css`: text selection is green on white, the caret is green, the scrollbar is a green thumb on a mist track (forest on forest sections), `:focus-visible` is a `2px` green ring with `3px` offset (gold on forest), link underline offset is `4px`, and tabular figures are on for numeric data.

## Do's and don'ts

### Do
- **Do** carry every primary action in Spring Green with Forest text, and keep gold/sky/forest for region mood only.
- **Do** set all display type in Anton uppercase and everything else — buttons included — in Sora.
- **Do** round every corner, scaling the radius to the element, and convey depth with the one soft green-forest shadow plus an optional hairline ring.
- **Do** alternate section grounds cream → mist → forest so the scroll has rhythm, and treat forest as a deliberate dark beat used sparingly.
- **Do** reveal new sections with `Reveal`, and keep ambient motion (blobs, seal, marquee) and hover feedback as separate always-on layers.
- **Do** route every missing photo through `PhotoFrame`/`PlaceholderPhoto` so the empty state stays consistent.

### Don't
- **Don't** introduce a second call-to-action colour, or fill a button with gold/sky/forest.
- **Don't** set a kicker, eyebrow, or tag line above a heading — the heading stands alone; supporting text goes below it or onto the artwork.
- **Don't** use Anton for body copy or buttons, or set any Anton string in mixed case.
- **Don't** use a hard block shadow, a zero-offset glow, a square corner, or a thick/coloured border — except the one sanctioned case, an invalid field's `2px danger` ring.
- **Don't** reach for `danger` red anywhere it doesn't mean "this is an error to fix" — not for emphasis, warnings that aren't errors, destructive-action buttons at rest, or decoration.
- **Don't** use emoji or icon-font glyphs; extend `icons.tsx` at `1.5px`/24px/round-cap instead.
- **Don't** gate content behind an animation or add a second scroll-entrance style.

## Admin panel — the Operate register

The `/admin` surface runs the same world in a task register (see PRODUCT.md's secondary audience). The rules above hold, with these adjustments, driven by [operate.md](reference/operate.md):

- **One family.** Sora carries every heading, label, control and data cell. Anton is used **only** for the Zolvex wordmark (sidebar and auth screens); there is no compressed display type inside the tool.
- **Fixed type scale.** `text-2xl` bold for page titles, `text-sm`/`text-xs` for everything else. No `clamp()`, no `vw` units.
- **Second neutral layer.** The sidebar is a solid `forest` rail (cream text, `green` for the active item and the "Admin" wordmark accent); content sits on `cream`; panels and tables are `paper` with a `1px ink/5` ring and the one soft shadow. `mist` fills table headers, chips, empty-state panels, and the image dropzone.
- **State vocabulary.** Every control ships default / hover / focus (`2px green` ring) / disabled / loading. Loading is a `.skeleton` block (`skeleton-pulse`), never a centred spinner. Empty states are a `mist` panel that says what will appear there.
- **Motion is feedback only.** 150–200 ms transitions on hover, the sidebar drawer, and the modal entrance (`modal-panel-in`, ~180 ms). No scroll reveals, no parallax, no `Reveal`/`Stagger` — those belong to the marketing site.
- **One control set.** `components/admin/ui.tsx` is the whole vocabulary: `Button` (primary pill / ghost / danger / quiet), `TextField` / `TextAreaField` / `SelectField` / `CheckboxField` (a pill toggle), `PageHeader`, `Panel`, `Notice`, `EmptyState`, `SkeletonRows`. `Table`, `Modal`, `StatusBadge`, `ErrorBanner` are the shared list/dialog/status pieces. A screen that hand-rolls an input or a button instead of using these is a lapse. Every "New X" / "Add X" page action is the green **primary** button.
- **Hover stays on-palette.** No control hovers to ink/black. Primary lifts and holds green; `ghost` hovers to a green border + `mist` fill + `green-ink` text; `danger` hovers to a solid `danger` fill with cream text. Table row links hover to `forest` (neutral actions) or `danger` (Delete / Reject / Revoke / Deactivate).
- **Client validation.** Forms validate before the request (`lib/admin/validate.ts`): required fields, whole-number fields, `*Url`/`permalink` as `http(s)`, `slug` as `[a-z0-9-]`, email format on the login and user forms, "must be a JSON object" on the page editor. Errors render inline through the field's own `error` prop with the drawn `IconAlert`; the server's Zod errors still merge in for anything the client missed.
- **Error styling** follows The Negative Colour rule above: an invalid field gets a `2px danger` ring; its message and the error `Notice` (`danger-soft` fill) are `danger` with a drawn `IconAlert`; `StatusBadge`'s "Rejected" is a `danger-soft` pill. Red never appears alone — the `IconAlert` and the message text carry it alongside the colour.

## Not canonised

Three things in the build are deliberately **not** system rules: the marketing hero card's illustrative "logged 08:12 / all 6 zones cleared" copy is a one-off demonstration (not real-time data, not a repeatable pattern); the `CountUp` motion primitive in `motion-primitives.tsx` is currently unused — wire it to a real figure before relying on it; and the admin's remaining `Modal` uses (reject reason, new user, new place) are a kept legacy interaction, not an endorsement of modals over inline flows.
