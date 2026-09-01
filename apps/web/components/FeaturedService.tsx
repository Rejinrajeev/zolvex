import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconArrow } from "./icons";
import { iconForServiceKey } from "@/lib/service-icons";
import type { PublicService } from "./Services";

export interface FeaturedServiceRecord extends PublicService {
  fullDescription: string;
}

export function FeaturedService({
  service,
  onBookNow,
}: {
  service: FeaturedServiceRecord | null;
  onBookNow: () => void;
}) {
  if (!service) return null;
  const Icon = iconForServiceKey(service.icon);

  return (
    <section className="bg-paper-dim px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[90rem] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Stamped>
          <PlaceholderPhoto label={service.name} tone="light" size="lg" className="aspect-[5/4]" />
        </Stamped>

        <Stamped delayMs={100}>
          <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 text-olive-ink" />
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              {service.name}
            </h2>
          </div>
          <p className="mt-4 max-w-lg font-body text-lg leading-relaxed text-slate">
            {service.fullDescription}
          </p>
          <button
            type="button"
            onClick={onBookNow}
            className="group mt-8 inline-flex items-center gap-2 border-2 border-ink px-7 py-3.5 font-display font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Book This Service
            <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </Stamped>
      </div>
    </section>
  );
}
