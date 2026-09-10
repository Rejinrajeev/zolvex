---
name: Zolvex
description: Yellow Van — a warm-grey, near-black and hi-vis-yellow world for a home-and-commercial services company. Heavy Archivo Black display, sentence-case section heads with one highlighted phrase, white cards on grey, a yellow running strip and a scroll-snapping service rail. The admin panel keeps the older Fresh Start green in a dense Operate register.
colors:
  bone: "#f1f0ec"
  shell: "#ffffff"
  sun: "#f7d14c"
  sun-deep: "#efc02a"
  sun-ink: "#8a5d00"
  carbon: "#141210"
  carbon-soft: "#262220"
  ash: "#65625c"
  danger: "#c1352a"
  danger-soft: "#fdecea"
typography:
  display:
    fontFamily: "Archivo Black, Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 9vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.03em"
    textTransform: "uppercase"
  heading:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "0.75rem"
  md: "1.35rem"
  lg: "1.75rem"
  xl: "2.25rem"
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
    backgroundColor: "{colors.sun}"
    textColor: "{colors.carbon}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "{colors.sun-deep}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.carbon}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-secondary-hover:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.bone}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  input:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.carbon}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "48px"
  input-error:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.carbon}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "48px"
---

# Design System: Zolvex

## Overview

**Creative North Star: "Yellow Van"**

Zolvex sends a trained person to your door, and the site is built to feel the way that person looks: turned out, unmistakable, easy to flag down. The world is the yellow work uniform seen against a grey street — a warm grey ground, near-black type set heavy and plain, and one hi-vis yellow that means *act*. It refuses the home-services category's spray-bottle clip-art and coupon clutter, and it refuses the dark industrial "ledger" look the first version of this site used.

This world replaced the previous **Fresh Start** green world on the public site in the v2 redesign, from a reference image the client pinned. The admin panel deliberately **kept** Fresh Start; both systems live in `app/globals.css` and are kept apart by a single scope class (see *Two worlds, one stylesheet*).

**Key characteristics:**
- Warm grey ground (`#F1F0EC`) as the default field, with white (`#FFFFFF`) cards lifting off it.
- One yellow. `sun` (`#F7D14C`) is every primary button, the active nav pill, the running strip, the round "next" control, and the check dot. It is a **fill**, never text on a light ground.
- Two display registers from one superfamily: Archivo Black, uppercase, for the hero and pull-quote; Archivo Semibold, **sentence case**, for section headings, each with one phrase in `sun-ink`.
- Carbon (`#141210`) is the single dark beat — the trust panel and the footer, nothing else.
- Fully rounded: pill buttons and nav chips, `1.35`–`2.25rem` cards, `2.5rem` on the footer's top edge.
- Depth is one soft carbon-tinted drop with real offset and blur. No hard block shadow, no zero-offset glow.

## Two worlds, one stylesheet

`app/globals.css` carries both systems. The v2 tokens are **new names**, not overrides, so nothing the admin reads changed value. Everything visual about this world is scoped under a single `.site-world` class that only `app/(site)/layout.tsx` applies:

- `.site-world` sets the ground, the text colour and the Archivo family.
- `body:has(.site-world)` paints the overscroll/rubber-band ground, keeping it off the admin tree.
- Selection, caret, scrollbar and `:focus-visible` are re-themed **inside that scope only**.

**The consequence is a rule:** a public-site component uses `bone / shell / sun / sun-deep / sun-ink / carbon / ash`. An admin component uses `cream / paper / green / green-ink / forest / mist / moss / ink`. A public component reaching for `green`, or an admin component reaching for `sun`, is the mistake this split exists to prevent.

## Colours

A near-monochrome base (warm grey ground, near-black text) structured by one saturated accent, plus one strictly-scoped negative colour.

### Primary
- **Sun** (`#F7D14C`): the system's one accent, and a **fill only**. Primary buttons (with `carbon` text), the active nav pill, the marquee field, the forward arrow, check dots, the avatar mark, footer column headings on carbon. At ~1.4:1 on the ground it can never carry text on a light surface.
- **Sun Deep** (`#EFC02A`): the pressed/hover grade of the same yellow, and the star fill.
- **Sun Ink** (`#8A5D00`): the **readable** grade of the yellow family — the highlighted phrase in a heading, in-rail text links, the "View on Instagram" line. ~5.5:1 on bone.

