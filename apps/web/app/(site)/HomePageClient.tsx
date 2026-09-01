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
import type { PublicService } from "@/components/Services";
import type { FeaturedServiceRecord } from "@/components/FeaturedService";
import type { PublicBlogPost } from "@/components/Blog";
import type { PublicTestimonial } from "@/components/Testimonials";

export function HomePageClient({
  heroHeadline,
  heroSubheadline,
  services,
  featuredService,
  posts,
  testimonials,
  googleReviewUrl,
}: {
  heroHeadline?: string;
  heroSubheadline?: string;
  services: PublicService[];
  featuredService: FeaturedServiceRecord | null;
  posts: PublicBlogPost[];
  testimonials: PublicTestimonial[];
  googleReviewUrl?: string | null;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);

  return (
    <>
      <Nav />
      <main id="main">
        <Hero onBookNow={openBooking} headline={heroHeadline} subheadline={heroSubheadline} />
        <Services services={services} />
        <WhyUs />
        <FeaturedService service={featuredService} onBookNow={openBooking} />
        <Blog posts={posts} />
        <FAQ />
        <Testimonials testimonials={testimonials} googleReviewUrl={googleReviewUrl} />
        <InstagramFeed />
      </main>
      <Footer onBookNow={openBooking} />
      <EnquiryModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
