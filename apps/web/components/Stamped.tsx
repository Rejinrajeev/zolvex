import type { ReactNode } from "react";

/**
 * The site's one authored motion: a section arrives like a stamp coming
 * down onto a ledger page — starting slightly oversized and dropping to
 * rest. Pure CSS keyframe animation (see .stamp-reveal in globals.css),
 * deliberately NOT scroll-triggered: an earlier IntersectionObserver-based
 * version left below-fold content invisible until either a real scroll
 * event reached it or an 800ms fallback timer fired, which meant any fast
 * or non-interactive render (a quick screenshot, a slow device, a crawler)
 * could see blank sections. A CSS animation runs on paint regardless of
 * scroll position or JS timing and always resolves to its final visible
 * frame, so content is never gated behind an event that might not fire.
 */
export function Stamped({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      data-stamped
      className={`stamp-reveal ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
