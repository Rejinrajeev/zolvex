import { createElement } from "react";
import Link from "next/link";
import { Reveal } from "./motion-primitives";
import { Photo } from "./Photo";
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

  return (
    <section className="on-forest bg-forest px-5 py-20 text-cream sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-[80rem] items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="group relative">
          <Photo
            src={service.image}
            label={service.name}
            tone="dark"
            size="lg"
            width={900}
            aspect="5 / 4"
            className="rounded-[2rem] shadow-[0_36px_80px_-36px_rgba(0,0,0,0.6)]"
          />
          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-green px-3.5 py-1.5 font-sora text-sm font-semibold text-forest">
            {createElement(iconForServiceKey(service.icon), { className: "h-4 w-4", "aria-hidden": true })}
            Most booked
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-cream sm:text-6xl">
            {service.name}
          </h2>
          <p className="pretty mt-5 max-w-lg font-sora text-lg leading-relaxed text-cream/75">
            {service.fullDescription}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <button
              type="button"
              onClick={onBookNow}
              className="group inline-flex items-center gap-2 rounded-full bg-green px-7 py-4 font-sora text-base font-semibold text-forest shadow-[0_18px_36px_-14px_rgba(15,184,119,0.6)] transition-transform hover:-translate-y-0.5"
            >
              Book this service
              <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <Link
              href={`/services/${service.slug}`}
              className="group inline-flex items-center gap-1.5 font-sora text-sm font-semibold text-cream underline decoration-cream/30 underline-offset-4 transition-colors hover:decoration-cream"
            >
              Full details
              <IconArrow aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
