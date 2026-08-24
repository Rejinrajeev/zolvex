/**
 * No real photography exists yet (see PRODUCT.md — Evidence on Hand). Rather
 * than fake a stock photo, this renders as an empty ledger photo-slot: the
 * corner-mount marks and "ON FILE — PENDING" stamp a real logbook uses for a
 * record awaiting its attachment. Honest about what's missing, and still in
 * the world's own material language.
 */
export function PlaceholderPhoto({
  label,
  tone = "light",
  size = "md",
  className = "",
}: {
  label: string;
  tone?: "light" | "dark";
  size?: "md" | "lg";
  className?: string;
}) {
  const isDark = tone === "dark";
  const isLarge = size === "lg";
  return (
    <div
      className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden border ${
        isDark
          ? "border-gold/25 bg-ink-soft"
          : "border-ink/12 bg-paper-dim"
      } ${className}`}
    >
      {/* corner mounts */}
      {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos) => (
        <span
          key={pos}
          className={`absolute h-4 w-4 border-t-2 border-l-2 ${pos} ${
            isDark ? "border-gold/40" : "border-olive/50"
          }`}
          style={{
            transform: pos.includes("right") && pos.includes("bottom")
              ? "rotate(180deg)"
              : pos.includes("right")
                ? "rotate(90deg)"
                : pos.includes("bottom")
                  ? "rotate(-90deg)"
                  : undefined,
          }}
        />
      ))}
      <div
        className={`stamp-rotate rounded-sm border-2 text-center font-stamp uppercase ${
          isLarge ? "px-6 py-3.5 text-sm" : "px-4 py-2 text-[0.7rem] tracking-wide"
        } ${isDark ? "border-gold/70 text-gold" : "border-olive-ink/80 text-slate"}`}
      >
        On file — pending
        <div className={`mt-1 normal-case opacity-80 ${isLarge ? "text-xs" : "text-[0.62rem]"}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
