import { Stamped } from "./Stamped";
import { PlaceholderPhoto } from "./PlaceholderPhoto";

const POSTS = [
  {
    title: "What our crews actually do on a walkthrough",
    excerpt:
      "A behind-the-scenes look at the checklist every Zolvex site visit runs through, floor by floor.",
    tag: "The things we do",
  },
  {
    title: "Why commercial cleaning isn't optional overhead",
    excerpt:
      "Air quality, first impressions, and staff sick days — the real cost of an inconsistent cleaning schedule.",
    tag: "Why it matters",
  },
  {
    title: "Reading a service log like a facilities manager",
    excerpt:
      "What to actually check for when a vendor says a job is 'done' — and how our logs make that verifiable.",
    tag: "The things we do",
  },
];

export function Blog() {
  return (
    <section className="ledger-ground-dark punch-edge relative px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <Stamped>
          <h2 className="max-w-lg font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
            From the log book.
          </h2>
        </Stamped>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {POSTS.map((post, i) => (
            <Stamped key={post.title} delayMs={i * 90}>
              <article className="group flex h-full flex-col">
                <PlaceholderPhoto label={post.title} tone="dark" />
                <span className="mt-5 font-stamp text-xs uppercase tracking-[0.15em] text-gold/80">
                  {post.tag}
                </span>
                <h3 className="mt-2 font-display text-xl font-medium leading-snug text-paper">
                  {post.title}
                </h3>
                <p className="mt-3 flex-1 font-body text-[0.95rem] leading-relaxed text-paper/70">
                  {post.excerpt}
                </p>
                <span className="mt-4 inline-flex w-fit items-center gap-1.5 font-body text-sm text-gold underline decoration-gold/30 underline-offset-4 transition-colors group-hover:decoration-gold">
                  Read the entry →
                </span>
              </article>
            </Stamped>
          ))}
        </div>
      </div>
    </section>
  );
}
