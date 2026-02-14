import Link from "next/link";
import { Button } from "@/components/ui/button";
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
} from "@/components/marketing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-sm">PB</span>
              </div>
              <span className="font-bold text-xl">Pink Beam</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                AI Employees
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Button asChild size="sm">
                <Link href="/portal">Enter Portal</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

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

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                  <span className="text-white font-bold text-sm">PB</span>
                </div>
                <span className="font-bold text-xl">Pink Beam</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The command center for your AI workforce.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/agents" className="hover:text-foreground">AI Employees</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/portal" className="hover:text-foreground">Portal</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">About</Link></li>
                <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground">Terms</Link></li>
                <li><Link href="#" className="hover:text-foreground">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Pink Beam. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Powered by VALIS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
