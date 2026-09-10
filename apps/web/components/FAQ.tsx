import { Reveal } from "./motion-primitives";
import { IconChevron } from "./icons";

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
}

export function FAQ({ faqs, onBookNow }: { faqs: PublicFaq[]; onBookNow: () => void }) {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[84rem]">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-carbon">
              Good <span className="text-sun-ink">questions</span>
            </h2>
            <p className="mt-5 max-w-xs text-lg leading-[1.6] text-ash">
              The questions we get before the first visit. Still not sure? A quick
              visit answers most of them.
            </p>
            <button
              type="button"
              onClick={onBookNow}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sun-ink"
            >
              Book a visit
              <IconChevron className="h-4 w-4 -rotate-90" />
            </button>
          </Reveal>

          <Reveal delay={0.1}>
            {faqs.length === 0 ? (
              <p className="rounded-[1.75rem] bg-shell p-10 text-center text-base text-ash">
                Answers land here once they are published from the admin panel.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {faqs.map((faq) => (
                  <details
                    key={faq.id}
                    className="group rounded-2xl bg-shell px-5 py-4 transition-colors open:bg-shell"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-carbon marker:content-none">
                      {faq.question}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bone text-carbon transition-[transform,background-color] duration-300 group-open:rotate-180 group-open:bg-sun">
                        <IconChevron className="h-4 w-4" />
                      </span>
                    </summary>
                    <p className="pretty mt-3 max-w-2xl leading-relaxed text-ash">{faq.answer}</p>
                  </details>
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
