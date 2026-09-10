import { createElement } from "react";
import Link from "next/link";
import { cloudinaryTransform } from "./Photo";
import { IconArrow } from "./icons";
import { iconForServiceKey } from "@/lib/service-icons";

export interface PublicService {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  startingPrice?: number | null;
  icon?: string | null;
  image?: string | null;
}

/**
 * One service as a card: the photo does the selling, the name sits on the
 * baseline, and the round arrow is the affordance. While no photo has been
 * uploaded the slot holds the service icon on Bone rather than a grey
 * rectangle, so an unphotographed service still looks deliberate.
 *
 * Sized for the horizontal rail on the home page; it also sits in the plain
 * grid on a service page, so the width is set by the parent, never here.
 */
export function ServiceTile({ service }: { service: PublicService; index?: number }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex h-full flex-col rounded-[1.75rem] bg-shell p-3 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_-28px_rgba(20,18,16,0.5)]"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.35rem] bg-bone">
        {service.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary CDN; next/image not configured for this project
          <img
            src={cloudinaryTransform(service.image, 640)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          createElement(iconForServiceKey(service.icon), {
            "aria-hidden": true,
            className:
              "h-11 w-11 text-carbon/35 transition-transform duration-500 group-hover:scale-110",
          })
        )}
      </div>

      <div className="mt-3.5 flex items-center gap-3 px-1.5 pb-1.5">
        <h3 className="min-w-0 flex-1 text-lg font-semibold leading-snug tracking-[-0.01em] text-carbon">
          {service.name}
        </h3>
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bone text-carbon transition-colors duration-300 group-hover:bg-sun"
        >
          <IconArrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
