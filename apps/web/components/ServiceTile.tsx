import { createElement } from "react";
import Link from "next/link";
import { cloudinaryTransform } from "./Photo";
import { iconForServiceKey } from "@/lib/service-icons";
import { formatRupees } from "@/lib/money";

export interface PublicService {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  startingPrice?: number | null;
  icon?: string | null;
  image?: string | null;
}

const TINTS = ["bg-mist", "bg-sky/50", "bg-gold/40"] as const;

/**
 * One service in the compact grid — a tinted tile holding the service photo
 * (or its icon while no photo is uploaded) and the name, linking through to
 * the service's own page. Shared by the home Services section and the
 * "other services" strip on a service page.
 */
export function ServiceTile({ service, index }: { service: PublicService; index: number }) {
  const price = formatRupees(service.startingPrice);
  return (
    <Link
      href={`/services/${service.slug}`}
      className={`group flex h-full flex-col rounded-[1.25rem] ${TINTS[index % TINTS.length]} p-2 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-20px_rgba(12,58,44,0.35)] sm:p-2.5`}
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[0.9rem] bg-paper/60 ring-1 ring-ink/5">
        {service.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary CDN; next/image not configured for this project
          <img
            src={cloudinaryTransform(service.image, 360)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          createElement(iconForServiceKey(service.icon), {
            "aria-hidden": true,
            className:
              "h-8 w-8 text-green-ink transition-transform duration-500 group-hover:scale-110 sm:h-9 sm:w-9",
          })
        )}
      </div>
      <h3 className="mt-2 px-1 pb-1 font-anton text-sm uppercase leading-[1.05] tracking-tight text-ink sm:text-base lg:text-lg">
        {service.name}
      </h3>
      {price && (
        <p className="-mt-0.5 px-1 pb-0.5 font-sora text-xs font-semibold text-green-ink">
          From {price}
        </p>
      )}
    </Link>
  );
}
