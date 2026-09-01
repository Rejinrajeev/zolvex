import { Reveal, Stagger, StaggerItem } from "./motion-primitives";
import { IconStar, IconStarOutline, IconArrow } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicTestimonial {
  id: string;
  name: string;
  rating: number;
  message: string;
}

const TINTS = ["bg-paper", "bg-sky/55", "bg-gold/45"] as const;

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

export function Testimonials({
  testimonials,
  googleReviewUrl,
}: {
  testimonials: PublicTestimonial[];
  googleReviewUrl?: string | null;
}) {
  return (
    <section className="bg-mist px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[80rem]">
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

        {testimonials.length === 0 ? (
          <Reveal as="p" delay={0.1} className="mt-14 font-sora text-base text-moss">
            Real client reviews land here once they&apos;re published from the admin panel.
          </Reveal>
        ) : (
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((review, i) => (
              <StaggerItem
                key={review.id}
                as="figure"
                className={`flex h-full flex-col rounded-[1.75rem] ${TINTS[i % TINTS.length]} p-7`}
              >
                <Stars rating={review.rating} />
                <blockquote className="pretty mt-4 flex-1 font-sora text-lg leading-relaxed text-ink">
                  &ldquo;{review.message}&rdquo;
                </blockquote>
                <figcaption className="mt-6 font-anton text-sm uppercase tracking-tight text-moss">
                  {review.name}
                </figcaption>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
