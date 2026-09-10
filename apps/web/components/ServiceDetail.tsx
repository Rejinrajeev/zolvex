"use client";

/**
 * One service's own page: a lean Persuade surface in the v2 Yellow Van
 * world. Bone detail hero (name, photo, full description, price, book CTA)
 * → carbon reassurance band that closes the page → a grid of the other
 * services. "Book this service" tags the enquiry with this service so it
 * lands in the admin panel already attributed.
 */

import { useState } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { EnquiryModal } from "./EnquiryModal";
import { Reveal, Stagger, StaggerItem } from "./motion-primitives";
import { Photo } from "./Photo";
import { ServiceTile, type PublicService } from "./ServiceTile";
import { IconArrow } from "./icons";
import { formatRupees } from "@/lib/money";
import type { PublicPlace } from "@/lib/public-content/fetch";

export interface PublicServiceFull extends PublicService {
  fullDescription: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
}

export function ServiceDetail({
  service,
  others,
  places,
  footerTagline,
  footerInstagramUrl,
  phoneNumber,
}: {
  service: PublicServiceFull;
  others: PublicService[];
  places: PublicPlace[];
  footerTagline?: string;
  footerInstagramUrl?: string;
  phoneNumber?: string;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);
  const price = formatRupees(service.startingPrice);

  return (
    <>
      <Nav onBookNow={openBooking} />
      <main id="main">
        <section
          id="top"
          className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40"
        >
          <div className="relative mx-auto grid max-w-[84rem] items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className="group relative">
              <Photo
                src={service.image}
                label={service.name}
                size="lg"
                width={900}
                aspect="5 / 4"
                className="rounded-[2rem]"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="font-archivo-black text-[clamp(2.5rem,6vw,4rem)] uppercase leading-[0.92] tracking-[-0.03em] text-carbon">
                {service.name}
              </h1>
              <p className="pretty mt-5 max-w-lg text-lg leading-[1.6] text-ash">
                {service.fullDescription}
              </p>

              <div className="mt-8 max-w-md rounded-[1.75rem] bg-shell p-6 sm:p-7">
                {price ? (
                  <>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-sm font-semibold uppercase tracking-[0.08em] text-ash">
                        From
                      </span>
                      <span className="tabular font-archivo-black text-4xl leading-none tracking-[-0.02em] text-carbon sm:text-[2.75rem]">
                        {price}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-ash">
                      We confirm the full quote once we have seen the job.
                    </p>
                  </>
                ) : (
                  <p className="leading-relaxed text-ash">
                    Tell us about the job and we will come back with a quote.
                  </p>
                )}
                <button
                  type="button"
                  onClick={openBooking}
                  className="group mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-sun px-7 py-4 text-base font-semibold text-carbon shadow-[0_16px_32px_-16px_rgba(20,18,16,0.5)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-sun-deep active:translate-y-0"
                >
                  Book this service
                  <IconArrow
                    aria-hidden
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-8">
          <Reveal className="on-carbon mx-auto flex max-w-[84rem] flex-col items-start gap-7 rounded-[2.25rem] bg-carbon px-6 py-12 text-bone sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-14">
            <div>
              <h2 className="font-archivo-black text-[clamp(1.75rem,4vw,2.75rem)] uppercase leading-[1.02] tracking-[-0.02em] text-bone">
                Ready when you are
              </h2>
              <p className="pretty mt-4 max-w-md leading-relaxed text-bone/70">
                Book a visit and we will scope the work, confirm a time, and put it
                on the schedule. On time, every visit logged.
              </p>
            </div>
            <button
              type="button"
              onClick={openBooking}
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-sun px-7 py-4 text-base font-semibold text-carbon transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-sun-deep"
            >
              Book this service
              <IconArrow
                aria-hidden
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </button>
          </Reveal>
        </section>

        {others.length > 0 && (
          <section className="px-5 py-20 sm:px-8 sm:py-28">
            <div className="mx-auto max-w-[84rem]">
              <Reveal
                as="h2"
                className="text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-carbon"
              >
                More of what <span className="text-sun-ink">we cover</span>
              </Reveal>
              <Stagger className="mt-12 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {others.map((s) => (
                  <StaggerItem key={s.id} className="h-full">
                    <ServiceTile service={s} />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        )}
      </main>

      <Footer
        onBookNow={openBooking}
        tagline={footerTagline}
        instagramUrl={footerInstagramUrl}
        phoneNumber={phoneNumber}
      />

      <EnquiryModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        places={places}
        service={{ id: service.id, name: service.name }}
      />
    </>
  );
}
