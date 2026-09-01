import { Reveal, Stagger, StaggerItem, Seal } from "./motion-primitives";
import { IconCheck } from "./icons";

const OFFER_ITEMS = [
  "Recurring office & commercial deep cleans",
  "Carpet, upholstery & floor care",
  "Window & glass detailing",
  "Post-construction cleanup",
  "Sanitization & disinfection",
  "Custom schedules — daily to quarterly",
];

const VALUES = [
  { word: "100% dedication", line: "The same standard on visit one and visit two hundred." },
  { word: "Hard-working crews", line: "Trained teams who finish the checklist, not the clock." },
  { word: "On time, every time", line: "Booked slots we keep — and log the moment we're done." },
];

export function WhyUs() {
  return (
    <section id="about" className="bg-cream px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[80rem]">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Why teams stop
              <br />
              worrying about
              <br />
              the cleaning
            </h2>
            <p className="pretty mt-6 max-w-md font-sora text-lg leading-relaxed text-moss">
              You don&apos;t coordinate six vendors or chase anyone down. Zolvex
              covers the whole building under one contract, one crew, one point
              of contact — and every visit is checked against the same sheet.
            </p>
          </Reveal>

          <Stagger as="ul" className="grid gap-3 self-center sm:grid-cols-2">
            {OFFER_ITEMS.map((item) => (
              <StaggerItem
                key={item}
                as="li"
                className="flex items-start gap-3 rounded-2xl bg-mist px-4 py-3.5 font-sora text-[0.95rem] font-medium text-ink"
              >
                <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-ink" />
                {item}
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal className="mt-16 overflow-hidden rounded-[2.25rem] bg-forest px-6 py-12 text-cream sm:mt-24 sm:px-12 sm:py-16">
          <div className="on-forest relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
            <div>
              <p className="pretty max-w-2xl font-anton text-3xl uppercase leading-[1.05] tracking-tight sm:text-4xl">
                &ldquo;Will they actually show up and do it right?&rdquo; is the only
                question that matters. Ours is the crew you stop asking it about.
              </p>
              <dl className="mt-10 grid gap-6 sm:grid-cols-3">
                {VALUES.map((v) => (
                  <div key={v.word}>
                    <dt className="font-anton text-lg uppercase tracking-tight text-green">
                      {v.word}
                    </dt>
                    <dd className="mt-1.5 font-sora text-sm leading-relaxed text-cream/75">
                      {v.line}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <Seal size={168} className="hidden shrink-0 text-green lg:block" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
