"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "./motion-primitives";
import { IconArrow } from "./icons";
import { ServiceTile, type PublicService } from "./ServiceTile";

export type { PublicService };

/**
 * The range, as a rail you push through rather than a wall of tiles. The
 * rail is a real scroll container, so a thumb drag, a trackpad swipe and
 * the Tab key all work; the arrows only drive scrollBy on top of it, and
 * they disable themselves at each end instead of dead-clicking.
 */
export function Services({ services }: { services: PublicService[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, services.length]);

  const nudge = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // One card plus its gap, so a press lands the next card on the rail edge.
    const step = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 320;
    el.scrollBy({ left: direction * (step + 20), behavior: "smooth" });
  };

  return (
    <section id="services" className="relative py-20 sm:py-28">
      <div className="mx-auto grid min-w-0 max-w-[84rem] gap-10 px-5 sm:px-8 lg:grid-cols-[23rem_1fr] lg:items-center lg:gap-12 lg:pr-0">
        <div>
          <Reveal
            as="h2"
            className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-carbon"
          >
            Service you can depend on when you{" "}
            <span className="text-sun-ink">call us</span>
          </Reveal>
          <Reveal as="p" delay={0.1} className="pretty mt-5 max-w-[30rem] text-base leading-[1.65] text-ash">
            One team for the whole list, home or business. Every service here is
            one Zolvex handles directly, with trained and background-verified
            people and a logged visit at the end of it.
          </Reveal>

          {services.length > 1 && (
            <Reveal delay={0.15} className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => nudge(-1)}
                disabled={atStart}
                aria-label="Previous services"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-shell text-carbon transition-[background-color,opacity] duration-200 hover:bg-carbon hover:text-bone disabled:pointer-events-none disabled:opacity-35"
              >
                <IconArrow className="h-4 w-4 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => nudge(1)}
                disabled={atEnd}
                aria-label="More services"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-sun text-carbon transition-[background-color,opacity] duration-200 hover:bg-sun-deep disabled:pointer-events-none disabled:opacity-35"
              >
                <IconArrow className="h-4 w-4" />
              </button>
            </Reveal>
          )}
        </div>

        {services.length === 0 ? (
          <Reveal
            delay={0.15}
            className="rounded-[1.75rem] bg-shell p-10 text-center text-base text-ash lg:mr-8"
          >
            Services land here the moment they are published from the admin panel.
          </Reveal>
        ) : (
          <Reveal delay={0.12} className="min-w-0">
            <div
              ref={railRef}
              className="rail -mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:pl-0 lg:pr-8"
              tabIndex={0}
              role="group"
              aria-label="Services"
            >
              {services.map((service) => (
                <div key={service.id} className="w-[16rem] sm:w-[19rem]">
                  <ServiceTile service={service} />
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
