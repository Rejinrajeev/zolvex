import Link from "next/link";
import { IconPhone, IconInstagram, IconArrow, IconWhatsApp, IconMail, IconPin } from "./icons";
import { safeHref } from "@/lib/safe-url";
import { CONTACT } from "@/lib/contact";

const DEFAULT_TAGLINE =
  "Home and commercial services — cleaning, maintenance, repairs and installation. Trained, background-verified people, on schedule, every visit logged.";

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
    <footer id="contact" className="on-carbon px-5 pt-4 sm:px-8">
      <div className="mx-auto max-w-[84rem] overflow-hidden rounded-t-[2.5rem] bg-carbon px-6 pb-10 pt-14 text-bone sm:px-12 sm:pb-12 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-archivo-black text-3xl tracking-[-0.02em] text-bone">
              Zolvex
            </Link>
            <p className="pretty mt-4 max-w-xs text-sm leading-relaxed text-bone/70">
              {tagline || DEFAULT_TAGLINE}
            </p>
            <button
              type="button"
              onClick={onBookNow}
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-sun px-6 py-3 text-sm font-semibold text-carbon transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-sun-deep"
            >
              Book a visit
              <IconArrow
                aria-hidden
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </button>
          </div>

          <FooterCol title="Company">
            <FooterLink href="/#about">About Us</FooterLink>
            <FooterLink href="/#services">Services</FooterLink>
            <FooterLink href="/#reviews">Reviews</FooterLink>
            <li>
              <button
                type="button"
                onClick={onBookNow}
                className="text-left text-sm text-bone/75 transition-colors hover:text-sun"
              >
                Book a visit
              </button>
            </li>
          </FooterCol>

          <FooterCol title="Contact">
            <li className="flex items-center gap-2">
              <IconPhone className="h-4 w-4 shrink-0 text-sun" />
              <a
                href={`tel:${phoneNumber || CONTACT.phone}`}
                className="text-sm text-bone/75 transition-colors hover:text-sun"
              >
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <IconWhatsApp className="h-4 w-4 shrink-0 text-sun" />
              <a
                href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-bone/75 transition-colors hover:text-sun"
              >
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2">
              <IconMail className="h-4 w-4 shrink-0 text-sun" />
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-sm text-bone/75 transition-colors hover:text-sun"
              >
                {CONTACT.email}
              </a>
            </li>
            {instagramUrl && (
              <li className="flex items-center gap-2">
                <IconInstagram className="h-4 w-4 shrink-0 text-sun" />
                <a
                  href={safeHref(instagramUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-bone/75 transition-colors hover:text-sun"
                >
                  Instagram
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <IconPin className="h-4 w-4 shrink-0 text-sun" />
              <span className="text-sm text-bone/75">{CONTACT.location}</span>
            </li>
          </FooterCol>

          <FooterCol title="Legal">
            <FooterLink href="/terms">Terms &amp; Conditions</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-bone/10 pt-6 text-xs text-bone/60 sm:flex-row sm:items-center">
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
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-sun">{title}</h2>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="text-sm text-bone/75 transition-colors hover:text-sun">
        {children}
      </a>
    </li>
  );
}
