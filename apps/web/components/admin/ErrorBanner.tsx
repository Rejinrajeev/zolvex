/**
 * A non-field-level failure (upload errors, network errors) -- a bordered
 * strip per DESIGN.md's border-driven depth language. A narrow, documented
 * extension to DESIGN.md (see this plan's design spec's "Visual design"
 * section) for a pattern the system didn't already define.
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="border-2 border-ink bg-paper px-4 py-3 font-body text-sm text-ink">
      {message}
    </div>
  );
}
