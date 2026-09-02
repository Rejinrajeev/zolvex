/**
 * Canonical Zolvex contact details — one source of truth for the nav,
 * footer, floating WhatsApp button and the legal pages. The `whatsapp`
 * PageContent key can still override the WhatsApp number from the admin
 * panel; these are the defaults when it hasn't been set.
 */
export const CONTACT = {
  email: "info@zolvex.in",
  /** E.164 — for `tel:` links. */
  phone: "+918089631909",
  phoneDisplay: "+91 80896 31909",
  /** E.164 — used for `https://wa.me/<digits>`. */
  whatsapp: "+918590570373",
  whatsappDisplay: "+91 85905 70373",
  location: "Kerala, India",
} as const;
