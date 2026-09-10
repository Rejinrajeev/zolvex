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
 * The Sun strip under the hero. The track holds the list twice so the CSS
 * translateX(-50%) loop is seamless; it pauses on hover and freezes
 * readable under prefers-reduced-motion (see globals.css).
 */
export function Marquee({ items = DEFAULT_ITEMS }: { items?: string[] }) {
  const row = items.length > 0 ? [...items, ...items] : [...DEFAULT_ITEMS, ...DEFAULT_ITEMS];
  return (
    <div className="marquee marquee-v2" aria-hidden>
      <div className="marquee-track py-4 sm:py-5">
        {row.map((item, i) => (
          <span key={i} className="flex shrink-0 items-center">
            <span className="font-archivo-black px-7 text-lg tracking-[-0.02em] text-carbon sm:px-9 sm:text-2xl">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-carbon/35" />
          </span>
        ))}
      </div>
    </div>
  );
}
