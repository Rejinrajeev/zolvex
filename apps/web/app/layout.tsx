import type { Metadata } from "next";
import { Anton, Sora, Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/MotionProvider";

// Two worlds share this root.
//
// Public site — v2 "Yellow Van": Archivo Black sets the display voice,
// Archivo carries headings, body, nav and buttons. One superfamily, two
// registers, so the jump from a hero stamp to a paragraph is a change of
// weight rather than a change of voice.
//
// Admin panel — Fresh Start, unchanged: Sora throughout, Anton for the
// wordmark only. Both pairs load here because both trees are served from
// this layout; each surface uses only its own.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const archivoBlack = Archivo_Black({ variable: "--font-archivo-black", subsets: ["latin"], weight: "400" });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Zolvex Home Services — Cleaning, Maintenance & Repairs, Done Right",
  description:
    "Zolvex Home Services covers cleaning, maintenance, repairs and installation for homes and businesses — trained, background-verified technicians, on schedule, every visit logged.",
};
// Deliberately no manual `icons` field here -- setting it at all replaces
// Next's auto-discovered file-convention set (app/favicon.ico, app/icon.png,
// app/apple-icon.png) rather than merging with it, confirmed by testing:
// adding an `icons.icon` array dropped the icon.png/apple-icon.png <link>
// tags entirely. public/favicon-16x16.png and favicon-32x32.png stay as
// plain static files -- unlinked, but reachable at their conventional
// paths -- since favicon.ico already carries 16x16/32x32 frames internally
// and losing the higher-value auto-linked icon.png/apple-icon.png isn't
// worth adding those two explicit link tags.

const DIRECTION_CONTRACT = `
THESIS: Zolvex sends a trained person to your door and the site should feel like that person looks — turned out, unmistakable, easy to flag down. The world is the yellow work uniform: a warm grey street, black type, and one high-visibility yellow that means "act".
OWN-WORLD: Warm grey ground (#F1F0EC), near-black type (#141210), one hi-vis yellow (#F7D14C) carrying every primary action, the active nav pill, the running strip and the highlighted headline word. Yellow is a FILL, never text on a light ground; where the yellow family must be read it darkens to #8A5D00. Archivo Black stamps the display line in uppercase; Archivo sets section heads in sentence case, body, nav and buttons. White cards on the grey ground, fully rounded, one soft offset shadow. Carbon (#141210) is the single dark beat.
STORY: A homeowner or business owner lands on a plain promise, sees the range in a rail they can push through with a thumb, reads why the person at the door is trustworthy, and books a visit.
FIRST VIEWPORT: Warm grey. A pill nav floats with the current section lit yellow. Left: a huge Archivo Black headline with its last line in the readable gold, a plain paragraph, a yellow "Book a visit" pill beside an outlined "All services", and a rating card that stays hidden until real reviews exist. Right: a device panel showing real published reviews, overlapping a technician photo slot.
FORM: user-pinned reference image (v2 redesign brief). Seed key 39875dcf rolled and set aside — a pinned brief outranks the roll.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable} ${anton.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream font-sora text-ink">
        <script
          type="text/plain"
          id="direction-contract"
          data-seed="39875dcf"
          dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }}
        />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
