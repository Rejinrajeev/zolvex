"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Services } from "@/components/Services";
import { WhyUs } from "@/components/WhyUs";
import { FeaturedService } from "@/components/FeaturedService";
import { Blog } from "@/components/Blog";
import { FAQ } from "@/components/FAQ";
import { Testimonials } from "@/components/Testimonials";
import { InstagramFeed } from "@/components/InstagramFeed";
import { Footer } from "@/components/Footer";
import { EnquiryModal } from "@/components/EnquiryModal";
import type { PublicPlace } from "@/lib/public-content/fetch";
import type { PublicService } from "@/components/Services";
import type { FeaturedServiceRecord } from "@/components/FeaturedService";
import type { PublicBlogPost } from "@/components/Blog";
import type { PublicTestimonial } from "@/components/Testimonials";
import type { PublicFaq } from "@/components/FAQ";
import type { PublicInstagramPost } from "@/components/InstagramFeed";

export function HomePageClient({
  heroHeadline,
  heroSubheadline,
  heroImageUrl,
  services,
  featuredService,
  posts,
  testimonials,
  googleReviewUrl,
  googleRating,
  googleReviewCount,
  faqs,
  instagramPosts,
  footerTagline,
  footerInstagramUrl,
  phoneNumber,
  places,
}: {
  heroHeadline?: string;
  heroSubheadline?: string;
  heroImageUrl?: string;
  services: PublicService[];
  featuredService: FeaturedServiceRecord | null;
  posts: PublicBlogPost[];
  testimonials: PublicTestimonial[];
  googleReviewUrl?: string | null;
  googleRating?: string | null;
  googleReviewCount?: string | null;
  faqs: PublicFaq[];
  instagramPosts: PublicInstagramPost[];
  footerTagline?: string;
  footerInstagramUrl?: string;
  phoneNumber?: string;
  places: PublicPlace[];
}) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);

  // The strip carries real service names once any are published, and the
  // trade list only until then.
  const marqueeItems = services.map((s) => s.name).filter(Boolean);

  return (
    <>
      <Nav onBookNow={openBooking} />
      <main id="main">
        <Hero
          onBookNow={openBooking}
          headline={heroHeadline}
          subheadline={heroSubheadline}
          imageUrl={heroImageUrl}
          rating={googleRating}
          reviewCount={googleReviewCount}
          reviews={testimonials}
        />
        <Marquee items={marqueeItems.length > 0 ? marqueeItems : undefined} />
        <Services services={services} />
        <WhyUs />
        <FeaturedService service={featuredService} onBookNow={openBooking} />
        <Blog posts={posts} />
        <FAQ faqs={faqs} onBookNow={openBooking} />
        <Testimonials
          testimonials={testimonials}
          googleReviewUrl={googleReviewUrl}
          rating={googleRating}
          reviewCount={googleReviewCount}
        />
        <InstagramFeed posts={instagramPosts} />
      </main>
      <Footer
        onBookNow={openBooking}
        tagline={footerTagline}
        instagramUrl={footerInstagramUrl}
        phoneNumber={phoneNumber}
      />
      <EnquiryModal open={bookingOpen} onClose={() => setBookingOpen(false)} places={places} />
    </>
  );
}
