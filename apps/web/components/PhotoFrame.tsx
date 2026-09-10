import type { CSSProperties, ReactNode } from "react";

/**
 * A rounded photo slot. `tone` sets how the empty/letterbox area reads on a
 * light section vs. a dark (carbon) one. The light fill is a carbon tint
 * rather than a fixed colour so the same frame sits correctly on the Bone
 * ground and inside a Shell card. Shared by Photo (a real uploaded image)
 * and PlaceholderPhoto (the "coming soon" state) so both read as the same
 * frame. Aspect ratio is a prop (not a class) so callers cannot collide two
 * `aspect-[…]` utilities.
 */
export function PhotoFrame({
  tone = "light",
  aspect = "4 / 3",
  className = "",
  children,
}: {
  tone?: "light" | "dark";
  aspect?: string;
  className?: string;
  children: ReactNode;
}) {
  const isDark = tone === "dark";
  const style: CSSProperties = { aspectRatio: aspect };
  return (
    <div
      style={style}
      className={`relative flex items-center justify-center overflow-hidden rounded-[1.5rem] ${
        isDark ? "bg-bone/[0.07] ring-1 ring-bone/20" : "bg-carbon/[0.05] ring-1 ring-carbon/[0.06]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
