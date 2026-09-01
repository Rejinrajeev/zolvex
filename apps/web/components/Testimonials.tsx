import { Stamped } from "./Stamped";
import { IconStar, IconStarOutline } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicTestimonial {
  id: string;
  name: string;
  rating: number;
  message: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < rating ? (
          <IconStar key={i} className="h-4 w-4 text-gold" />
        ) : (
          <IconStarOutline key={i} className="h-4 w-4 text-slate/40" />
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
    <section className="bg-paper-dim px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              On the client's record.
            </h2>
            {googleReviewUrl && (
              <a
                href={safeHref(googleReviewUrl)}
                target="_blank"
                rel="noreferrer noopener"
                className="border-2 border-ink px-5 py-2.5 font-display text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Read our reviews on Google
              </a>
            )}
          </div>
        </Stamped>

        {testimonials.length === 0 ? (
          <p className="mt-12 font-body text-sm text-slate">
            On file — pending. Real client reviews land here once published from the admin panel.
          </p>
        ) : (
          <div
            role="region"
            aria-label="Client reviews, scroll horizontally for more"
            tabIndex={0}
            className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-4"
          >
            {testimonials.map((review, i) => (
              <Stamped
                key={review.id}
                delayMs={i * 80}
                className="w-80 shrink-0 snap-start sm:w-96"
              >
                <figure className="flex h-full flex-col border border-ink/12 bg-paper p-6">
                  <Stars rating={review.rating} />
                  <blockquote className="mt-4 flex-1 font-body text-lg italic leading-relaxed text-ink">
                    "{review.message}"
                  </blockquote>
                  <figcaption className="mt-5 border-t border-ink/10 pt-4 font-body text-sm text-slate">
                    {review.name}
                  </figcaption>
                </figure>
              </Stamped>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
