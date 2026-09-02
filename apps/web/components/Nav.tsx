"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { IconPhone, IconMenu, IconClose } from "./icons";
import { CONTACT } from "@/lib/contact";

const LINKS = [
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About Us" },
];

export function Nav({ onBookNow }: { onBookNow: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? "bg-cream/85 shadow-[0_10px_30px_-18px_rgba(12,58,44,0.35)] backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[80rem] items-center justify-between px-5 sm:h-20 sm:px-8"
      >
        <Link
          href="/"
          className="font-anton text-2xl uppercase tracking-tight text-ink sm:text-3xl"
        >
          Zolvex
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative font-sora text-[0.95rem] font-medium text-ink/80 transition-colors hover:text-ink"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-green transition-[width] duration-300 group-hover:w-full" />
            </a>
          ))}
          <a
            href={`tel:${CONTACT.phone}`}
            aria-label="Call Zolvex"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-green hover:text-green-ink"
          >
            <IconPhone className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={onBookNow}
            className="rounded-full bg-green px-5 py-2.5 font-sora text-[0.95rem] font-semibold text-forest shadow-[0_10px_24px_-12px_rgba(15,184,119,0.7)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Book a visit
          </button>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden bg-cream md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 pb-6 pt-2">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-ink/10 py-3.5 font-sora text-lg font-medium text-ink"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={`tel:${CONTACT.phone}`}
                className="flex items-center gap-2 py-3.5 font-sora text-lg font-medium text-green-ink"
              >
                <IconPhone className="h-5 w-5" /> Call Zolvex
              </a>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onBookNow();
                }}
                className="mt-3 rounded-full bg-green px-5 py-3 text-center font-sora font-semibold text-forest"
              >
                Book a visit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
