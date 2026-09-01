// apps/web/components/Services.tsx
import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { iconForServiceKey } from "@/lib/service-icons";

export interface PublicService {
  id: string;
  name: string;
  shortDescription: string;
  icon?: string | null;
}

const ROTATIONS = ["-rotate-1", "rotate-1"] as const;

export function Services({ services }: { services: PublicService[] }) {
  return (
    <section id="services" className="punch-edge relative bg-ink px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <h2 className="max-w-lg font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
            The jobs on our sheet.
          </h2>
        </Stamped>

        {services.length === 0 ? (
          <p className="mt-14 font-stamp text-sm uppercase tracking-wide text-paper/60">
            On file — pending. Services land here once published from the admin panel.
          </p>
        ) : (
          <div
            role="region"
            aria-label="Services, scroll horizontally for more"
            tabIndex={0}
            className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-4"
          >
            {services.map((service, i) => {
              const Icon = iconForServiceKey(service.icon);
              return (
                <Stamped
                  key={service.id}
                  delayMs={i * 70}
                  className={`w-64 shrink-0 snap-start sm:w-72 ${ROTATIONS[i % 2]}`}
                >
                  <article className="group relative border border-gold/15 bg-ink-soft p-4 pt-6 transition-transform duration-300 hover:-translate-y-1 hover:rotate-0">
                    {/* perforated tear edge at the top of the ticket */}
                    <span
                      aria-hidden
                      className="absolute -top-2 left-0 right-0 h-2 bg-repeat-x"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, var(--color-ink) 3px, transparent 3.1px)",
                        backgroundSize: "1.5rem 100%",
                      }}
                    />
                    <PlaceholderPhoto label={service.name} tone="dark" />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <h3 className="font-body text-lg font-medium text-paper">{service.name}</h3>
                      <Icon className="h-7 w-7 shrink-0 text-gold" />
                    </div>
                  </article>
                </Stamped>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
