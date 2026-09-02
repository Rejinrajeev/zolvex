import type { MetadataRoute } from "next";

/**
 * Next.js auto-serves this at /manifest.webmanifest and auto-links it from
 * every page -- no manual <link rel="manifest"> needed. Icons are the
 * user-supplied favicon-generator output (public/android-chrome-*.png) --
 * the full brand lockup (icon + wordmark + tagline) on its own black
 * background, used unmodified rather than cropped to just the mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zolvex — Ready to Revive",
    short_name: "Zolvex",
    description:
      "Zolvex Home Services: cleaning, maintenance, repairs and installation for homes and businesses.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
