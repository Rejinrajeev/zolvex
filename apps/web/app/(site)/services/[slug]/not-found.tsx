import Link from "next/link";
import { IconArrow } from "@/components/icons";

export default function ServiceNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="font-anton text-6xl uppercase tracking-tight text-ink sm:text-7xl">Not found</p>
      <p className="pretty mt-4 max-w-sm font-sora text-lg leading-relaxed text-moss">
        That service isn&apos;t published right now. It may have been renamed or retired.
      </p>
      <Link
        href="/#services"
        className="group mt-8 inline-flex items-center gap-2 rounded-full bg-green px-7 py-4 font-sora text-base font-semibold text-forest shadow-[0_18px_36px_-14px_rgba(15,184,119,0.6)] transition-transform hover:-translate-y-0.5"
      >
        See all services
        <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
