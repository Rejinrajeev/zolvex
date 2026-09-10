"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { IconArrow, IconStar } from "./icons";
import { cloudinaryTransform } from "./Photo";
import { splitLastWord } from "@/lib/split-last-word";

const DEFAULT_HEADLINE = "Your space, well kept";
const DEFAULT_SUBHEADLINE =
  "Zolvex Home Services covers cleaning, maintenance, repairs and installation for homes and businesses — trained, background-verified people, on schedule, every visit logged.";

const EASE = [0.16, 1, 0.3, 1] as const;

// The hero artwork, served as an optimized WebP (the full-resolution PNG
// source stays untracked alongside it). An admin-supplied URL overrides it.
const DEFAULT_HERO_IMAGE = "/heroimg.webp";

const lineV = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function Hero({
  onBookNow,
  headline,
  subheadline,
  imageUrl,
  rating,
  reviewCount,
}: {
  onBookNow: () => void;
  headline?: string;
  subheadline?: string;
  imageUrl?: string | null;
  rating?: string | null;
  reviewCount?: string | null;
}) {
  const { rest, last } = splitLastWord(headline || DEFAULT_HEADLINE);

  // The hero artwork: an admin-supplied URL wins, otherwise the bundled
  // asset. A missing or unreadable file removes the image rather than
  // leaving a broken icon behind.
  const [heroImgOk, setHeroImgOk] = useState(true);
  const heroSrc = imageUrl ? cloudinaryTransform(imageUrl, 720) : DEFAULT_HERO_IMAGE;

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

        {/* The hero visual. The supplied artwork already carries the phone,
            the review list and the technician as a single composition, so a
            live panel here would only duplicate it. Real, admin-managed
            testimonials still run in the Reviews section further down. */}
        <motion.div
          className="relative mt-2 lg:mt-0"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.28 }}
        >
          {heroSrc && heroImgOk ? (
            // eslint-disable-next-line @next/next/no-img-element -- static asset / Cloudinary CDN; next/image not configured for this project
            <img
              src={heroSrc}
              alt="A Zolvex technician in uniform holding a mop, beside a phone showing the company's reviews"
              width={1148}
              height={1370}
              fetchPriority="high"
              onError={() => setHeroImgOk(false)}
              className="pointer-events-none mx-auto block h-auto w-full max-w-[24rem] select-none object-contain drop-shadow-[0_44px_72px_rgba(20,18,16,0.3)] lg:mr-0 lg:ml-auto lg:max-w-[28rem] xl:max-w-[31rem]"
            />
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