### Neutral
- **Bone** (`#F1F0EC`): the default page ground, and the text colour on carbon.
- **Shell** (`#FFFFFF`): cards, panels, the nav pill container, empty-state blocks — anything that must lift off bone.
- **Carbon** (`#141210`): primary text on light grounds, the ghost button's border and its hover fill, and the one dark section ground.
- **Ash** (`#65625C`): secondary and supporting text on light grounds — a warm grey, ~4.9:1 on bone, never a cold neutral.

### Named rules
**The One-Yellow Rule.** Sun is the only colour that means "act" or "this matters". There is no second accent. A second call-to-action colour dilutes the only signal the page has.

**The Fill/Ink Split.** Yellow is a fill with carbon on top; where the yellow family must be *read* rather than *seen*, it darkens to Sun Ink within the same hue. The fix for yellow-on-light contrast is never a different colour, and never white text on yellow — white on Sun is ~1.9:1 and fails outright.

**Region colour, not detail colour.** Colour commits at section scale — a whole yellow strip, a whole carbon block — not as a stripe, a corner, or an icon wash.

**One dark beat.** Carbon fills the WhyUs trust panel and the footer. A third dark block flattens the rhythm; on a service page the beat is the closing band, and the featured-service panel stays on shell for exactly this reason.

**The Negative Colour.** `danger` (`#C1352A`), washed with `danger-soft` (`#FDECEA`), is the one red and means only *this is wrong*: an invalid field's `2px` ring, inline validation, the error notice. Never decoration, never a warning that is not an error.

## Typography

**Display:** Archivo Black (self-hosted via `next/font`; `Archivo`, system-ui fallback)
**Headings / body / UI:** Archivo (400/500/600/700)

**Character:** one superfamily, two registers. Archivo Black is a wide, single-weight grotesque that reads as a headline stamped in one motion. Archivo carries everything else with even colour and open counters. The jump from a hero stamp to a paragraph is a change of *weight*, not of voice.

### Hierarchy (as built)
- **Hero display** (`clamp(2.75rem, 9vw, 6rem)`, Archivo Black, uppercase, leading `0.9`, tracking `-0.03em`): the H1 only, split across two lines with the last line in Sun Ink.
- **Section heading** (`clamp(2.25rem, 5vw, 3.25rem)`, Archivo 600, **sentence case**, leading `1.05`): every section H2, with one phrase in Sun Ink.
- **Pull-quote** (`clamp(1.6rem, 3.4vw, 2.5rem)`, Archivo Black, uppercase): the trust panel only.
- **Card title** (`1.125`–`1.25rem`, Archivo 600, sentence case).
- **Body** (`1.125`–`1.25rem`, Archivo 400, leading `1.6`), capped near a `34rem` measure, `text-wrap: pretty` on multi-line paragraphs.
- **Label / UI** (`0.95rem`, Archivo 500–600): nav links, buttons, chips, footer links, form labels.
- **Numerals** (`.tabular`): ratings, prices and counts.

### Named rules
**Archivo Black is display-only.** Hero, wordmark, pull-quote, marquee, big price. Never body copy, never a button — buttons are Archivo 600.

**Uppercase is Archivo Black's only case; sentence case is the heading register.** The two never swap. Uppercase signals "this is the stamp"; sentence case signals "this is the argument".

**One highlighted phrase per heading.** A section heading carries exactly one Sun Ink phrase, at its end. Two highlights in one heading is noise.

**No kicker line.** Headings stand alone. There is no eyebrow, tag, or label above a heading anywhere — including the "Our Services" chip in the source reference, which was deliberately dropped.

## Layout

One container (`max-w-[84rem]`) with responsive padding (`1.25rem` → `2rem` at `sm`). Sections are full-bleed and stacked on the single bone ground with a `py-20` → `py-28` rhythm; rhythm comes from **cards and the two carbon blocks**, not from alternating section tints.

Grids are content-led: a `1.05fr 1fr` hero split, `sm:grid-cols-2 lg:grid-cols-3` for posts, a 6-up square grid for Instagram, and an asymmetric `0.8fr 1.2fr` FAQ with a sticky left rail.

**The rail.** The services collection is a horizontal scroll-snap container (`.rail`), not a grid: a real scroll box that works with a thumb drag, a trackpad, and the keyboard, with arrow buttons driving `scrollBy` on top of it and disabling themselves at each end. Any scroll container placed in a grid track must carry `min-w-0`, or the track sizes to the full content width and the page overflows horizontally.

