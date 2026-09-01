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
      className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green text-forest shadow-[0_16px_36px_-12px_rgba(15,184,119,0.8)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
    >
      <IconWhatsApp className="h-7 w-7 transition-transform group-hover:scale-110" />
    </a>
  );
}
