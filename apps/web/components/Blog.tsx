import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";
import { IconArrow } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicBlogPost {
  id: string;
  title: string;
  image: string;
  instagramUrl: string;
}

export function Blog({ posts }: { posts: PublicBlogPost[] }) {
  return (
    <section className="ledger-ground-dark punch-edge relative px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <h2 className="max-w-lg font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
            From the log book.
          </h2>
        </Stamped>

        {posts.length === 0 ? (
          <p className="mt-14 font-stamp text-sm uppercase tracking-wide text-paper/60">
            On file — pending. Posts land here once published from the admin panel.
          </p>
        ) : (
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {posts.map((post, i) => (
              <Stamped key={post.id} delayMs={i * 90}>
                <a
                  href={safeHref(post.instagramUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex h-full flex-col"
                >
                  <PlaceholderPhoto label={post.title} tone="dark" />
                  <h3 className="mt-5 font-display text-xl font-medium leading-snug text-paper">
                    {post.title}
                  </h3>
                  <div className="mt-4 flex items-center gap-2.5">
                    <span className="inline-flex w-fit items-center gap-1.5 font-body text-sm text-gold underline decoration-gold/30 underline-offset-4 transition-colors group-hover:decoration-gold">
                      View on Instagram
                      <IconArrow aria-hidden className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              </Stamped>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
