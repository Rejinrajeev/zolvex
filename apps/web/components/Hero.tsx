"use client";

import { useEffect, useState } from "react";
import { IconClock, IconArrow } from "./icons";
import { splitLastWord } from "@/lib/split-last-word";

function useTodayStamp() {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    setDate(
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date())
    );
  }, []);
  return date;
}

const DEFAULT_HEADLINE = "Commercial cleaning you can set your clock to.";
const DEFAULT_SUBHEADLINE =
  "Every visit logged, every job on time. Zolvex keeps commercial spaces audit-ready — without you lifting a finger.";

export function Hero({
  onBookNow,
  headline,
  subheadline,
}: {
  onBookNow: () => void;
  headline?: string;
  subheadline?: string;
}) {
  const today = useTodayStamp();
  const { rest, last } = splitLastWord(headline || DEFAULT_HEADLINE);

  return (
    <section
      id="top"
      className="ledger-ground-dark relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-8 lg:px-12"
    >
      {/* corner vignette so the grid recedes rather than tiling flat */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(238,215,123,0.14), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[90rem]">
        <div className="mb-8 flex flex-wrap items-center gap-3 font-stamp text-[0.72rem] uppercase tracking-wide text-gold/90">
          <span className="tabular" suppressHydrationWarning>
            {today ?? " "}
          </span>
          <span className="h-3 w-px bg-gold/30" aria-hidden />
          <span className="stamp-rotate inline-flex items-center gap-1.5 rounded-sm border border-gold/60 px-2 py-0.5">
            <IconClock className="h-3 w-3" />
            Status: On Duty
          </span>
          <span className="h-3 w-px bg-gold/30" aria-hidden />
          <span className="tabular">Visit Log — Entry Open</span>
        </div>

        <h1 className="balance max-w-4xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] text-paper">
          {rest}
          <span className="border-b-4 border-gold">{last}</span>
        </h1>

        <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-paper/80 sm:text-xl">
          {subheadline || DEFAULT_SUBHEADLINE}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onBookNow}
            className="group relative inline-flex items-center gap-2 bg-gold px-8 py-4 font-display text-base font-semibold text-ink shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            Book Now
            <IconArrow
              aria-hidden
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </button>
          <a
            href="#services"
            className="font-body text-paper/75 underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold"
          >
            See what we cover
          </a>
        </div>
      </div>
    </section>
  );
}
