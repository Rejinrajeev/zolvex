/**
 * PageContent is stored as freeform JSON with no per-field shape
 * validation server-side -- an admin typo (e.g. an unquoted number for a
 * field meant to be a string) saves fine and would otherwise flow straight
 * into `.replace()`/`.lastIndexOf()`/JSX-child rendering and crash the
 * public site. Coerce every PageContent field at the point of use instead
 * of trusting the generic type parameter.
 */
export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
