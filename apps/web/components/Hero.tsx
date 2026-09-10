"use client";

import { motion } from "motion/react";
import { IconArrow, IconCheck, IconStar } from "./icons";
import { cloudinaryTransform } from "./Photo";
import { splitLastWord } from "@/lib/split-last-word";
import type { PublicTestimonial } from "./Testimonials";

const DEFAULT_HEADLINE = "Your space, well kept";
const DEFAULT_SUBHEADLINE =
  "Zolvex Home Services covers cleaning, maintenance, repairs and installation for homes and businesses — trained, background-verified people, on schedule, every visit logged.";

const EASE = [0.16, 1, 0.3, 1] as const;

// Shown in the panel only while no reviews are published. These are the
// trades Zolvex covers (PRODUCT.md), not claims about a particular visit.
const COVERAGE = ["Cleaning", "AC service", "Plumbing", "Electrical", "Handyman", "Painting"];

const lineV = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

function Stars({ value, className = "" }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          className={`h-3.5 w-3.5 ${i <= rounded ? "text-sun-deep" : "text-carbon/15"}`}
        />
      ))}
    </span>
  );
}

export function Hero({
  onBookNow,
  headline,
  subheadline,
  imageUrl,
  rating,
  reviewCount,
  reviews = [],
}: {
  onBookNow: () => void;
  headline?: string;
  subheadline?: string;
  imageUrl?: string | null;
  rating?: string | null;
  reviewCount?: string | null;
  reviews?: PublicTestimonial[];
}) {
  const { rest, last } = splitLastWord(headline || DEFAULT_HEADLINE);
  const shown = reviews.slice(0, 3);

  // The rating card is real or it is absent. A blank field in the admin
  // panel means Zolvex has no published rating yet, and inventing one is
  // exactly what PRODUCT.md forbids.
  const ratingValue = rating ? Number.parseFloat(rating) : NaN;
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;

  return (
    <section
      id="top"
      className="relative overflow-hidden px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40"
    >
      <div className="relative mx-auto grid w-full max-w-[84rem] items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <motion.h1
            className="font-archivo-black text-[clamp(2.75rem,9vw,6rem)] uppercase leading-[0.9] tracking-[-0.03em] text-carbon"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } } }}
          >
            <motion.span className="block" variants={lineV}>
              {rest}
            </motion.span>
            <motion.span className="block text-sun-ink" variants={lineV}>
              {last}
            </motion.span>
          </motion.h1>

          <motion.p
            className="pretty mt-6 max-w-[34rem] text-lg leading-[1.6] text-ash sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
          >
            {subheadline || DEFAULT_SUBHEADLINE}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.58 }}
          >
            <button
              type="button"
              onClick={onBookNow}
              className="group inline-flex items-center gap-2 rounded-full bg-sun px-7 py-4 text-base font-semibold text-carbon shadow-[0_18px_36px_-16px_rgba(20,18,16,0.55)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-sun-deep active:translate-y-0"
            >
              Book a visit
              <IconArrow
                aria-hidden
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </button>
            <a
              href="#services"
              className="rounded-full border-2 border-carbon px-7 py-4 text-base font-semibold text-carbon transition-colors duration-200 hover:bg-carbon hover:text-bone"
            >
              All services
            </a>
          </motion.div>

          {hasRating && (
            <motion.div
              className="mt-9 inline-flex items-center gap-4 rounded-[1.5rem] bg-shell px-5 py-4 shadow-[0_20px_44px_-26px_rgba(20,18,16,0.5)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
            >
              <span className="flex items-center gap-2">
                <IconStar aria-hidden className="h-6 w-6 text-sun-deep" />
                <span className="tabular font-archivo-black text-2xl leading-none tracking-[-0.02em] text-carbon">
                  {ratingValue.toFixed(1)}
                </span>
              </span>
              <span className="h-9 w-px bg-carbon/10" />
              <span className="text-sm leading-snug text-ash">
                Average rating
                {reviewCount ? (
                  <>
                    <br />
                    <span className="font-semibold text-carbon">
                      from {reviewCount} Google reviews
                    </span>
                  </>
                ) : null}
              </span>
            </motion.div>
          )}
        </div>

        {/* The panel is the product's own evidence: published reviews when
            they exist, the trades covered while they do not. It is never a
            screenshot of invented activity. */}
        <motion.div
          className="relative mt-2 lg:mt-0"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.28 }}
        >
          <div className="relative z-10 mx-auto max-w-[26rem] overflow-hidden rounded-[2.25rem] bg-shell shadow-[0_48px_96px_-44px_rgba(20,18,16,0.6)] lg:mr-0 lg:ml-auto">
            <div className="flex items-center gap-3 border-b border-carbon/[0.07] px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun font-archivo-black text-base text-carbon">
                Z
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-carbon">
                  Zolvex Home Services
                </span>
                {hasRating ? (
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <Stars value={ratingValue} />
                    <span className="tabular text-xs text-ash">
                      {ratingValue.toFixed(1)}
                      {reviewCount ? ` (${reviewCount})` : ""}
                    </span>
                  </span>
                ) : (
                  <span className="mt-0.5 block text-xs text-ash">
                    Home &amp; commercial · Kerala
                  </span>
                )}
              </span>
            </div>

            {shown.length > 0 ? (
              <ul className="divide-y divide-carbon/[0.07]">
                {shown.map((review, i) => (
                  <motion.li
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE, delay: 0.75 + i * 0.1 }}
                    className="px-5 py-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bone text-xs font-semibold text-carbon">
                        {review.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate text-sm font-semibold text-carbon">
                        {review.name}
                      </span>
                      <Stars value={review.rating} className="ml-auto shrink-0" />
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ash">
                      {review.message}
                    </p>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="p-5">
                <p className="text-sm font-semibold text-carbon">One team, the whole list</p>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {COVERAGE.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.7 + i * 0.08 }}
                      className="flex items-center gap-2 rounded-xl bg-bone px-3 py-2.5 text-sm font-medium text-carbon"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun text-carbon">
                        <IconCheck className="h-3.5 w-3.5" />
                      </span>
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* The technician slot. Empty until a real cut-out is uploaded — a
              geometric mask faking a photographic edge reads worse than the
              honest absence, so nothing stands in for it. */}
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary CDN; next/image not configured for this project
            <img
              src={cloudinaryTransform(imageUrl, 720)}
              alt=""
              className="pointer-events-none absolute -bottom-4 left-0 z-20 hidden w-[15rem] select-none object-contain drop-shadow-[0_28px_40px_rgba(20,18,16,0.35)] lg:block xl:w-[17rem]"
            />
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
