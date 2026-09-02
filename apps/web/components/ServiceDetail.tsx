"use client";

/**
 * One service's own page: a lean Persuade surface in the Fresh Start world.
 * Cream detail hero (name, photo, full description, book CTA) → forest
 * reassurance band that closes the page → mist strip of the other services.
 * "Book this service" tags the enquiry with this service so it lands in the
 * admin panel already attributed.
 */

import { useState } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { EnquiryModal } from "./EnquiryModal";
import { Reveal, Stagger, StaggerItem, Blob } from "./motion-primitives";
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
        <section className="relative overflow-hidden bg-cream px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
          <Blob
            color="var(--color-sky)"
            className="right-[-10rem] top-[-6rem] h-[22rem] w-[22rem] opacity-40"
            distance={70}
          />
          <div className="relative mx-auto grid max-w-[80rem] items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className="group relative">
              <Photo
                src={service.image}
                label={service.name}
                size="lg"
                width={900}
                aspect="5 / 4"
                className="rounded-[2rem] shadow-[0_36px_80px_-36px_rgba(12,58,44,0.4)]"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl">
                {service.name}
              </h1>
              <p className="pretty mt-5 max-w-lg font-sora text-lg leading-relaxed text-moss">
                {service.fullDescription}
              </p>
              {price && (
                <p className="mt-6 font-sora text-moss">
                  Starts at{" "}
                  <span className="font-anton text-2xl uppercase tracking-tight text-ink">
                    {price}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={openBooking}
                className={`group inline-flex items-center gap-2 rounded-full bg-green px-7 py-4 font-sora text-base font-semibold text-forest shadow-[0_18px_36px_-14px_rgba(15,184,119,0.6)] transition-transform hover:-translate-y-0.5 active:translate-y-0 ${price ? "mt-4" : "mt-8"}`}
              >
                Book this service
                <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Reveal>
          </div>
        </section>

        <section className="on-forest bg-forest px-5 py-20 text-cream sm:px-8 sm:py-24">
          <Reveal className="mx-auto flex max-w-[80rem] flex-col items-start gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-anton text-4xl uppercase leading-[0.95] tracking-tight text-cream sm:text-5xl">
                Ready when
                <br />
                you are
              </h2>
              <p className="pretty mt-4 max-w-md font-sora leading-relaxed text-cream/75">
                Book a visit and we&apos;ll scope the work, confirm a time, and put it on the
                schedule. On time, every visit logged.
              </p>
            </div>
            <button
              type="button"
              onClick={openBooking}
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-green px-7 py-4 font-sora text-base font-semibold text-forest shadow-[0_18px_36px_-14px_rgba(15,184,119,0.6)] transition-transform hover:-translate-y-0.5"
            >
              Book this service
              <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </section>

        {others.length > 0 && (
          <section className="bg-mist px-5 py-20 sm:px-8 sm:py-28">
            <div className="mx-auto max-w-[80rem]">
              <Reveal
                as="h2"
                className="font-anton text-4xl uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl lg:text-6xl"
              >
                More of what
                <br />
                we cover
              </Reveal>
              <Stagger className="mt-12 grid auto-rows-fr grid-cols-3 gap-3 sm:mt-14 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
                {others.map((s, i) => (
                  <StaggerItem key={s.id} className="h-full">
                    <ServiceTile service={s} index={i} />
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
