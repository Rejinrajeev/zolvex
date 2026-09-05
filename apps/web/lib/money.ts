const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Formats a whole-rupee amount as "₹1,499". Returns null for a missing,
 * zero, or non-positive value so callers can just do
 * `{price && <p>From {price}</p>}` — a service with no price shows none.
 */
export function formatRupees(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return INR.format(Math.round(value));
}
