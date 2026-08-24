"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The site's one authored motion: a section arrives like a stamp coming
 * down onto a ledger page — starting slightly oversized and dropping to
 * rest, not a generic fade-up. Reserved for section-level entrances only
 * (not every card/row inside a section) so it stays one authored moment
 * rather than a repeated tic.
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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Safety net: content must never depend entirely on the observer firing.
    // Without IntersectionObserver support, or if it simply never fires
    // (a resized/print viewport, an automated full-page capture, a
    // back-forward-cache restore), the section still becomes visible on its
    // own after a short delay rather than staying permanently hidden.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const fallback = window.setTimeout(() => setVisible(true), 1200);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          window.clearTimeout(fallback);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${className}`}
      style={{
        transitionTimingFunction: "var(--ease-stamp)",
        transitionDelay: `${delayMs}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1) translateY(0)" : "scale(1.06) translateY(-10px)",
      }}
    >
      {children}
    </div>
  );
}
