import type { Metadata } from "next";
import { LegalPage, type LegalSectionData } from "@/components/LegalPage";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms & Conditions — Zolvex",
  description:
    "The terms that apply when you book or use a Zolvex service — bookings, pricing, cancellations, liability and warranty.",
};

const SECTIONS: LegalSectionData[] = [
  {
    title: "1. Services Overview",
    body: (
      <p>
        Zolvex Home Services provides residential and commercial services including
        cleaning, maintenance, repairs, installation, and related home support services.
        All services are delivered by trained, verified, and professional technicians.
      </p>
    ),
  },
  {
    title: "2. Booking & Service Confirmation",
    body: (
      <ul>
        <li>Bookings can be made via phone, WhatsApp, website, or authorized platforms.</li>
        <li>A booking is confirmed only after acceptance by Zolvex.</li>
        <li>
          Service timings are approximate and may change due to traffic, weather, site
          conditions, or prior job delays.
        </li>
      </ul>
    ),
  },
  {
    title: "3. Pricing & Payments",
    body: (
      <ul>
        <li>
          Service prices depend on the type of service, scope of work, location, and
          duration.
        </li>
        <li>
          Final charges may vary if additional work is requested or if on-site conditions
          differ from the original booking details.
        </li>
        <li>Payments can be made via cash, UPI, bank transfer, or other approved digital methods.</li>
        <li>
          Any advance payment, if collected, is non-refundable once the service has
          started.
        </li>
      </ul>
    ),
  },
  {
    title: "4. Cancellations & Rescheduling",
    body: (
      <ul>
        <li>
          Cancellation or rescheduling requests must be made at least 24–48 hours before
          the scheduled service time.
        </li>
        <li>Late cancellations may attract a cancellation fee.</li>
        <li>Zolvex reserves the right to reschedule or cancel services due to unavoidable circumstances.</li>
      </ul>
    ),
  },
  {
    title: "5. Scope of Work",
    body: (
      <ul>
        <li>Only services agreed upon at the time of booking will be provided.</li>
        <li>Any additional requests will be charged separately.</li>
        <li>
          Zolvex is not responsible for issues arising from pre-existing damage, poor
          infrastructure, or prior faulty work.
        </li>
      </ul>
    ),
  },
  {
    title: "6. Materials & Spare Parts",
    body: (
      <ul>
        <li>
          Materials or spare parts supplied by Zolvex will be charged separately unless
          otherwise mentioned.
        </li>
        <li>Manufacturer warranty applies only to Zolvex-supplied materials.</li>
        <li>No warranty is provided for customer-supplied materials or parts.</li>
      </ul>
    ),
  },
  {
    title: "7. Pre-Existing Conditions",
    body: (
      <ul>
        <li>
          The customer confirms that Zolvex is not responsible for pre-existing issues such
          as cracks, paint peel-off, loose fittings, rust, scratches, discoloration, wear
          and tear, or structural weaknesses.
        </li>
        <li>
          Zolvex will take reasonable care during service but is not liable for damages
          resulting from such conditions.
        </li>
      </ul>
    ),
  },
  {
    title: "8. Customer Responsibilities",
    body: (
      <>
        <p>Customers must ensure:</p>
        <ul>
          <li>Safe and clear access to the service location</li>
          <li>Availability of water, electricity, and basic facilities</li>
          <li>Children and pets are kept away from the work area</li>
          <li>Accurate service details are shared during booking</li>
          <li>Personal belongings and valuables are secured before service begins</li>
        </ul>
        <p>
          Zolvex is not responsible for delays or incomplete work due to lack of access or
          utilities.
        </p>
      </>
    ),
  },
  {
    title: "9. Personal Belongings & Valuables",
    body: (
      <ul>
        <li>
          Customers must secure cash, jewellery, documents, electronics, and other
          valuables before service.
        </li>
        <li>
          Zolvex shall not be responsible for loss or misplacement of unsecured personal
          belongings.
        </li>
      </ul>
    ),
  },
  {
    title: "10. Technician Verification & Conduct",
    body: (
      <ul>
        <li>All Zolvex technicians are background-verified, police-cleared, and professionally trained.</li>
        <li>Technicians are expected to maintain honesty, discipline, hygiene, and professionalism.</li>
        <li>Zolvex follows strict internal safety and conduct policies to ensure customer trust.</li>
      </ul>
    ),
  },
  {
    title: "11. Extended or Multi-Day Services",
    body: (
      <p>
        Some services may extend beyond one day due to site conditions or work complexity.
        Such extensions are considered part of the same service unless otherwise agreed.
      </p>
    ),
  },
  {
    title: "12. Service Completion & Acceptance",
    body: (
      <ul>
        <li>Customers are requested to inspect the service upon completion.</li>
        <li>Any concerns must be raised before the service team leaves the premises.</li>
        <li>Complaints raised after team exit may not be entertained.</li>
      </ul>
    ),
  },
  {
    title: "13. Damage & Liability",
    body: (
      <ul>
        <li>Zolvex takes reasonable care while delivering services.</li>
        <li>Any damage claims must be reported within 24 hours of service completion.</li>
        <li>
          Liability, if applicable, is limited to the value of the service provided and
          excludes indirect or consequential losses.
        </li>
      </ul>
    ),
  },
  {
    title: "14. Service Warranty",
    body: (
      <ul>
        <li>Service warranties, if applicable, will be communicated clearly.</li>
        <li>Warranty becomes void if services are altered, misused, or handled by third parties.</li>
      </ul>
    ),
  },
  {
    title: "15. Safety & Right to Refuse Service",
    body: (
      <ul>
        <li>Zolvex professionals follow standard safety and hygiene practices.</li>
        <li>
          Zolvex reserves the right to refuse or stop services in unsafe environments or in
          cases of abusive, threatening, or inappropriate behavior.
        </li>
      </ul>
    ),
  },
  {
    title: "16. Intellectual Property",
    body: (
      <p>
        All content, branding, logos, and materials related to Zolvex Home Services are the
        intellectual property of Zolvex and may not be used without written permission.
      </p>
    ),
  },
  {
    title: "17. Authorization",
    body: (
      <p>
        By booking or availing Zolvex services, the customer confirms that they have read,
        understood, and agreed to these Terms &amp; Conditions and authorize Zolvex to
        proceed with the selected service.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="2 September 2026"
      intro={
        <p>
          These terms apply whenever you book or use a Zolvex service. Questions? Email{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or call{" "}
          <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
