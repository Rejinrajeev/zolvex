import type { CSSProperties } from "react";

// Falls back to the trades Zolvex covers (PRODUCT.md) while no services are
// published. Real service names take over the strip the moment they exist.
const DEFAULT_ITEMS = [
  "Home & office cleaning",
  "AC service & repair",
  "Plumbing",
  "Electrical",
  "Handyman & installs",
  "Painting & improvement",
  "Property management",
];

/**
 * One half of the track has to be at least as wide as the viewport it runs
 * in. translateX(-50%) travels exactly one half, so if that half is narrower
 * than the strip the text runs out before the loop point: the tail clears the
 * screen, a band of empty Sun follows it, and the row snaps back. With four
 * published services a single copy measured 807px against a 1905px strip, so
 * the list repeats until each half carries at least this many items.
 */
const MIN_ITEMS_PER_HALF = 16;

/**
 * Seconds each item takes to cross. The duration is derived from the item
 * count rather than fixed, so adding services lengthens the track without
 * speeding the strip up — the pace stays the same whatever is published.
 */
const SECONDS_PER_ITEM = 9.5;

export function Marquee({ items = DEFAULT_ITEMS }: { items?: string[] }) {
  const source = items.length > 0 ? items : DEFAULT_ITEMS;
  const repeats = Math.max(2, Math.ceil(MIN_ITEMS_PER_HALF / source.length));
  const half = Array.from({ length: repeats }, () => source).flat();

  // The two halves are identical, which is what makes translateX(-50%) land
  // exactly where it started.
  const row = [...half, ...half];
  const trackStyle = {
    "--marquee-duration": `${Math.round(half.length * SECONDS_PER_ITEM)}s`,
  } as CSSProperties;

  return (
    <div className="marquee marquee-v2" aria-hidden>
      <div className="marquee-track py-4 sm:py-5" style={trackStyle}>
        {row.map((item, i) => (
          <span key={i} className="flex shrink-0 items-center">
            <span className="font-archivo-black px-7 text-lg tracking-[-0.02em] text-carbon sm:px-9 sm:text-xl">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-carbon/35" />
          </span>
        ))}
      </div>
    </div>
  );
}
