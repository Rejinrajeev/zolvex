const LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  published: "Published",
  rejected: "Rejected",
};

const STYLES: Record<string, string> = {
  published: "bg-green/18 text-green-ink",
  pending_approval: "bg-gold/40 text-ink",
  rejected: "bg-danger-soft text-danger",
  draft: "bg-ink/8 text-moss",
};

/** A record's approval status as a small rounded pill. Colour carries the
 *  state (green = live, gold = waiting, outline = rejected, grey = draft),
 *  never on its own — the label always says which. */
export function StatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status;
  const style = STYLES[status] ?? "bg-ink/8 text-moss";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-sora text-xs font-semibold uppercase tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}
