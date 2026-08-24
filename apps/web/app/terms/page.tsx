export default function TermsPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
      <p className="font-stamp text-xs uppercase tracking-[0.15em] text-slate">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-ink">Terms & Conditions</h1>
      <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-slate">
        Zolvex’s full terms of service are being finalized and will be
        published here before launch. For questions in the meantime, reach
        out through the enquiry form on the homepage.
      </p>
      <a
        href="/"
        className="mt-8 inline-block font-body text-olive-ink underline underline-offset-4"
      >
        Back to Zolvex
      </a>
    </main>
  );
}
