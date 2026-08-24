import { Stamped } from "./Stamped";
import { IconCheck } from "./icons";

const OFFER_ITEMS = [
  "Recurring office & commercial deep cleans",
  "Carpet, upholstery & floor care",
  "Window & glass detailing",
  "Post-construction cleanup",
  "Sanitization & disinfection",
  "Custom schedules — daily to quarterly",
];

const VALUES = ["100% Dedication", "Hard-Working Crews", "On-Time, Every Time"];

export function WhyUs() {
  return (
    <section id="about" className="bg-paper px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem] divide-y divide-ink/10">
        {/* Row 1 — What We Offer: statement + checklist ledger */}
        <Stamped className="grid gap-10 py-14 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h2 className="balance max-w-md font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              One crew, every line on the sheet.
            </h2>
            <p className="mt-5 max-w-md font-body text-lg leading-relaxed text-slate">
              You don’t coordinate six vendors. Zolvex covers the whole
              commercial-cleaning ledger under one contract, one crew, one
              point of contact.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {OFFER_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 border-b border-ink/10 pb-4 font-body text-ink"
              >
                <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-olive-ink" />
                {item}
              </li>
            ))}
          </ul>
        </Stamped>

        {/* Row 2 — Why Us: pull statement + stamped value tags */}
        <Stamped className="py-14">
          <p className="balance max-w-3xl font-display text-3xl font-medium leading-snug text-ink sm:text-4xl">
            “Will they actually show up and do it right?” is the
            only question that matters. Ours is the crew you stop asking it
            about.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            {VALUES.map((value, i) => (
              <span
                key={value}
                className={`stamp-rotate inline-block rounded-sm border-2 border-olive-ink/70 px-4 py-2 font-stamp text-sm uppercase tracking-wide text-slate ${
                  i % 2 === 1 ? "-rotate-2" : "rotate-1"
                }`}
              >
                {value}
              </span>
            ))}
          </div>
        </Stamped>

        {/* Row 3 — Service Quality: verification stamp + description */}
        <Stamped className="grid items-center gap-10 py-14 lg:grid-cols-[auto_1fr] lg:gap-16">
          <div
            className="stamp-rotate flex h-40 w-40 shrink-0 items-center justify-center rounded-full border-4 border-gold text-center font-stamp uppercase leading-tight text-ink"
            aria-hidden
          >
            <span className="text-sm">
              Quality
              <br />
              Verified
              <br />
              On Every
              <br />
              Visit
            </span>
          </div>
          <div>
            <h3 className="balance max-w-lg font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Every visit is checked against the same sheet.
            </h3>
            <p className="mt-4 max-w-lg font-body text-lg leading-relaxed text-slate">
              A standard checklist, followed the same way whether it’s
              week one or week two hundred — so consistency is something you
              can actually verify, not just a word on our homepage.
            </p>
          </div>
        </Stamped>
      </div>
    </section>
  );
}
