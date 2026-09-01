import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { PhotoFrame } from "./PhotoFrame";

/**
 * Inserts Cloudinary's automatic format + quality negotiation and a width
 * cap into a delivery URL, so the site serves a right-sized WebP/AVIF
 * instead of the multi-MB original the admin uploaded. Any non-Cloudinary
 * URL is returned untouched.
 */
function cloudinaryTransform(src: string, width: number): string {
  const marker = "/image/upload/";
  const at = src.indexOf(marker);
  if (at === -1 || !src.includes("://res.cloudinary.com/")) return src;
  const insertAt = at + marker.length;
  return `${src.slice(0, insertAt)}f_auto,q_auto,c_limit,w_${width}/${src.slice(insertAt)}`;
}

/**
 * A real uploaded image in the rounded photo frame. Falls back to
 * PlaceholderPhoto when no image has been uploaded for the record yet, so
 * every caller can pass `src={record.image}` unconditionally.
 */
export function Photo({
  src,
  label,
  tone = "light",
  size = "md",
  className = "",
  aspect = "4 / 3",
  width = 800,
  eager = false,
}: {
  src?: string | null;
  label: string;
  tone?: "light" | "dark";
  size?: "md" | "lg";
  className?: string;
  aspect?: string;
  width?: number;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <PlaceholderPhoto label={label} tone={tone} size={size} aspect={aspect} className={className} />
    );
  }
  return (
    <PhotoFrame tone={tone} aspect={aspect} className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary CDN; next/image not configured for this project */}
      <img
        src={cloudinaryTransform(src, width)}
        alt={label}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
    </PhotoFrame>
  );
}
