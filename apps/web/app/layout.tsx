import type { Metadata } from "next";
import { Zilla_Slab, Archivo, Special_Elite } from "next/font/google";
import "./globals.css";

const zillaSlab = Zilla_Slab({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
});

const specialElite = Special_Elite({
  variable: "--font-stamp",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Zolvex — Commercial Cleaning, On the Record",
  description:
    "Zolvex delivers commercial cleaning with 100% dedication, on time, every visit logged.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${zillaSlab.variable} ${archivo.variable} ${specialElite.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-body">
        {/*
          THESIS: Zolvex proves reliability the way a ledger does — an
          accumulating, timestamped record — refusing the industry's default
          of pastel spray-bottle branding and soft rounded cards.
          OWN-WORLD: near-black (#161B1F) ledger ground, warm-white (#FEFEFD)
          paper sections, ruled grids, punch-perforation edges, gold
          (#EED77B) ink-stamp accents on olive-gold (#ADA477) and warm-gray
          (#616054) structure; Zilla Slab display, Archivo body, Special
          Elite for stamped timestamps and numerals.
          STORY: a facilities buyer scrolls past proof, not promises — every
          completed job reads as a stamped ledger entry — and books, trusting
          a company that clearly tracks its own discipline.
          FIRST VIEWPORT: full-bleed dark ruled-ledger hero; today's date and
          a gold-stamped tally line at top; headline set as the ledger's
          boldest entry; one-line sub; Book Now as the next waiting
          punch-line, bottom-left.
          FORM: The Punch-Clock Ledger, candidate 5 of 7 grounded directions,
          seed key cb273c1a.
          FINISH: unreviewed and undocumented is unfinished; this build ends
          with the finish review, the verdict, DESIGN.md, and every shipping
          raster carrying its provenance.
        */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
