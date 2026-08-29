const LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  published: "Published",
  rejected: "Rejected",
};

/**
 * The five generic types' approvalStatus, rendered as a "logged" stamp --
 * font-stamp is DESIGN.md's role reserved for dates/statuses/tags, never
 * headings or body copy. No red anywhere: the palette has none by design.
 */
export function StatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status;
  const base = "inline-block font-stamp text-[0.7rem] uppercase tracking-wide px-2 py-1";

  if (status === "published") {
    return <span className={`${base} bg-gold text-ink`}>{label}</span>;
  }
  if (status === "pending_approval") {
    return <span className={`${base} border border-olive-ink/60 text-olive-ink`}>{label}</span>;
  }
  if (status === "rejected") {
    return (
      <span className={`${base} border-2 border-ink text-ink`}>
        <span aria-hidden="true" className="stamp-rotate inline-block mr-1">◆</span>
        {label}
      </span>
    );
  }
  return <span className={`${base} text-slate`}>{label}</span>;
}
