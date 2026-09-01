import { getPageContent, getPublicContent } from "@/lib/public-content/fetch";
import { HomePageClient } from "./HomePageClient";
import type { PublicService } from "@/components/Services";
import type { FeaturedServiceRecord } from "@/components/FeaturedService";
import type { PublicBlogPost } from "@/components/Blog";

interface HeroContent {
  headline?: string;
  subheadline?: string;
}

export default async function Home() {
  const [hero, services, blogPosts] = await Promise.all([
    getPageContent<HeroContent>("hero"),
    getPublicContent<FeaturedServiceRecord & { isHighlighted?: boolean }>("service"),
    getPublicContent<PublicBlogPost>("blog-post"),
  ]);

  const highlighted = services.find((s) => s.isHighlighted) ?? null;

  return (
    <HomePageClient
      heroHeadline={hero?.headline}
      heroSubheadline={hero?.subheadline}
      services={services}
      featuredService={highlighted}
      posts={blogPosts}
    />
  );
}
