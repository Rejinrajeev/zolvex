import { Reveal, Stagger, StaggerItem } from "./motion-primitives";
import { IconCheck } from "./icons";

const OFFER_ITEMS = [
  "Home & commercial deep cleaning",
  "AC service, repair & annual contracts",
  "Plumbing & electrical work",
  "Handyman jobs & installations",
  "Painting & home improvement",
  "Recurring maintenance — weekly to yearly",
];

const VALUES = [
  { word: "100% dedication", line: "The same standard on visit one and visit two hundred." },
  { word: "Verified people", line: "Background-checked, police-cleared, trained before they knock." },
  { word: "On time, every time", line: "Booked slots we keep — and log the moment we are done." },
];

export function WhyUs() {
  return (
    <section id="about" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[84rem]">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-carbon">
              Why one call covers the{" "}
              <span className="text-sun-ink">whole list</span>
            </h2>
            <p className="pretty mt-6 max-w-md text-lg leading-[1.6] text-ash">
              You do not line up a cleaner, a plumber, an electrician and a
              handyman separately. Zolvex covers the lot — one team, one point of
              contact, verified people — and every visit is checked against the
              same standard.
            </p>
          </Reveal>

          <Stagger as="ul" className="grid gap-3 self-center sm:grid-cols-2">
            {OFFER_ITEMS.map((item) => (
              <StaggerItem
                key={item}
                as="li"
                className="flex items-start gap-3 rounded-2xl bg-shell px-4 py-3.5 text-[0.95rem] font-medium text-carbon"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun text-carbon">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                {item}
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* The one dark beat on the page. Carbon earns it here because this
            is the trust claim the whole site is built to answer. */}
        <Reveal className="on-carbon mt-16 overflow-hidden rounded-[2.25rem] bg-carbon px-6 py-12 text-bone sm:mt-24 sm:px-12 sm:py-16">
          <p className="pretty max-w-3xl font-archivo-black text-[clamp(1.6rem,3.4vw,2.5rem)] uppercase leading-[1.08] tracking-[-0.02em]">
            &ldquo;Will they actually show up and do it right?&rdquo; is the only
            question that matters. Ours is the crew you stop asking it about.
          </p>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {VALUES.map((v) => (
              <div key={v.word}>
                <dt className="text-lg font-semibold tracking-[-0.01em] text-sun">{v.word}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-bone/70">{v.line}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
