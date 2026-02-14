import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, ArrowRight, HelpCircle } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Pink Beam ARM",
  description: "Hire AI employees for less than a single human salary. Simple, transparent pricing with no hidden fees.",
};

const pricingPlans = [
  {
    title: "Starter",
    description: "Perfect for trying out AI employees",
    price: "$500",
    period: "/month",
    items: [
      "Choose any 1 employee",
      "Standard support (24h response)",
      "Email delivery",
      "Basic analytics dashboard",
      "7-day data retention",
    ],
    notIncluded: [
      "Slack integration",
      "API access",
      "Priority support",
    ],
    badge: "Best for trying out",
    cta: "Start Free Trial",
  },
  {
    title: "Growth",
    description: "Most popular for growing teams",
    price: "$1,200",
    period: "/month",
    items: [
      "Mix and match any 3 employees",
      "Priority support (4h response)",
      "Slack + Email delivery",
      "Advanced analytics & reports",
      "API access",
      "30-day data retention",
    ],
    notIncluded: [
      "Dedicated account manager",
      "Custom integrations",
    ],
    popular: true,
    badge: "Most Popular",
    cta: "Start Free Trial",
  },
  {
    title: "Scale",
    description: "For teams with 10+ employees",
    price: "Custom",
    period: "",
    items: [
      "Unlimited AI employees",
      "Dedicated account manager",
      "Custom integrations",
      "99.9% uptime SLA",
      "On-premise deployment",
      "Custom AI training",
      "Unlimited data retention",
    ],
    badge: "For teams 10+",
    cta: "Contact Sales",
  },
];

const faqItems = [
  {
    question: "What's included in the free trial?",
    answer: "You get full access to all features of your chosen plan for 7 days. No credit card required. Set up your AI employees, connect your tools, and see the results before committing.",
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely. You can upgrade, downgrade, or cancel your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "How do I add more employees?",
    answer: "Growth plan includes 3 employees. Need more? Contact us for custom pricing. Scale plan offers unlimited employees.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, ACH transfers, and wire transfers for annual plans. Enterprise customers can also pay via invoice.",
  },
  {
    question: "Is there a discount for annual billing?",
    answer: "Yes! Annual plans include 2 months free (17% discount). Contact us for enterprise annual pricing.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data remains accessible for 30 days after cancellation. You can export everything before your account is fully closed.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-sm">PB</span>
              </div>
              <span className="font-bold text-xl">Pink Beam</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                AI Employees
              </Link>
              <Link href="/pricing" className="text-sm text-foreground font-medium">
                Pricing
              </Link>
            </nav>
            <Button asChild size="sm">
              <Link href="/portal">Enter Portal</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Simple, Transparent{" "}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Hire AI employees for less than a single human salary. Start small, 
              scale as you grow. No hidden fees, no surprises.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">7-day free trial on all plans</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <Card 
                key={plan.title} 
                className={`h-full flex flex-col ${plan.popular ? 'border-primary shadow-lg relative md:scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold">{plan.title}</h2>
                    {!plan.popular && plan.badge && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-3">What&apos;s included:</h4>
                    <ul className="space-y-3 mb-6">
                      {plan.items.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {plan.notIncluded && plan.notIncluded.length > 0 && (
                      <>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Not included:</h4>
                        <ul className="space-y-2 mb-6">
                          {plan.notIncluded.map((item) => (
                            <li key={item} className="flex items-start gap-3 text-muted-foreground">
                              <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-muted-foreground">—</span>
                              </div>
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  
                  <Button 
                    variant={plan.popular ? "default" : "outline"} 
                    size="lg"
                    className="w-full mt-6"
                    asChild
                  >
                    <Link href={plan.price === "Custom" ? "#contact" : "/portal"}>
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </StaggerContainer>

          {/* Comparison Note */}
          <FadeIn delay={0.4} className="mt-12 text-center">
            <p className="text-muted-foreground">
              Compare to hiring a human: $6,000-12,000/month + benefits + onboarding + management overhead
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Pricing FAQ</h2>
            <p className="text-muted-foreground">
              Got questions? We&apos;ve got answers.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Still Have Questions?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Book a demo and we&apos;ll walk you through the platform, answer your questions, 
              and help you choose the right plan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="#contact">Book a Demo</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/agents">View AI Employees</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-xs">PB</span>
              </div>
              <span className="font-semibold text-sm">Pink Beam</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Pink Beam. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
