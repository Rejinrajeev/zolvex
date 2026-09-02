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
    <section className="bg-mist px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[80rem]">
        <Reveal as="h2" className="font-anton text-5xl uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
          Fresh from
          <br />
          the field
        </Reveal>

        {posts.length === 0 ? (
          <Reveal as="p" delay={0.1} className="mt-14 font-sora text-base text-moss">
            Posts land here once they&apos;re published from the admin panel.
          </Reveal>
        ) : (
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <StaggerItem key={post.id}>
                <a
                  href={safeHref(post.instagramUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-paper p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-24px_rgba(12,58,44,0.3)]"
                >
                  <Photo src={post.image} label={post.title} width={640} className="rounded-[1.25rem]" />
                  <h3 className="mt-5 px-1 font-anton text-xl uppercase leading-tight tracking-tight text-ink">
                    {post.title}
                  </h3>
                  <span className="mt-4 inline-flex items-center gap-1.5 px-1 font-sora text-sm font-semibold text-green-ink">
                    View on Instagram
                    <IconArrow aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
