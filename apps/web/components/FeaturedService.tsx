import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconOffice, IconCheck } from "./icons";

const CHECKLIST = [
  "Full desk, surface & touchpoint wipe-down",
  "Floor vacuum, mop & spot treatment",
  "Kitchen, break room & restroom sanitization",
  "Trash & recycling collection",
  "End-of-visit walkthrough log, signed off on site",
];

export function FeaturedService() {
  return (
    <section className="bg-paper-dim px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[90rem] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Stamped>
          <PlaceholderPhoto label="Office Deep Clean" tone="light" className="aspect-[5/4]" />
        </Stamped>

        <Stamped delayMs={100}>
          <div className="flex items-center gap-3">
            <IconOffice className="h-8 w-8 text-olive" />
            <span className="font-stamp text-xs uppercase tracking-[0.15em] text-slate">
              Featured service
            </span>
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Office Deep Clean
          </h2>
          <p className="mt-4 max-w-lg font-body text-lg leading-relaxed text-slate">
            Our most-booked visit — a full-floor reset that keeps a working
            office looking like day one, on a schedule you set.
          </p>
          <ul className="mt-7 space-y-3">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-3 font-body text-ink">
                <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-olive" />
                {item}
              </li>
            ))}
          </ul>
          <a
            href="#top"
            className="mt-8 inline-flex items-center gap-2 border-2 border-ink px-7 py-3.5 font-display font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Book This Service →
          </a>
        </Stamped>
      </div>
    </section>
  );
}
