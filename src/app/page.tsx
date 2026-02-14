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
        <div className="pt-16">
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
