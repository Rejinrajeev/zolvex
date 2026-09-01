import { getPageContent } from "@/lib/public-content/fetch";
import { HomePageClient } from "./HomePageClient";

interface HeroContent {
  headline?: string;
  subheadline?: string;
}

export default async function Home() {
  const hero = await getPageContent<HeroContent>("hero");

  return <HomePageClient heroHeadline={hero?.headline} heroSubheadline={hero?.subheadline} />;
}
