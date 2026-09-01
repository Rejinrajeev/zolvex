import { Stamped } from "./Stamped";
import { IconChevron } from "./icons";

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
}

export function FAQ({ faqs }: { faqs: PublicFaq[] }) {
  return (
    <section className="bg-paper px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Questions on the record.
            </h2>

            {faqs.length === 0 ? (
              <p className="mt-12 font-body text-sm text-slate">
                On file — pending. Answers land here once published from the admin panel.
              </p>
            ) : (
              <div className="mt-12 divide-y divide-ink/12 border-t border-ink/12">
                {faqs.map((faq) => (
                  <details key={faq.id} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-body text-lg font-medium text-ink marker:content-none">
                      {faq.question}
                      <IconChevron className="h-5 w-5 shrink-0 text-olive-ink transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 max-w-2xl font-body leading-relaxed text-slate">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </Stamped>
      </div>
    </section>
  );
}
