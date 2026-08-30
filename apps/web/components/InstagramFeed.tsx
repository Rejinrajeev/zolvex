import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconInstagram } from "./icons";

/**
 * No real Instagram handle exists yet (PRODUCT.md). Tiles link out to
 * Instagram generically rather than a fabricated handle; once a real handle
 * and posts are configured in the backend, each tile's href becomes that
 * post's real permalink.
 */
const TILE_COUNT = 6;

export function InstagramFeed() {
  return (
    <section className="ledger-ground-dark px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <div className="flex flex-wrap items-center gap-3">
            <IconInstagram className="h-7 w-7 text-gold" />
            <h2 className="font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
              Follow the crew.
            </h2>
          </div>
        </Stamped>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {Array.from({ length: TILE_COUNT }).map((_, i) => (
            <Stamped key={i} delayMs={i * 60}>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Open this post on Instagram"
                className="group relative block"
              >
                <PlaceholderPhoto label={`Post ${i + 1}`} tone="dark" className="aspect-square" />
                <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/60 group-hover:opacity-100">
                  <IconInstagram className="h-6 w-6 text-gold" />
                </span>
              </a>
            </Stamped>
          ))}
        </div>
      </div>
    </section>
  );
}
