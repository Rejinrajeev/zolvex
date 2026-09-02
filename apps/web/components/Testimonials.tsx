import type { CSSProperties } from "react";
import { Reveal } from "./motion-primitives";
import { IconStar, IconStarOutline, IconArrow } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicTestimonial {
  id: string;
  name: string;
  rating: number;
  message: string;
}

const TINTS = ["bg-paper", "bg-sky/55", "bg-gold/45"] as const;

// At or above this many reviews the wall splits into two rows running in
// opposite directions; below it, one row (or a static cluster under ~3).
const TWO_ROW_THRESHOLD = 6;
// Pad a row to at least this many cards so a single half already overflows
// the widest viewport and the translateX(-50%) loop never shows a seam.
const MIN_ROW_CARDS = 8;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < rating ? (
          <IconStar key={i} className="h-4 w-4 text-gold" />
        ) : (
          <IconStarOutline key={i} className="h-4 w-4 text-ink/20" />
        )
      )}
    </div>
  );
}

function TestimonialCard({
  testimonial,
  index,
  hidden = false,
}: {
  testimonial: PublicTestimonial;
  index: number;
  hidden?: boolean;
}) {
  return (
    <figure
      aria-hidden={hidden || undefined}
      className={`mr-4 flex h-[11.5rem] w-[16.5rem] shrink-0 flex-col rounded-[1.5rem] ${TINTS[index % TINTS.length]} p-6 sm:mr-6 sm:h-[12.5rem] sm:w-[19rem]`}
    >
      <Stars rating={testimonial.rating} />
      <blockquote className="pretty mt-3 line-clamp-3 flex-1 font-sora text-[0.95rem] leading-relaxed text-ink">
        &ldquo;{testimonial.message}&rdquo;
      </blockquote>
      <figcaption className="mt-4 font-anton text-sm uppercase tracking-tight text-moss">
        {testimonial.name}
      </figcaption>
    </figure>
  );
}

function fillRow(items: PublicTestimonial[], min: number): PublicTestimonial[] {
  if (items.length === 0) return [];
  const out = [...items];
  while (out.length < min) out.push(...items);
  return out;
}

function MarqueeRow({
  items,
  reverse = false,
  durationSeconds,
}: {
  items: PublicTestimonial[];
  reverse?: boolean;
  durationSeconds: number;
}) {
  const filled = fillRow(items, MIN_ROW_CARDS);
  const track = [...filled, ...filled];
  return (
    <div className="cards-marquee-group">
      <div
        className={`cards-marquee${reverse ? " cards-marquee--reverse" : ""}`}
        style={{ "--cards-marquee-duration": `${durationSeconds}s` } as CSSProperties}
      >
        {track.map((testimonial, i) => (
          <TestimonialCard
            key={`${testimonial.id}-${i}`}
            testimonial={testimonial}
            index={i}
            hidden={i >= items.length}
          />
        ))}
      </div>
    </div>
  );
}

export function Testimonials({
  testimonials,
  googleReviewUrl,
}: {
  testimonials: PublicTestimonial[];
  googleReviewUrl?: string | null;
}) {
  const animated = testimonials.length >= 3;
  const twoRows = testimonials.length >= TWO_ROW_THRESHOLD;
  const split = Math.ceil(testimonials.length / 2);

  return (
    <section className="bg-mist py-16 sm:py-24">
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            What clients
            <br />
            tell us
          </h2>
          {googleReviewUrl && (
            <a
              href={safeHref(googleReviewUrl)}
              target="_blank"
              rel="noreferrer noopener"
              className="group inline-flex items-center gap-2 rounded-full border-2 border-ink px-6 py-3 font-sora text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              Read our Google reviews
              <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          )}
        </Reveal>
      </div>

      {testimonials.length === 0 ? (
        <div className="mx-auto max-w-[80rem] px-5 sm:px-8">
          <Reveal as="p" delay={0.1} className="mt-14 font-sora text-base text-moss">
            Real client reviews land here once they&apos;re published from the admin panel.
          </Reveal>
        </div>
      ) : !animated ? (
        <div className="mx-auto mt-12 flex max-w-[80rem] flex-wrap justify-center gap-6 px-5 sm:px-8">
          {testimonials.map((testimonial, i) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} index={i} />
          ))}
        </div>
      ) : (
        <Reveal className="mt-10 flex flex-col gap-3 sm:mt-12 sm:gap-5">
          {twoRows ? (
            <>
              <MarqueeRow items={testimonials.slice(0, split)} durationSeconds={46} />
              <MarqueeRow items={testimonials.slice(split)} reverse durationSeconds={54} />
            </>
          ) : (
            <MarqueeRow items={testimonials} durationSeconds={46} />
          )}
        </Reveal>
      )}
    </section>
  );
}
