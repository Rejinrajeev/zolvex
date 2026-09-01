const DEFAULT_ITEMS = [
  "On time, every time",
  "Every visit logged",
  "Offices",
  "Retail",
  "Post-construction",
  "One crew, one contract",
  "Carpet & floor care",
  "Sanitization",
];

/**
 * A thin running strip between sections. The track is duplicated so the
 * CSS translateX(-50%) loop is seamless; it pauses on hover and freezes
 * entirely under prefers-reduced-motion (see globals.css).
 */
export function Marquee({ items = DEFAULT_ITEMS }: { items?: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="marquee overflow-hidden border-y border-ink/10 bg-green py-3.5" aria-hidden>
      <div className="marquee-track">
        {row.map((item, i) => (
          <span
            key={i}
            className="mx-6 font-anton text-sm uppercase tracking-tight text-forest sm:text-base"
          >
            {item}
            <span className="mx-6 text-forest/40">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
