import { getPageContent } from "@/lib/public-content/fetch";
import { asString } from "@/lib/public-content/coerce";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { CONTACT } from "@/lib/contact";

interface WhatsAppContent {
  phoneNumber?: string;
}

/**
 * The public site's wrapper. `site-world` is what switches this tree into
 * the v2 "Yellow Van" palette, type and browser surfaces (globals.css);
 * the admin tree never receives it, so both worlds coexist in one stylesheet.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = await getPageContent<WhatsAppContent>("whatsapp");

  return (
    <div className="site-world flex min-h-full flex-1 flex-col">
      {children}
      <FloatingWhatsAppButton phoneNumber={asString(whatsapp?.phoneNumber) ?? CONTACT.whatsapp} />
    </div>
  );
}
