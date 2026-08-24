"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The site's one authored motion: content enters like a stamp landing on a
 * ledger page — a brief press-down (scale + settle) rather than a generic
 * fade/slide. Every section and card uses this same grammar.
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
      className={`transition-all duration-700 ${className}`}
      style={{
        transitionTimingFunction: "var(--ease-out-exp)",
        transitionDelay: `${delayMs}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1) translateY(0)" : "scale(0.97) translateY(14px)",
      }}
    >
      {children}
    </div>
  );
}
