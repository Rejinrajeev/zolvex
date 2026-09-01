"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * One place that sets motion defaults for the whole public site.
 * `reducedMotion: "user"` makes every `motion` component honour
 * prefers-reduced-motion automatically — transforms and layout animations
 * collapse to instant, so the reveal-on-scroll content still lands visible.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  );
}
