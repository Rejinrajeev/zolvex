import type { SVGProps } from "react";

/**
 * One consistent line-icon system for the whole site: 1.5px stroke, round
 * caps/joins, 24x24 viewbox. No emoji, no icon-font glyphs.
 */
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function IconOffice(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 21V6l7-3 9 4v14" />
      <path d="M4 21h17" />
      <path d="M9 21v-6h4v6" />
      <path d="M9 9h.01M13 9h.01M17 9h.01M13 13h.01M17 13h.01" />
    </svg>
  );
}

export function IconCarpet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M3 9h18M3 13h18M7 5v14M11 5v14M15 5v14" strokeOpacity="0.55" />
    </svg>
  );
}

export function IconWindow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M4 12h16M12 3v18" />
      <path d="M7 7l1.5 1.5M20 15.5L15 21" strokeOpacity="0.55" />
    </svg>
  );
}

export function IconPostConstruction(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 21l9-15 9 15" />
      <path d="M8.5 13h7" />
      <path d="M12 3v3" />
    </svg>
  );
}

export function IconFloor(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 17l9-5 9 5-9 5-9-5z" />
      <path d="M3 17V9l9-5 9 5v8" strokeOpacity="0.55" />
    </svg>
  );
}

export function IconSanitize(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3h6l1 4H8l1-4z" />
      <path d="M7 7h10l1 13a1 1 0 01-1 1H7a1 1 0 01-1-1L7 7z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconStar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.6l-5.9 2.9 1.3-6.6-4.9-4.5 6.6-.8L12 2.5z" />
    </svg>
  );
}

export function IconStarOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.6l-5.9 2.9 1.3-6.6-4.9-4.5 6.6-.8L12 2.5z" />
    </svg>
  );
}

export function IconPhone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2C9.6 21 3 14.4 3 6a2 2 0 012-2z" />
    </svg>
  );
}

export function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconChevron(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconMenu(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
