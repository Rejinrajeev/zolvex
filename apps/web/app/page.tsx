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

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <>
      <Nav />
      <main>
        <Hero onBookNow={() => setBookingOpen(true)} />
        <Services />
        <WhyUs />
        <FeaturedService />
        <Blog />
        <FAQ />
        <Testimonials />
        <InstagramFeed />
      </main>
      <Footer />
      <EnquiryModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