Breakpoints are Tailwind defaults (`sm` 640, `md` 768, `lg` 1024); the nav collapses at `md`. Tailwind v4, configured through `@theme inline` in `app/globals.css`; there is no `tailwind.config`.

## Elevation & depth

One shadow shape: a soft drop with real vertical offset, wide blur, negative spread, tinted with carbon — `0 Npx Mpx -Kpx rgba(20,18,16,0.45–0.6)`. Bigger elements get a bigger, softer version of the same drop. Cards on bone generally need **no** ring: white on warm grey already separates.

### Named rules
**One shadow shape.** Every raised element uses the same offset-plus-blur-plus-negative-spread drop, scaled to its size. No hard block shadow, no zero-offset glow, no second elevation style.

## Shapes

Everything is rounded, scaled to the element: `0.75rem` inputs and small chips, `1.35rem` photos inside cards, `1.75rem` cards and list rows, `2.25rem` the hero panel, big panels and the modal, `2.5rem` the footer's top corners, and `9999px` for every button, nav chip, and round control. There is no square corner.

Borders are hairlines only (`1px`, `carbon/5`–`carbon/15`, or `bone/10`–`bone/20` on carbon). Emphasis comes from fill and weight. Two elements earn a `2px` ring: the ghost button's carbon outline (which inverts to a fill on hover), and an invalid form field (`2px danger`).

## Components

### Buttons
- **Primary:** Sun pill, carbon text, Archivo 600, `px-7 py-4` (section scale) or `px-6 py-3` (nav). Carbon-tinted drop shadow. Hover lifts `-translate-y-0.5` and deepens to Sun Deep. A trailing `IconArrow` that slides right is the standard affordance.
- **Ghost / secondary:** transparent pill, `2px` carbon border; hover inverts to carbon fill with bone text.
- **Round control:** `rounded-full`, ≥44×44 — bone for "previous", Sun for "next"; both disable at the rail's ends.
- **Text button:** Sun Ink, Archivo 600, with a trailing chevron.

### Nav
One floating Shell pill holding the whole link set, with the section currently in view lit in Sun. The lit pill is a **readout** driven by an `IntersectionObserver` over the section ids (`top`, `services`, `about`, `reviews`, `contact`), not a static style. Below `md` it collapses to a Shell drawer carrying the same lit state.

### Cards & panels
- **Service card:** `rounded-[1.75rem]` Shell, a `4/3` photo on top, the name on the baseline, and a round arrow that fills Sun on hover. The card lifts `-translate-y-1.5` with the standard shadow; the photo scales `1.04` inside its clip.
- **Review panel (hero):** a Shell device panel — a header carrying the business name and (only when published) the rating, then real review rows with a star row each. With no reviews published it shows the trades covered instead. It never displays invented activity.
- **Rating card (hero):** star, tabular rating, review count. Rendered **only** when a real rating exists in the backend.
- **Carbon panel:** `rounded-[2.25rem]`, carbon fill, bone text, Sun sub-labels. Wrappers on carbon carry `.on-carbon`, which flips the focus ring to Sun.

### Inputs (EnquiryModal)
`rounded-xl`, 48px, Shell fill, `1px carbon/15` ring; focus goes to a `2px` carbon ring. Error is a `2px danger` ring plus an Archivo-600 danger message with a drawn `IconAlert` — colour, ring weight, icon and text carry it together, never colour alone. The enquiry is the one interruption the system permits, with a real focus trap and focus restored to the opener.

### Photo slots
`PhotoFrame` is a rounded slot with an `aspectRatio` **prop**. Its light fill is a carbon tint rather than a fixed colour, so the same frame reads correctly on bone and inside a Shell card. `PlaceholderPhoto` fills an unshot slot with a Sun icon dot and a "Photo coming soon" note; `Photo` swaps in a Cloudinary-optimised image in the same frame the moment one is uploaded. Every backend collection renders through this one component (PRODUCT.md — *Evidence on Hand*).

**No faked cut-outs.** The hero's technician slot renders a real uploaded image or nothing. A geometric mask or radial gradient approximating a photographic edge reads worse than the honest absence.

### Icon system
The hand-drawn stroke set in `icons.tsx`: 24×24 viewBox, `1.5px` stroke, round caps/joins, `currentColor`. No emoji, no icon-font glyphs. The `·` separators in the marquee are typographic, not icons.

