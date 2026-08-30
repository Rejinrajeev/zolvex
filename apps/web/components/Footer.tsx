import { IconPhone, IconInstagram } from "./icons";

export function Footer({ onBookNow }: { onBookNow: () => void }) {
  return (
    <footer className="punch-edge relative bg-ink px-5 pb-10 pt-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="#top" className="font-display text-2xl font-semibold text-paper">
              Zolvex
            </a>
            <p className="mt-3 max-w-xs font-body text-sm leading-relaxed text-paper/70">
              Commercial cleaning, logged and on time — for offices, retail,
              and commercial spaces.
            </p>
          </div>

          <div>
            <h3 className="font-stamp text-xs uppercase tracking-[0.15em] text-gold/80">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-paper/75">
              <li><a href="#about" className="hover:text-gold">About Us</a></li>
              <li><a href="#services" className="hover:text-gold">Services</a></li>
              <li>
                <button type="button" onClick={onBookNow} className="text-left hover:text-gold">
                  Book Now
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-stamp text-xs uppercase tracking-[0.15em] text-gold/80">
              Contact
            </h3>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-paper/75">
              <li className="flex items-center gap-2">
                <IconPhone className="h-4 w-4 text-gold" />
                <a href="tel:+10000000000" className="hover:text-gold">
                  Call for a quote
                </a>
              </li>
              <li className="flex items-center gap-2">
                <IconInstagram className="h-4 w-4 text-gold" />
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-gold"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-stamp text-xs uppercase tracking-[0.15em] text-gold/80">
              Legal
            </h3>
            <ul className="mt-4 space-y-2.5 font-body text-sm text-paper/75">
              <li><a href="/terms" className="hover:text-gold">Terms & Conditions</a></li>
              <li><a href="/privacy" className="hover:text-gold">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-gold/10 pt-6 font-body text-xs text-paper/70 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Zolvex. All rights reserved.</span>
          <span className="font-stamp uppercase tracking-wide">Every visit, on the record.</span>
        </div>
      </div>
    </footer>
  );
}
