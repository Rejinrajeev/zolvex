import { getPageContent } from "@/lib/public-content/fetch";
import { asString } from "@/lib/public-content/coerce";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";

interface WhatsAppContent {
  phoneNumber?: string;
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = await getPageContent<WhatsAppContent>("whatsapp");

  return (
    <>
      {children}
      <FloatingWhatsAppButton phoneNumber={asString(whatsapp?.phoneNumber)} />
    </>
  );
}
