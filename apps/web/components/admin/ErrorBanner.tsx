import { Notice } from "./ui";

/** A page- or form-level failure. Kept as its own export for the many call
 *  sites; renders the shared error Notice. */
export function ErrorBanner({ message }: { message: string }) {
  return <Notice tone="error">{message}</Notice>;
}
