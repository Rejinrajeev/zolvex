import { Stamped } from "./Stamped";
import { IconStar, IconStarOutline } from "./icons";

/**
 * No real reviews exist yet (PRODUCT.md — Evidence on Hand). These are
 * clearly-labeled placeholder entries in the exact shape a real review takes
 * — role-based labels, not invented personal names — so the section reads
 * honestly rather than fabricating specific people.
 */
const PLACEHOLDER_REVIEWS = [
  {
    role: "Office Manager, Commercial Tenant",
    rating: 5,
    quote:
      "Sample entry — real client feedback lands here once published from the admin panel.",
  },
  {
    role: "Facilities Lead, Retail Space",
    rating: 5,
    quote:
      "Sample entry — this is the layout a real review will render in, name and quote included.",
  },
  {
    role: "Operations Manager, Commercial Site",
    rating: 4,
    quote: "Sample entry — star rating and comment both pull from the backend once live.",
  },
  {
    role: "Property Manager, Multi-Tenant Building",
    rating: 5,
    quote: "Sample entry — the horizontal strip scrolls further as more reviews are added.",
  },
];

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

export function Testimonials() {
  return (
    <section className="bg-paper-dim px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              On the client’s record.
            </h2>
            <p className="max-w-sm font-body text-sm text-slate">
              Placeholder entries shown below — real reviews replace these as
              clients leave them.
            </p>
          </div>
        </Stamped>

        <div className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:thin]">
          {PLACEHOLDER_REVIEWS.map((review, i) => (
            <Stamped
              key={review.role}
              delayMs={i * 80}
              className="w-80 shrink-0 snap-start sm:w-96"
            >
              <figure className="flex h-full flex-col border border-ink/12 bg-paper p-6">
                <Stars rating={review.rating} />
                <blockquote className="mt-4 flex-1 font-body text-lg italic leading-relaxed text-ink">
                  “{review.quote}”
                </blockquote>
                <figcaption className="mt-5 border-t border-ink/10 pt-4 font-body text-sm text-slate">
                  {review.role}
                </figcaption>
              </figure>
            </Stamped>
          ))}
        </div>
      </div>
    </section>
  );
}
