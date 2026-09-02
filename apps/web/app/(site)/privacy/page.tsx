import type { Metadata } from "next";
import { LegalPage, type LegalSectionData } from "@/components/LegalPage";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy — Zolvex",
  description:
    "How Zolvex collects, uses, shares and protects your personal information when you use our website or services.",
};

const SECTIONS: LegalSectionData[] = [
  {
    title: "1. Introduction",
    body: (
      <>
        <p>Welcome to Zolvex.</p>
        <p>
          Zolvex (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) respects your
          privacy and is committed to protecting the personal information of users who
          visit our website and use our home services.
        </p>
        <p>
          This Privacy Policy explains how we collect, use, disclose, and protect your
          information when you use our website or services, in accordance with applicable
          laws in India, including the Information Technology Act, 2000.
        </p>
      </>
    ),
  },
  {
    title: "2. Information We Collect",
    body: (
      <>
        <h3>a. Personal Information</h3>
        <p>When you use our website or services, we may collect:</p>
        <ul>
          <li>Full name</li>
          <li>Phone number</li>
          <li>Email address</li>
          <li>Home or service address</li>
          <li>Service request details</li>
          <li>Booking information</li>
          <li>Payment details (processed securely via third-party payment gateways)</li>
        </ul>
        <h3>b. Automatically Collected Information</h3>
        <p>We may automatically collect:</p>
        <ul>
          <li>IP address</li>
          <li>Browser type and device information</li>
          <li>Pages visited and time spent</li>
          <li>Cookies and usage data</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. How We Use Your Information",
    body: (
      <>
        <p>We use your information to:</p>
        <ul>
          <li>Schedule and deliver home services (cleaning, plumbing, electrical, etc.)</li>
          <li>Respond to enquiries and customer support requests</li>
          <li>Process online bookings and payments</li>
          <li>Send service updates, confirmations, and invoices</li>
          <li>Improve our website, services, and user experience</li>
          <li>Send promotional emails or messages (with opt-out options)</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Cookies & Tracking Technologies",
    body: (
      <>
        <p>Our website uses cookies and similar technologies to:</p>
        <ul>
          <li>Analyze website traffic (Google Analytics)</li>
          <li>Improve marketing performance (Facebook Pixel)</li>
          <li>Enhance user experience</li>
        </ul>
        <p>
          You can choose to disable cookies through your browser settings, though some
          features of the website may not function properly.
        </p>
      </>
    ),
  },
  {
    title: "5. Sharing of Information",
    body: (
      <>
        <p>We may share your information only with:</p>
        <ul>
          <li>Authorized employees and service professionals</li>
          <li>Payment gateway providers</li>
          <li>Website hosting and analytics providers</li>
          <li>Legal or regulatory authorities if required by law</li>
        </ul>
        <p>We do not sell, rent, or trade your personal information to third parties.</p>
      </>
    ),
  },
  {
    title: "6. Online Payments",
    body: (
      <>
        <p>All online payments are processed through secure third-party payment gateways.</p>
        <p>Zolvex does not store your credit/debit card or UPI details.</p>
      </>
    ),
  },
  {
    title: "7. Data Security",
    body: (
      <>
        <p>We take reasonable and appropriate security measures to protect your data, including:</p>
        <ul>
          <li>Secure servers</li>
          <li>Limited access to personal data</li>
          <li>Industry-standard security practices</li>
        </ul>
        <p>However, no method of online transmission is 100% secure.</p>
      </>
    ),
  },
  {
    title: "8. Your Rights",
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your data (subject to legal requirements)</li>
          <li>Opt out of promotional communications at any time</li>
        </ul>
        <p>To exercise these rights, contact us using the details below.</p>
      </>
    ),
  },
  {
    title: "9. Third-Party Links",
    body: (
      <>
        <p>Our website may contain links to third-party websites.</p>
        <p>We are not responsible for the privacy practices or content of those websites.</p>
      </>
    ),
  },
  {
    title: "10. Children's Privacy",
    body: (
      <>
        <p>Our services are not intended for individuals under the age of 13.</p>
        <p>We do not knowingly collect personal data from children.</p>
      </>
    ),
  },
  {
    title: "11. Changes to This Privacy Policy",
    body: (
      <>
        <p>We may update this Privacy Policy from time to time.</p>
        <p>Any changes will be posted on this page with an updated effective date.</p>
      </>
    ),
  },
  {
    title: "12. Contact Information",
    body: (
      <>
        <p>If you have any questions about this Privacy Policy, please contact us:</p>
        <ul>
          <li>
            <strong>Business Name:</strong> Zolvex
          </li>
          <li>
            <strong>Email:</strong> <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </li>
          <li>
            <strong>Phone:</strong> <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
          </li>
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a
              href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {CONTACT.whatsappDisplay}
            </a>
          </li>
          <li>
            <strong>Location:</strong> {CONTACT.location}
          </li>
        </ul>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="2 September 2026"
      intro={
        <p>
          This policy covers the Zolvex website and services. Questions about your data?
          Email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
