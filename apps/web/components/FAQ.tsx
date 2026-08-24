import { Stamped } from "./Stamped";
import { IconChevron } from "./icons";

const FAQS = [
  {
    q: "What areas and building types do you service?",
    a: "We work with offices, retail spaces, and commercial facilities. Tell us your space and schedule when you book, and we'll confirm coverage before your first visit.",
  },
  {
    q: "How is a visit actually verified?",
    a: "Every visit closes with an on-site walkthrough log against the same checklist, every time — the same discipline you'd expect from any properly run commercial operation.",
  },
  {
    q: "Can we set a recurring schedule?",
    a: "Yes — daily, weekly, or a custom cadence. Most commercial clients land on a weekly or bi-weekly rhythm; we'll help you size it to your space.",
  },
  {
    q: "What if a visit doesn't meet the checklist?",
    a: "Tell us and we return to fix it, no extra charge. The log exists so an off day is something we can see and correct, not something that gets buried.",
  },
  {
    q: "How do we get a quote?",
    a: "Submit an enquiry with your space details and preferred schedule — we'll follow up directly, usually the same business day.",
  },
];

export function FAQ() {
  return (
    <section className="bg-paper px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <Stamped>
          <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Questions on the record.
          </h2>
        </Stamped>

        <div className="mt-12 divide-y divide-ink/12 border-t border-ink/12">
          {FAQS.map((faq, i) => (
            <Stamped key={faq.q} delayMs={i * 60}>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-body text-lg font-medium text-ink marker:content-none">
                  {faq.q}
                  <IconChevron className="h-5 w-5 shrink-0 text-olive transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-2xl font-body leading-relaxed text-slate">
                  {faq.a}
                </p>
              </details>
            </Stamped>
          ))}
        </div>
      </div>
    </section>
  );
}
