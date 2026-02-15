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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Main Content */}
      <main>
        <div className="bg-[#0A0A0F] pt-16">
          <Hero />
        </div>
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
      </main>

      <MarketingFooter />
    </div>
  );
}
