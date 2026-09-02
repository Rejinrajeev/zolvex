import { Reveal } from "./motion-primitives";
import { IconChevron } from "./icons";

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
}

export function FAQ({ faqs, onBookNow }: { faqs: PublicFaq[]; onBookNow: () => void }) {
  return (
    <section className="bg-cream px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[80rem]">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl">
              Good
              <br />
              questions
            </h2>
            <p className="mt-5 max-w-xs font-sora text-lg leading-relaxed text-moss">
              The questions we get before the first visit. Still not sure? A quick
              visit answers most of them.
            </p>
            <button
              type="button"
              onClick={onBookNow}
              className="mt-6 inline-flex items-center gap-1.5 font-sora text-sm font-semibold text-green-ink"
            >
              Book a visit
              <IconChevron className="h-4 w-4 -rotate-90" />
            </button>
          </Reveal>

          <Reveal delay={0.1}>
            {faqs.length === 0 ? (
              <p className="font-sora text-base text-moss">
                Answers land here once they&apos;re published from the admin panel.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {faqs.map((faq) => (
                  <details
                    key={faq.id}
                    className="group rounded-2xl bg-mist px-5 py-4 transition-colors open:bg-paper open:ring-1 open:ring-ink/5"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-sora text-lg font-semibold text-ink marker:content-none">
                      {faq.question}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green/15 text-green-ink transition-transform duration-300 group-open:rotate-180">
                        <IconChevron className="h-4 w-4" />
                      </span>
                    </summary>
                    <p className="pretty mt-3 max-w-2xl font-sora leading-relaxed text-moss">
                      {faq.answer}
                    </p>
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