### Motion
`MotionConfig reducedMotion="user"` wraps the public tree, so every `motion` component collapses to an instant state for reduced-motion users; CSS animations are separately killed in a `@media (prefers-reduced-motion)` block.
- **Reveal** (the one authored entrance): `opacity 0 → 1`, `y 26 → 0`, `cubic-bezier(0.16, 1, 0.3, 1)`, `0.7s`, once on `whileInView`. `Stagger`/`StaggerItem` run the same motion `0.08s` apart.
- **Hero load:** headline lines rise, then sub, then buttons, then the panel scales in and its rows deal downward — one orchestrated sequence.
- **Ambient:** the marquee scrolls (38s), pauses on hover, and freezes readable under reduced motion.
- **Hover:** a small `-translate-y` lift plus the standard shadow, a `translate-x` nudge on trailing arrows, a Sun fill on the card's round arrow.

### Named rules
**One authored entrance.** `Reveal` is the only scroll-triggered entrance. New sections use it; they do not invent a second reveal style.

**Reduced motion is a first-class state.** `Reveal` content starts visible, the marquee freezes readable, nothing important is gated behind an animation.

## Browser surfaces

Themed from the palette, inside `.site-world`: selection is Sun with carbon text, the caret is carbon, the scrollbar is a carbon thumb on a warm grey track, `:focus-visible` is a `3px` carbon ring with `3px` offset (Sun on carbon sections), link underline offset is `4px`, and tabular figures are on for numeric data. Yellow is deliberately **not** the focus ring: it cannot reach 3:1 against the light ground.

## Do's and don'ts

### Do
- **Do** carry every primary action in Sun with carbon text, and keep carbon for the two dark beats.
- **Do** set display type in Archivo Black uppercase and every heading in Archivo sentence case with one Sun Ink phrase.
- **Do** round every corner, scaling the radius to the element, and convey depth with the one soft carbon shadow.
- **Do** give any scroll container inside a grid track `min-w-0`.
- **Do** route every missing photo through `PhotoFrame`/`PlaceholderPhoto`.
- **Do** render social proof from published content only, and hide the block entirely when there is none.

### Don't
- **Don't** introduce a second call-to-action colour, or put white text on Sun.
- **Don't** set Sun as text on a light ground — darken to Sun Ink instead.
- **Don't** set a kicker, eyebrow, or tag above a heading, including the chip in the source reference.
- **Don't** use Archivo Black for body copy or buttons, or set it in mixed case.
- **Don't** use a hard block shadow, a zero-offset glow, a square corner, or a thick/coloured border — except an invalid field's `2px danger` ring.
- **Don't** invent a rating, a review count, a customer name, or an avatar row. Real or absent.
- **Don't** let public-site components reach for the admin's `green`/`forest`/`cream` tokens, or vice versa.

## Admin panel — the Operate register (Fresh Start, retained)

The `/admin` surface was deliberately left on the older **Fresh Start** green world in the v2 redesign, and is **not** governed by the palette or type above. It keeps:

- **One family.** Sora for every heading, label, control and data cell; Anton only for the wordmark.
- **Fixed type scale.** `text-2xl` bold page titles, `text-sm`/`text-xs` elsewhere. No `clamp()`, no `vw`.
- **Its own palette.** A solid `forest` sidebar rail (cream text, `green` active item), `cream` content, `paper` panels with a `1px ink/5` ring, `mist` for table headers, chips, empty states and the dropzone.
- **State vocabulary.** Default / hover / focus (`2px green` ring) / disabled / loading, loading as a `.skeleton` block rather than a spinner.
- **Motion as feedback only.** 150–200 ms transitions, no scroll reveals, no `Reveal`/`Stagger`.
- **One control set.** `components/admin/ui.tsx` is the whole vocabulary; `Table`, `Modal`, `ConfirmDialog`, `StatusBadge`, `ErrorBanner` are the shared list/dialog/status pieces. A screen that hand-rolls an input or button is a lapse.
- **Deliberate dialogs.** Admin modals dismiss only through Cancel or the close icon — never a backdrop click or Escape — with a focus trap and focus restored to the opener, so a stray click cannot discard a half-filled form or answer a delete prompt.

## Not canonised

Three things in the build are deliberately **not** system rules: the hero technician slot is empty pending a real cut-out asset and its composition should be revisited once one exists; the `CountUp` primitive in `motion-primitives.tsx` is still unused — wire it to a real figure before relying on it; and `Seal`/`Blob`, held over from the Fresh Start world, are no longer used on the public site and should be deleted rather than revived if the next surface does not want them.
