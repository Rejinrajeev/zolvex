import { getPageContent, getPublicContent } from "@/lib/public-content/fetch";
import { asString } from "@/lib/public-content/coerce";
import { HomePageClient } from "./HomePageClient";
import type { FeaturedServiceRecord } from "@/components/FeaturedService";
import type { PublicBlogPost } from "@/components/Blog";
import type { PublicTestimonial } from "@/components/Testimonials";
import type { PublicFaq } from "@/components/FAQ";
import type { PublicInstagramPost } from "@/components/InstagramFeed";

interface HeroContent {
  headline?: string;
  subheadline?: string;
}

export default async function Home() {
  const [hero, services, blogPosts, testimonials, googleReview, faqs, instagramPosts, footer, whatsapp] = await Promise.all([
    getPageContent<HeroContent>("hero"),
    getPublicContent<FeaturedServiceRecord & { isHighlighted?: boolean }>("service"),
    getPublicContent<PublicBlogPost>("blog-post"),
    getPublicContent<PublicTestimonial>("testimonial"),
    getPageContent<{ url?: string }>("google-review"),
    getPublicContent<PublicFaq>("faq"),
    getPublicContent<PublicInstagramPost>("instagram-post"),
    getPageContent<{ tagline?: string; instagramUrl?: string }>("footer"),
    getPageContent<{ phoneNumber?: string }>("whatsapp"),
  ]);

  const highlighted = services.find((s) => s.isHighlighted) ?? null;

  return (
    <HomePageClient
      heroHeadline={asString(hero?.headline)}
      heroSubheadline={asString(hero?.subheadline)}
      services={services}
      featuredService={highlighted}
      posts={blogPosts}
      testimonials={testimonials}
      googleReviewUrl={asString(googleReview?.url)}
      faqs={faqs}
      instagramPosts={instagramPosts}
      footerTagline={asString(footer?.tagline)}
      footerInstagramUrl={asString(footer?.instagramUrl)}
      phoneNumber={asString(whatsapp?.phoneNumber)}
    />
  );
}
