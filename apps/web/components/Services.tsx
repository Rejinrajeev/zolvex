import { Reveal, Stagger, StaggerItem } from "./motion-primitives";
import { ServiceTile, type PublicService } from "./ServiceTile";

export type { PublicService };

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
          One team for the whole list — home or business. Every service here is
          one Zolvex handles directly, with trained and verified people.
        </Reveal>

        {services.length === 0 ? (
          <Reveal as="p" delay={0.15} className="mt-14 font-sora text-base text-moss">
            Services land here the moment they&apos;re published from the admin panel.
          </Reveal>
        ) : (
          <Stagger className="mt-12 grid auto-rows-fr grid-cols-3 gap-3 sm:mt-14 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {services.map((service, i) => (
              <StaggerItem key={service.id} className="h-full">
                <ServiceTile service={service} index={i} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
