import Link from "next/link";
import { IconPhone, IconInstagram, IconArrow, IconWhatsApp, IconMail, IconPin } from "./icons";
import { safeHref } from "@/lib/safe-url";
import { CONTACT } from "@/lib/contact";

const DEFAULT_TAGLINE =
  "Commercial cleaning that keeps offices and commercial spaces feeling brand new — on schedule, every visit logged.";

export function Footer({
  onBookNow,
  tagline,
  instagramUrl,
  phoneNumber,
}: {
  onBookNow: () => void;
  tagline?: string;
  instagramUrl?: string;
  phoneNumber?: string;
}) {
  return (
    <footer className="on-forest bg-cream px-5 pt-4 sm:px-8">
      <div className="mx-auto max-w-[80rem] overflow-hidden rounded-t-[2.5rem] bg-forest px-6 pb-10 pt-14 text-cream sm:px-12 sm:pb-12 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-anton text-3xl uppercase tracking-tight text-cream">
              Zolvex
            </Link>
            <p className="pretty mt-4 max-w-xs font-sora text-sm leading-relaxed text-cream/70">
              {tagline || DEFAULT_TAGLINE}
            </p>
            <button
              type="button"
              onClick={onBookNow}
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-green px-6 py-3 font-sora text-sm font-semibold text-forest transition-transform hover:-translate-y-0.5"
            >
              Book a walkthrough
              <IconArrow aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <FooterCol title="Company">
            <FooterLink href="/#about">About Us</FooterLink>
            <FooterLink href="/#services">Services</FooterLink>
            <li>
              <button
                type="button"
                onClick={onBookNow}
                className="text-left font-sora text-sm text-cream/75 transition-colors hover:text-green"
              >
                Book a walkthrough
              </button>
            </li>
          </FooterCol>

          <FooterCol title="Contact">
            <li className="flex items-center gap-2">
              <IconPhone className="h-4 w-4 shrink-0 text-green" />
              <a
                href={`tel:${phoneNumber || CONTACT.phone}`}
                className="font-sora text-sm text-cream/75 transition-colors hover:text-green"
              >
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <IconWhatsApp className="h-4 w-4 shrink-0 text-green" />
              <a
                href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer noopener"
                className="font-sora text-sm text-cream/75 transition-colors hover:text-green"
              >
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2">
              <IconMail className="h-4 w-4 shrink-0 text-green" />
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-sora text-sm text-cream/75 transition-colors hover:text-green"
              >
                {CONTACT.email}
              </a>
            </li>
            {instagramUrl && (
              <li className="flex items-center gap-2">
                <IconInstagram className="h-4 w-4 shrink-0 text-green" />
                <a
                  href={safeHref(instagramUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-sora text-sm text-cream/75 transition-colors hover:text-green"
                >
                  Instagram
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <IconPin className="h-4 w-4 shrink-0 text-green" />
              <span className="font-sora text-sm text-cream/75">{CONTACT.location}</span>
            </li>
          </FooterCol>

          <FooterCol title="Legal">
            <FooterLink href="/terms">Terms &amp; Conditions</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-cream/10 pt-6 font-sora text-xs text-cream/60 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Zolvex. All rights reserved.</span>
          <span className="tabular">Every visit, on the record.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-anton text-sm uppercase tracking-tight text-green">{title}</h2>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="font-sora text-sm text-cream/75 transition-colors hover:text-green"
      >
        {children}
      </a>
    </li>
  );
}
