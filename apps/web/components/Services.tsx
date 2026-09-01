import { Reveal, Stagger, StaggerItem } from "./motion-primitives";
import { Photo } from "./Photo";
import { iconForServiceKey } from "@/lib/service-icons";

export interface PublicService {
  id: string;
  name: string;
  shortDescription: string;
  icon?: string | null;
  image?: string | null;
}

const TINTS = ["bg-mist", "bg-sky/50", "bg-gold/40"] as const;

export function Services({ services }: { services: PublicService[] }) {
  return (
    <section id="services" className="relative bg-cream px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[80rem]">
        <Reveal as="h2" className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
          Everything your
          <br />
          space needs
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="mt-5 max-w-lg font-sora text-lg leading-relaxed text-moss"
        >
          One crew for the whole building. Published from the Zolvex admin panel,
          so this list is always the real service menu.
        </Reveal>

        {services.length === 0 ? (
          <Reveal as="p" delay={0.15} className="mt-14 font-sora text-base text-moss">
            Services land here the moment they&apos;re published from the admin panel.
          </Reveal>
        ) : (
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => {
              const Icon = iconForServiceKey(service.icon);
              return (
                <StaggerItem
                  key={service.id}
                  className={`group flex flex-col overflow-hidden rounded-[1.75rem] ${TINTS[i % TINTS.length]} p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-24px_rgba(12,58,44,0.35)]`}
                >
                  <Photo
                    src={service.image}
                    label={service.name}
                    width={520}
                    className="rounded-[1.25rem]"
                  />
                  <div className="mt-5 flex items-start gap-3 px-1 pb-2">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-green-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-anton text-xl uppercase tracking-tight text-ink">
                        {service.name}
                      </h3>
                      <p className="pretty mt-1.5 font-sora text-sm leading-relaxed text-moss">
                        {service.shortDescription}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </section>
  );
}
