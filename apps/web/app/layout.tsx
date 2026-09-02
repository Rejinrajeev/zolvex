import type { Metadata } from "next";
import { Anton, Sora } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/MotionProvider";

// "Fresh Start" world — two families across the whole site.
// Anton: display only (wordmark + marketing headlines). Sora: everything else.
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Zolvex Home Services — Cleaning, Maintenance & Repairs, Done Right",
  description:
    "Zolvex Home Services covers cleaning, maintenance, repairs and installation for homes and businesses — trained, background-verified technicians, on schedule, every visit logged.",
};

const DIRECTION_CONTRACT = `
THESIS: Zolvex is the home-and-commercial services company that keeps a space clean, working and cared for, so the site is bright, plainspoken and in motion — it refuses the dark industrial-ledger look that buried the reassurance under a filing metaphor.
OWN-WORLD: Warm off-white ground (#FBFAF5), near-black ink text (#16211C); one confident spring green (#0FB877) carries every CTA and highlight; warm gold (#EED77B), soft sky (#A9E1EC) and deep forest (#0C3A2C) tint the section blocks. Anton, compressed and uppercase, set huge for display; Sora for everything else. Fully rounded corners (pill buttons, 28px cards), soft organic blob shapes drifting behind content, big photography in rounded frames.
STORY: A homeowner or business owner lands, reads "one team keeps your space clean, working and cared for — on schedule, every visit logged" in one breath, scrolls through what is covered / why it is reliable / the proof, and books a visit.
FIRST VIEWPORT: Full-bleed cream. A drifting green blob top-right. A huge Anton headline left, one line of Sora sub, a green pill "Book a visit" beside a ghost "See what we cover". Bottom-right, a slowly rotating seal reads "ON TIME · EVERY VISIT LOGGED ·". A rounded hero photograph sits right on desktop, below the copy on mobile.
FORM: travelessentia.com's fresh editorial-playful world, pinned by the user; not on the concept-seed list. Seed key 616428b4 (three rolls declined, then the user pinned a reference).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream font-sora text-ink">
        <script
          type="text/plain"
          id="direction-contract"
          data-seed="616428b4"
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
