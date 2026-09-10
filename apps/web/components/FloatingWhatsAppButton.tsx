import { IconWhatsApp } from "./icons";

/**
 * Carbon rather than WhatsApp green: the glyph already carries the
 * recognition, and a second saturated colour would compete with Sun for
 * the meaning of "this is the action".
 */
export function FloatingWhatsAppButton({ phoneNumber }: { phoneNumber?: string | null }) {
  if (!phoneNumber) return null;
  const digitsOnly = phoneNumber.replace(/[^\d]/g, "");

  return (
    <a
      href={`https://wa.me/${digitsOnly}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with Zolvex on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-carbon text-sun shadow-[0_16px_36px_-14px_rgba(20,18,16,0.75)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
    >
      <IconWhatsApp className="h-7 w-7 transition-transform group-hover:scale-110" />
    </a>
  );
}
