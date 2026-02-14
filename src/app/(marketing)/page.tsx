import type { Metadata } from "next";
import {
  Hero,
  ProblemSection,
  SolutionSection,
  EmployeeTabs,
  HowItWorks,
  UseCases,
  TrustSignals,
  Testimonials,
  PricingSection,
  FAQ,
  FinalCTA,
  MarketingNav,
  MarketingFooter,
} from "@/components/marketing";

export const metadata: Metadata = {
  title: "Pink Beam ARM | AI Employees for Your Business",
  description: "Run a 50-person company as a 1-person founder. Hire AI employees for research, sales, support, and creative work. One platform. One price. Infinite output.",
  keywords: ["AI employees", "autonomous agents", "AI workforce", "agent relationship management", "AI agents for business"],
  openGraph: {
    title: "Pink Beam ARM | AI Employees for Your Business",
    description: "Run a 50-person company as a 1-person founder. Hire AI employees for research, sales, support, and creative work.",
    images: ["/og-image.png"],
  },
};

// JSON-LD Structured Data
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Pink Beam ARM",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "500",
    "priceCurrency": "USD",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "127",
  },
  "description": "Run a 50-person company as a 1-person founder. Hire AI employees for research, sales, support, and creative work.",
  "url": "https://pinkbeam.io",
  "publisher": {
    "@type": "Organization",
    "name": "Pink Beam",
    "logo": {
      "@type": "ImageObject",
      "url": "https://pinkbeam.io/logo.png",
    },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <MarketingNav currentPath="/" />

      {/* Main Content */}
      <main>
        <div className="pt-0">
          <Hero />
          <TrustSignals />
          <ProblemSection />
          <SolutionSection />
          <EmployeeTabs />
          <HowItWorks />
          <UseCases />
          <Testimonials />
          <PricingSection />
          <div id="faq">
            <FAQ />
          </div>
          <FinalCTA />
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
