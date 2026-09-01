import type { ReactNode } from "react";
import { IconArrow } from "./icons";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="mx-auto flex h-20 w-full max-w-[80rem] items-center justify-between px-5 sm:px-8">
        <a href="/" className="font-anton text-2xl uppercase tracking-tight text-ink">
          Zolvex
        </a>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 font-sora text-sm font-semibold text-green-ink"
        >
          <IconArrow aria-hidden className="h-4 w-4 rotate-180" />
          Back to site
        </a>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl">
          {title}
        </h1>
        <div className="pretty mt-8 max-w-xl font-sora text-lg leading-relaxed text-moss">
          {children}
        </div>
      </main>
    </div>
  );
}
