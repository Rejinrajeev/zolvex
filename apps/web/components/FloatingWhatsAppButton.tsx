import { IconWhatsApp } from "./icons";

export function FloatingWhatsAppButton({ phoneNumber }: { phoneNumber?: string | null }) {
  if (!phoneNumber) return null;
  const digitsOnly = phoneNumber.replace(/[^\d]/g, "");

  return (
    <a
      href={`https://wa.me/${digitsOnly}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with Zolvex on WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-ink text-gold shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-colors hover:bg-gold hover:text-ink"
    >
      <IconWhatsApp className="h-6 w-6" />
    </a>
  );
}
