"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { IconPhone, IconMenu, IconClose } from "./icons";
import { CONTACT } from "@/lib/contact";

const LINKS = [
  { id: "top", href: "/#top", label: "Home" },
  { id: "services", href: "/#services", label: "Services" },
  { id: "about", href: "/#about", label: "About Us" },
  { id: "reviews", href: "/#reviews", label: "Reviews" },
  { id: "contact", href: "/#contact", label: "Contact" },
];

/**
 * The nav is one floating pill holding the whole set, and the section you
 * are actually looking at is lit in Sun. That lit pill is a readout, not a
 * decoration: an IntersectionObserver drives it, so the nav answers "where
 * am I" on a long scrolling page without the visitor clicking anything.
 */
export function Nav({ onBookNow }: { onBookNow: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("top");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    // Bias the trigger line to the upper third so a section counts as
    // "current" once it has actually taken over the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${scrolled ? "bg-bone/85 shadow-[0_10px_30px_-24px_rgba(20,18,16,0.55)] backdrop-blur-md" : "bg-transparent"}`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[84rem] items-center justify-between gap-6 px-4 py-3 sm:px-6 sm:py-4"
      >
        <Link
          href="/"
          className="font-archivo-black text-2xl tracking-[-0.02em] text-carbon sm:text-[1.75rem]"
        >
          Zolvex
        </Link>

        <div
          className={`hidden items-center gap-1 rounded-full p-1.5 transition-[background-color,box-shadow,backdrop-filter] duration-300 md:flex ${
            scrolled
              ? "bg-shell shadow-[0_12px_30px_-22px_rgba(20,18,16,0.4)]"
              : "bg-shell/95 backdrop-blur-sm"
          }`}
        >
          {LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                aria-current={isActive ? "true" : undefined}
                className={`rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors duration-200 lg:px-5 ${
                  isActive
                    ? "bg-sun text-carbon"
                    : "text-carbon/70 hover:bg-carbon/[0.06] hover:text-carbon"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onBookNow}
          className="hidden rounded-full bg-sun px-6 py-3 text-[0.95rem] font-semibold text-carbon shadow-[0_14px_28px_-14px_rgba(20,18,16,0.5)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-sun-deep active:translate-y-0 md:block"
        >
          Book a visit
        </button>

        <button
          type="button"
          className={`flex h-11 w-11 items-center justify-center rounded-full text-carbon transition-colors md:hidden ${
            scrolled || open ? "bg-shell shadow-[0_10px_24px_-20px_rgba(20,18,16,0.4)]" : "bg-shell/95"
          }`}
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
            className="overflow-hidden px-4 md:hidden"
          >
            <div className="flex flex-col gap-1 rounded-[1.75rem] bg-shell p-3 shadow-[0_28px_60px_-28px_rgba(20,18,16,0.5)]">
              {LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-full px-5 py-3.5 text-lg font-medium transition-colors ${
                    active === link.id ? "bg-sun text-carbon" : "text-carbon"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={`tel:${CONTACT.phone}`}
                className="flex items-center gap-2.5 rounded-full px-5 py-3.5 text-lg font-medium text-sun-ink"
              >
                <IconPhone className="h-5 w-5" /> Call Zolvex
              </a>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onBookNow();
                }}
                className="mt-1 rounded-full bg-sun px-5 py-4 text-center text-lg font-semibold text-carbon"
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
