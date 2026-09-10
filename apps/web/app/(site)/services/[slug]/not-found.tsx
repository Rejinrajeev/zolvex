import Link from "next/link";
import { IconArrow } from "@/components/icons";

export default function ServiceNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bone px-6 text-center">
      <p className="font-archivo-black text-6xl uppercase tracking-[-0.03em] text-carbon sm:text-7xl">Not found</p>
      <p className="pretty mt-4 max-w-sm text-lg leading-relaxed text-ash">
        That service isn&apos;t published right now. It may have been renamed or retired.
      </p>
      <Link
        href="/#services"
        className="group mt-8 inline-flex items-center gap-2 rounded-full bg-sun px-7 py-4 text-base font-semibold text-carbon shadow-[0_18px_36px_-16px_rgba(20,18,16,0.5)] transition-transform hover:-translate-y-0.5 hover:bg-sun-deep"
      >
        See all services
        <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
