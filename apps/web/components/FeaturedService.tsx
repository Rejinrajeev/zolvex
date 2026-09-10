import { createElement } from "react";
import Link from "next/link";
import { Reveal } from "./motion-primitives";
import { Photo } from "./Photo";
import { IconArrow } from "./icons";
import { iconForServiceKey } from "@/lib/service-icons";
import { formatRupees } from "@/lib/money";
import type { PublicService } from "./Services";

export interface FeaturedServiceRecord extends PublicService {
  fullDescription: string;
}

/**
 * The most-booked service, given a whole Shell panel to itself. It sits on
 * the light ground rather than a second dark block, because the carbon beat
 * directly above it in WhyUs has already been spent.
 */
export function FeaturedService({
  service,
  onBookNow,
}: {
  service: FeaturedServiceRecord | null;
  onBookNow: () => void;
}) {
  if (!service) return null;
  const price = formatRupees(service.startingPrice);

  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[84rem]">
        <Reveal className="grid items-center gap-8 overflow-hidden rounded-[2.25rem] bg-shell p-4 sm:p-6 lg:grid-cols-2 lg:gap-14 lg:p-8">
          <div className="relative">
            <Photo
              src={service.image}
              label={service.name}
              size="lg"
              width={900}
              aspect="5 / 4"
              className="rounded-[1.75rem]"
            />
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-sun px-3.5 py-1.5 text-sm font-semibold text-carbon">
              {createElement(iconForServiceKey(service.icon), {
                className: "h-4 w-4",
                "aria-hidden": true,
              })}
              Most booked
            </span>
          </div>

          <div className="lg:pr-6">
            <h2 className="text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-carbon">
              {service.name}
            </h2>
            <p className="pretty mt-5 max-w-lg text-lg leading-[1.6] text-ash">
              {service.fullDescription}
            </p>
            {price && (
              <p className="mt-5 inline-flex items-baseline gap-2 rounded-full bg-bone px-4 py-2 text-sm text-ash">
                From
                <span className="tabular text-xl font-semibold tracking-[-0.01em] text-carbon">
                  {price}
                </span>
              </p>
            )}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <button
                type="button"
                onClick={onBookNow}
                className="group inline-flex items-center gap-2 rounded-full bg-sun px-7 py-4 text-base font-semibold text-carbon shadow-[0_18px_36px_-16px_rgba(20,18,16,0.5)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-sun-deep"
              >
                Book this service
                <IconArrow
                  aria-hidden
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </button>
              <Link
                href={`/services/${service.slug}`}
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-carbon underline decoration-carbon/25 underline-offset-4 transition-colors hover:decoration-carbon"
              >
                Full details
                <IconArrow
                  aria-hidden
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
