import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconInstagram } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicInstagramPost {
  id: string;
  image: string;
  permalink: string;
}

export function InstagramFeed({ posts }: { posts: PublicInstagramPost[] }) {
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

        {posts.length === 0 ? (
          <p className="mt-12 font-stamp text-sm uppercase tracking-wide text-paper/60">
            On file — pending. Posts land here once published from the admin panel.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {posts.map((post, i) => (
              <Stamped key={post.id} delayMs={i * 60}>
                <a
                  href={safeHref(post.permalink)}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Open this post on Instagram"
                  className="group relative block"
                >
                  <PlaceholderPhoto label={post.image} tone="dark" className="aspect-square" />
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/60 group-hover:opacity-100">
                    <IconInstagram className="h-6 w-6 text-gold" />
                  </span>
                </a>
              </Stamped>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
