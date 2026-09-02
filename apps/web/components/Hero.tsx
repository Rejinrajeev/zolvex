"use client";

import { motion } from "motion/react";
import { IconArrow, IconCheck } from "./icons";
import { Seal, Blob } from "./motion-primitives";
import { splitLastWord } from "@/lib/split-last-word";

const DEFAULT_HEADLINE = "Your space, well kept";
const DEFAULT_SUBHEADLINE =
  "Zolvex Home Services covers cleaning, maintenance, repairs and installation for homes and businesses — trained, background-verified people, on schedule, every visit logged.";

const EASE = [0.16, 1, 0.3, 1] as const;
const ZONES = ["Kitchen", "Bathrooms", "Bedrooms", "Living areas", "Balcony", "Utility"];

const wordV = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function Hero({
  onBookNow,
  headline,
  subheadline,
}: {
  onBookNow: () => void;
  headline?: string;
  subheadline?: string;
}) {
  const { rest, last } = splitLastWord(headline || DEFAULT_HEADLINE);

  return (
    <section
      id="top"
      className="relative flex flex-col justify-center overflow-hidden bg-cream px-5 pb-20 pt-32 sm:px-8 sm:pb-24 sm:pt-40 lg:min-h-[90vh]"
    >
      <Blob
        color="var(--color-green)"
        className="right-[-11rem] top-[-8rem] h-[24rem] w-[24rem] opacity-15"
        distance={90}
      />
      <Blob
        color="var(--color-sky)"
        className="bottom-[-12rem] left-[-9rem] h-[22rem] w-[22rem] opacity-45"
        distance={60}
      />

      <div className="relative mx-auto grid w-full max-w-[80rem] items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-14">
        <div>
          <motion.h1
            className="font-anton text-[12vw] uppercase leading-[0.9] tracking-tight text-ink sm:text-6xl lg:text-7xl"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } } }}
          >
            <motion.span className="block" variants={wordV}>
              {rest}
            </motion.span>
            <motion.span className="block text-green-ink" variants={wordV}>
              {last}
            </motion.span>
          </motion.h1>

          <motion.p
            className="pretty mt-6 max-w-xl font-sora text-lg leading-relaxed text-moss sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
          >
            {subheadline || DEFAULT_SUBHEADLINE}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.58 }}
          >
            <button
              type="button"
              onClick={onBookNow}
              className="group inline-flex items-center gap-2 rounded-full bg-green px-7 py-4 font-sora text-base font-semibold text-forest shadow-[0_18px_36px_-14px_rgba(15,184,119,0.75)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Book a visit
              <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#services"
              className="rounded-full border-2 border-ink px-7 py-4 font-sora text-base font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              See what we cover
            </a>
          </motion.div>
        </div>

        {/* Authored hero graphic — a live "today's visit" panel, not a stock photo. */}
        <motion.div
          className="relative mt-4 lg:mt-0"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.28 }}
        >
          <div className="overflow-hidden rounded-[2rem] bg-paper shadow-[0_44px_100px_-40px_rgba(12,58,44,0.45)] ring-1 ring-ink/5">
            <div className="flex items-center justify-between bg-forest px-6 py-4 text-cream">
              <span className="font-anton text-lg uppercase tracking-tight">Today&apos;s visit</span>
              <span className="tabular font-sora text-sm text-cream/70">in progress</span>
            </div>
            <div className="p-6">
              <ul className="grid grid-cols-2 gap-2.5">
                {ZONES.map((zone, i) => (
                  <motion.li
                    key={zone}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: 0.7 + i * 0.09 }}
                    className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2.5 font-sora text-sm font-medium text-ink"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green text-forest">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    {zone}
                  </motion.li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-green px-4 py-3 font-sora text-sm font-semibold text-forest">
                <span>All 6 areas done</span>
                <span className="tabular font-normal text-forest/70">logged 08:12</span>
              </div>
            </div>
          </div>

          <Seal
            filled
            size={150}
            className="absolute -top-14 right-0 hidden text-forest sm:block lg:-right-12"
          />
        </motion.div>
      </div>
    </section>
  );
}
