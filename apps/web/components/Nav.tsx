"use client";

import { useEffect, useState } from "react";
import { IconPhone, IconMenu, IconClose } from "./icons";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About Us" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`site-header fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "bg-ink/95 backdrop-blur-sm border-b border-gold/15" : "bg-transparent"
      }`}
      style={{ transitionTimingFunction: "var(--ease-out-exp)" }}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-18 max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12"
      >
        <a
          href="#top"
          className="font-display text-2xl font-semibold tracking-tight text-paper"
        >
          Zolvex
        </a>

        <div className="hidden items-center gap-10 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-[0.95rem] text-paper/85 transition-colors hover:text-gold"
            >
              {link.label}
            </a>
          ))}
          <a
            href="tel:+10000000000"
            aria-label="Call Zolvex"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 text-gold transition-colors hover:bg-gold hover:text-ink"
          >
            <IconPhone className="h-5 w-5" />
          </a>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center text-paper md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>
      </nav>

      <div
        id="mobile-nav"
        className={`overflow-hidden bg-ink transition-[max-height] duration-500 md:hidden ${
          open ? "max-h-64" : "max-h-0"
        }`}
        style={{ transitionTimingFunction: "var(--ease-out-exp)" }}
      >
        <div className="flex flex-col gap-1 px-5 pb-6 pt-2">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-gold/10 py-3 font-body text-paper/90"
            >
              {link.label}
            </a>
          ))}
          <a
            href="tel:+10000000000"
            className="flex items-center gap-2 py-3 font-body text-gold"
          >
            <IconPhone className="h-5 w-5" /> Call Zolvex
          </a>
        </div>
      </div>
    </header>
  );
}
