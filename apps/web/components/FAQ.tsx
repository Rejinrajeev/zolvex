import { Stamped } from "./Stamped";
import { IconChevron } from "./icons";

const FAQS = [
  {
    q: "What areas and building types do you service?",
    a: "We work with offices, retail spaces, and commercial facilities. Tell us your space and preferred schedule when you book, and we'll confirm coverage before your first visit.",
  },
  {
    q: "How is a visit actually verified?",
    a: "Every visit closes with an on-site walkthrough log against the same checklist, every time — the same discipline you'd expect from any properly run commercial operation.",
  },
  {
    q: "Can we set a recurring schedule?",
    a: "Yes — daily, weekly, or a custom cadence you choose. We'll help you size it to your space when you book.",
  },
  {
    q: "What if a visit doesn't meet the checklist?",
    a: "Tell us and we'll return to make it right. The log exists so an off day is something we can see and correct, not something that gets buried.",
  },
  {
    q: "How do we get a quote?",
    a: "Submit an enquiry with your space details and preferred schedule — we'll follow up directly to confirm.",
  },
];

export function FAQ() {
  return (
    <section className="bg-paper px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Questions on the record.
            </h2>

            <div className="mt-12 divide-y divide-ink/12 border-t border-ink/12">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-body text-lg font-medium text-ink marker:content-none">
                    {faq.q}
                    <IconChevron className="h-5 w-5 shrink-0 text-olive-ink transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl font-body leading-relaxed text-slate">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </Stamped>
      </div>
    </section>
  );
}
