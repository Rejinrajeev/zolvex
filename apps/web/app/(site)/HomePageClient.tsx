"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { WhyUs } from "@/components/WhyUs";
import { FeaturedService } from "@/components/FeaturedService";
import { Blog } from "@/components/Blog";
import { FAQ } from "@/components/FAQ";
import { Testimonials } from "@/components/Testimonials";
import { InstagramFeed } from "@/components/InstagramFeed";
import { Footer } from "@/components/Footer";
import { EnquiryModal } from "@/components/EnquiryModal";

export function HomePageClient({
  heroHeadline,
  heroSubheadline,
}: {
  heroHeadline?: string;
  heroSubheadline?: string;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);

  return (
    <>
      <Nav />
      <main id="main">
        <Hero onBookNow={openBooking} headline={heroHeadline} subheadline={heroSubheadline} />
        <Services />
        <WhyUs />
        <FeaturedService onBookNow={openBooking} />
        <Blog />
        <FAQ />
        <Testimonials />
        <InstagramFeed />
      </main>
      <Footer onBookNow={openBooking} />
      <EnquiryModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
