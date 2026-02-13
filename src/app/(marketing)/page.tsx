import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
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

// Mobile navigation component
function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col gap-4 mt-8">
          <Link href="/agents" className="text-lg font-medium hover:text-primary transition-colors">
            AI Employees
          </Link>
          <Link href="/pricing" className="text-lg font-medium hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link href="#faq" className="text-lg font-medium hover:text-primary transition-colors">
            FAQ
          </Link>
          <hr className="my-4" />
          <Link href="/portal" className="text-lg font-medium hover:text-primary transition-colors">
            Portal
          </Link>
          <Button asChild className="w-full">
            <Link href="/portal">Enter Portal</Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header - Transparent to solid on scroll */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent hover:bg-background/80 hover:backdrop-blur-md hover:border-b hover:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-sm">PB</span>
              </div>
              <span className="font-bold text-xl">Pink Beam</span>
            </Link>

            {/* Desktop Navigation */}
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

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link href="/portal" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
                Portal
              </Link>
              <Button asChild size="sm" className="hidden sm:flex">
                <Link href="/portal">Enter Portal</Link>
              </Button>
              <MobileNav />
            </div>
          </div>
        </div>
      </header>

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

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                  <span className="text-white font-bold text-sm">PB</span>
                </div>
                <span className="font-bold text-xl">Pink Beam</span>
              </Link>
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
