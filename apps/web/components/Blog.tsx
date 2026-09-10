import { Reveal, Stagger, StaggerItem } from "./motion-primitives";
import { Photo } from "./Photo";
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
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[84rem]">
        <Reveal
          as="h2"
          className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-carbon"
        >
          Fresh from <span className="text-sun-ink">the field</span>
        </Reveal>

        {posts.length === 0 ? (
          <Reveal
            as="p"
            delay={0.1}
            className="mt-12 rounded-[1.75rem] bg-shell p-10 text-center text-base text-ash"
          >
            Posts land here once they are published from the admin panel.
          </Reveal>
        ) : (
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <StaggerItem key={post.id}>
                <a
                  href={safeHref(post.instagramUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-shell p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_-28px_rgba(20,18,16,0.45)]"
                >
                  <Photo
                    src={post.image}
                    label={post.title}
                    width={640}
                    className="rounded-[1.35rem]"
                  />
                  <h3 className="mt-5 px-1 text-xl font-semibold leading-snug tracking-[-0.01em] text-carbon">
                    {post.title}
                  </h3>
                  <span className="mt-4 inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-sun-ink">
                    View on Instagram
                    <IconArrow
                      aria-hidden
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
