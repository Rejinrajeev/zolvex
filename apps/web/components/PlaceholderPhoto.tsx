import { PhotoFrame } from "./PhotoFrame";
import { IconSanitize } from "./icons";

/**
 * No real photo has been uploaded for this record yet (PRODUCT.md — Evidence
 * on Hand). Rather than fake a stock image, the slot stays a clean rounded
 * frame with a friendly note; the moment an image is uploaded from the admin
 * panel, `Photo` renders it in the same frame.
 */
export function PlaceholderPhoto({
  label,
  tone = "light",
  size = "md",
  aspect = "4 / 3",
  className = "",
}: {
  label: string;
  tone?: "light" | "dark";
  size?: "md" | "lg";
  aspect?: string;
  className?: string;
}) {
  const isDark = tone === "dark";
  return (
    <PhotoFrame tone={tone} aspect={aspect} className={className}>
      <div className="flex flex-col items-center gap-2.5 px-6 text-center">
        <span
          className={`flex items-center justify-center rounded-full bg-green text-forest ${
            size === "lg" ? "h-14 w-14" : "h-11 w-11"
          }`}
        >
          <IconSanitize className={size === "lg" ? "h-7 w-7" : "h-5 w-5"} />
        </span>
        <span
          className={`font-sora text-sm font-semibold ${isDark ? "text-cream" : "text-ink"}`}
        >
          Photo coming soon
        </span>
        <span className={`font-sora text-xs ${isDark ? "text-cream/60" : "text-moss/80"}`}>
          {label}
        </span>
      </div>
    </PhotoFrame>
  );
}
