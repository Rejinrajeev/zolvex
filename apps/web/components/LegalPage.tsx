import type { ReactNode } from "react";
import Link from "next/link";
import { IconArrow } from "./icons";

export interface LegalSectionData {
  /** e.g. "1. Services Overview" — the leading number is kept in the heading. */
  title: string;
  body: ReactNode;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/^\d+[.)]?\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function LegalPage({
  title,
  updated,
  intro,
  sections,
  children,
}: {
  title: string;
  /** Human-readable date, e.g. "2 September 2026". */
  updated?: string;
  intro?: ReactNode;
  sections?: LegalSectionData[];
  /** Simple single-block content (kept for pages that don't need sections). */
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="mx-auto flex h-20 w-full max-w-[80rem] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="font-anton text-2xl uppercase tracking-tight text-ink">
          Zolvex
        </Link>
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 font-sora text-sm font-semibold text-green-ink"
        >
          <IconArrow aria-hidden className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
          Back to site
        </Link>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
        <h1 className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl">
          {title}
        </h1>
        {updated && (
          <p className="mt-4 font-sora text-sm font-medium text-moss">Last updated {updated}</p>
        )}

        {intro && <div className="legal-body mt-7">{intro}</div>}

        {sections && sections.length > 0 && (
          <>
            <nav
              aria-label="On this page"
              className="mt-10 rounded-[1.5rem] bg-mist p-6 sm:p-7"
            >
              <p className="font-anton text-sm uppercase tracking-tight text-ink">On this page</p>
              <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                {sections.map((section) => (
                  <li key={section.title}>
                    <a
                      href={`#${slugify(section.title)}`}
                      className="font-sora text-sm text-moss underline decoration-transparent underline-offset-2 transition-colors hover:text-green-ink hover:decoration-green-ink"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-12 flex flex-col gap-10">
              {sections.map((section) => (
                <section key={section.title} id={slugify(section.title)} className="scroll-mt-24">
                  <h2 className="font-anton text-xl uppercase tracking-tight text-ink sm:text-2xl">
                    {section.title}
                  </h2>
                  <div className="legal-body mt-3">{section.body}</div>
                </section>
              ))}
            </div>
          </>
        )}

        {children && <div className="legal-body mt-8 max-w-xl">{children}</div>}
      </main>
    </div>
  );
}
