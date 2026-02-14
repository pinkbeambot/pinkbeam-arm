import type { Metadata } from "next";
import { ContactPageClient } from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us | Pink Beam ARM",
  description: "Get in touch with the Pink Beam team. Book a demo, ask questions, or learn more about AI employees for your business.",
  keywords: ["contact", "demo", "sales", "support", "AI employees"],
  openGraph: {
    title: "Contact Us | Pink Beam ARM",
    description: "Get in touch with the Pink Beam team. Book a demo or ask questions about AI employees.",
    images: ["/og-contact.png"],
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
