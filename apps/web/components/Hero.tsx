"use client";

import { useEffect, useState } from "react";
import { IconClock } from "./icons";

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

export function Hero({ onBookNow }: { onBookNow: () => void }) {
  const today = useTodayStamp();

  return (
    <section
      id="top"
      className="ledger-ground-dark relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-5 pb-16 pt-32 sm:px-8 lg:px-12"
    >
      {/* corner vignette so the grid recedes rather than tiling flat */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(238,215,123,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[90rem]">
        <div className="mb-8 flex flex-wrap items-center gap-3 font-stamp text-[0.72rem] uppercase tracking-wide text-gold/90">
          <span className="tabular" suppressHydrationWarning>
            {today ?? " "}
          </span>
          <span className="h-3 w-px bg-gold/30" aria-hidden />
          <span className="stamp-rotate inline-flex items-center gap-1.5 rounded-sm border border-gold/60 px-2 py-0.5">
            <IconClock className="h-3 w-3" />
            Status: On Duty
          </span>
        </div>

        <h1 className="max-w-4xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] text-paper">
          Commercial cleaning you can set your clock to.
        </h1>

        {/* one committed, continuous ink-stroke — the raise from Floated-Pigment Marbling */}
        <svg
          viewBox="0 0 520 24"
          className="mt-3 h-4 w-64 text-gold sm:w-80"
          aria-hidden
          preserveAspectRatio="none"
        >
          <path
            d="M4 18 C 120 6, 260 22, 400 8 S 500 4, 516 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1,
              animation: "draw-underline 1.1s var(--ease-out-exp) 0.5s forwards",
            }}
          />
        </svg>
        <style>{`@keyframes draw-underline { to { stroke-dashoffset: 0; } }`}</style>

        <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-paper/80 sm:text-xl">
          Every visit logged, every job on time. Zolvex keeps commercial
          spaces audit-ready — without you lifting a finger.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onBookNow}
            className="group relative inline-flex items-center gap-2 bg-gold px-8 py-4 font-display text-base font-semibold text-ink shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            Book Now
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
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
