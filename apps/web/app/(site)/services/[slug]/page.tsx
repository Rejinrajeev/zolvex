import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageContent, getPublicContent, getPublicPlaces } from "@/lib/public-content/fetch";
import { asString } from "@/lib/public-content/coerce";
import { ServiceDetail, type PublicServiceFull } from "@/components/ServiceDetail";

function getServices() {
  return getPublicContent<PublicServiceFull>("service");
}

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = (await getServices()).find((s) => s.slug === slug);
  if (!service) return {};

  const title = asString(service.metaTitle) || `${service.name} — Zolvex`;
  const description = asString(service.metaDescription) || service.shortDescription;
  const image = asString(service.ogImage) || asString(service.image);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [image] : [],
    },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [services, places, footer, whatsapp] = await Promise.all([
    getServices(),
    getPublicPlaces(),
    getPageContent<{ tagline?: string; instagramUrl?: string }>("footer"),
    getPageContent<{ phoneNumber?: string }>("whatsapp"),
  ]);

  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  const others = services.filter((s) => s.slug !== slug);

  return (
    <ServiceDetail
      service={service}
      others={others}
      places={places}
      footerTagline={asString(footer?.tagline)}
      footerInstagramUrl={asString(footer?.instagramUrl)}
      phoneNumber={asString(whatsapp?.phoneNumber)}
    />
  );
}
