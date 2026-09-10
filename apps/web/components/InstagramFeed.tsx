import { Reveal, Stagger, StaggerItem } from "./motion-primitives";
import { Photo } from "./Photo";
import { IconInstagram } from "./icons";
import { safeHref } from "@/lib/safe-url";

export interface PublicInstagramPost {
  id: string;
  image: string;
  permalink: string;
}

export function InstagramFeed({ posts }: { posts: PublicInstagramPost[] }) {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[84rem]">
        <Reveal className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sun text-carbon">
            <IconInstagram className="h-6 w-6" />
          </span>
          <h2 className="text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-carbon">
            Follow the crew
          </h2>
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
          <Stagger className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {posts.map((post, i) => (
              <StaggerItem key={post.id}>
                <a
                  href={safeHref(post.permalink)}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Open Zolvex Instagram post ${i + 1}`}
                  className="group relative block overflow-hidden rounded-2xl"
                >
                  <Photo
                    src={post.image}
                    label={`Instagram post ${i + 1}`}
                    width={360}
                    aspect="1 / 1"
                    className="rounded-2xl"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-carbon/0 opacity-0 transition-all duration-300 group-hover:bg-carbon/55 group-hover:opacity-100">
                    <IconInstagram className="h-6 w-6 text-sun" />
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
