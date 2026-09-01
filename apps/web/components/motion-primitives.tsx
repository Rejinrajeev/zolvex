"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  animate,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

// Hoisted so no motion component is created during render.
const TAGS = {
  div: motion.div,
  section: motion.section,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  figure: motion.figure,
  article: motion.article,
} as const;
type TagName = keyof typeof TAGS;

/* -----------------------------------------------------------
   Reveal — the site's one authored entrance. Content sits at
   its final position by default and eases up + in the first
   time it enters the viewport. Reduced-motion collapses the
   transform to an instant fade via MotionConfig.
   ----------------------------------------------------------- */
export function Reveal({
  children,
  className,
  as = "div",
  delay = 0,
  y = 26,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  as?: TagName;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const MotionTag = TAGS[as];
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: TagName;
}) {
  const MotionTag = TAGS[as];
  return (
    <MotionTag
      className={className}
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: TagName;
}) {
  const MotionTag = TAGS[as];
  return (
    <MotionTag className={className} variants={itemV}>
      {children}
    </MotionTag>
  );
}

/* Parallax — drifts a layer against scroll. */
export function Parallax({
  children,
  className,
  style,
  distance = 80,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <motion.div ref={ref} className={className} style={{ ...style, y: reduce ? 0 : y }}>
      {children}
    </motion.div>
  );
}

/* Blob — soft organic shape, slow ambient float + light parallax. */
export function Blob({
  className = "",
  style,
  color,
  distance = 60,
}: {
  className?: string;
  style?: CSSProperties;
  color: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={`blob ${className}`}
      style={{ ...style, background: color, y: reduce ? 0 : y }}
      animate={reduce ? undefined : { scale: [1, 1.06, 1], rotate: [0, 6, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* Seal — slowly rotating circular text badge, purely decorative.
   `filled` draws a solid disc behind the text (use on light grounds);
   otherwise just the rotating ring text (use on a solid dark panel). */
export function Seal({
  text = "ON TIME · EVERY VISIT LOGGED · ",
  className = "",
  size = 140,
  filled = false,
  discClassName = "fill-green",
}: {
  text?: string;
  className?: string;
  size?: number;
  filled?: boolean;
  discClassName?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={className}
      style={{ width: size, height: size }}
      animate={reduce ? undefined : { rotate: 360 }}
      transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <path id="seal-path" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" fill="none" />
        </defs>
        {filled && <circle cx="60" cy="60" r="58" className={discClassName} />}
        <text
          fill="currentColor"
          style={{
            fontFamily: "var(--font-sora), system-ui, sans-serif",
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: 1.5,
          }}
        >
          <textPath href="#seal-path">{text.repeat(2)}</textPath>
        </text>
      </svg>
    </motion.div>
  );
}

/* CountUp — eases a number up the first time it's on screen. */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  duration = 1.6,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, { duration, ease: EASE, onUpdate: (v) => setValue(v) });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  const shown = reduce && inView ? to : value;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(shown).toLocaleString()}
      {suffix}
    </span>
  );
}
