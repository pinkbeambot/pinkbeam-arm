import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, ArrowRight, HelpCircle, Sparkles, Building2, Rocket } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Pricing | Pink Beam ARM",
  description: "Hire AI employees for less than a single human salary. Simple, transparent pricing with no hidden fees. Start with a 7-day free trial.",
  keywords: ["AI employees pricing", "AI workforce cost", "autonomous agents pricing", "AI agent subscription"],
  openGraph: {
    title: "Pricing | Pink Beam ARM",
    description: "Hire AI employees for less than a single human salary. Simple, transparent pricing with no hidden fees.",
    images: ["/og-pricing.png"],
  },
};

const pricingPlans = [
<<<<<<< HEAD
  {
    title: "Starter",
    description: "Perfect for trying out AI employees",
    price: "$500",
    period: "/month",
    icon: Rocket,
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
    ctaLink: "/portal",
    popular: false,
  },
  {
    title: "Growth",
    description: "Most popular for growing teams",
    price: "$1,200",
    period: "/month",
    icon: Sparkles,
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
    ctaLink: "/portal",
  },
  {
    title: "Scale",
    description: "For teams with 10+ employees",
    price: "Custom",
    period: "",
    icon: Building2,
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
    ctaLink: "/contact",
    popular: false,
  },
];

const faqItems = [
  {
    question: "What's included in the free trial?",
    answer: "You get full access to all features of your chosen plan for 7 days. No credit card required. Set up your AI employees, connect your tools, and see the results before committing. You can hire any available AI employee and test their capabilities with real tasks.",
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely. You can upgrade, downgrade, or cancel your plan at any time. Changes take effect at the start of your next billing cycle. If you upgrade mid-cycle, we'll prorate the difference.",
  },
  {
    question: "How do I add more employees?",
    answer: "Growth plan includes 3 employees. Need more? Contact us for custom pricing. Scale plan offers unlimited employees with volume discounts. You can mix and match different AI employee types to build your perfect team.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, ACH transfers, and wire transfers for annual plans. Enterprise customers can also pay via invoice with net-30 terms.",
  },
  {
    question: "Is there a discount for annual billing?",
    answer: "Yes! Annual plans include 2 months free (17% discount). Contact us for enterprise annual pricing with additional savings for multi-year commitments.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data remains accessible for 30 days after cancellation. You can export everything before your account is fully closed. We also offer data portability to ensure you can take your AI employee configurations with you.",
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee for new customers. If you're not satisfied with Pink Beam ARM within your first month, contact us for a full refund—no questions asked.",
  },
  {
    question: "How does the AI employee hiring process work?",
    answer: "Once you sign up, you can browse our roster of AI employees, each with specific skills and capabilities. Select the ones that fit your needs, configure their access to your tools, and they'll start working immediately. Most founders are up and running within 15 minutes.",
  },
=======
  { title: "Starter", description: "Perfect for trying out AI employees", price: "$500", period: "/month", icon: Rocket, items: ["Choose any 1 employee", "Standard support (24h response)", "Email delivery", "Basic analytics dashboard", "7-day data retention"], notIncluded: ["Slack integration", "API access", "Priority support"], badge: "Best for trying out", cta: "Start Free Trial", ctaLink: "/portal", popular: false },
  { title: "Growth", description: "Most popular for growing teams", price: "$1,200", period: "/month", icon: Sparkles, items: ["Mix and match any 3 employees", "Priority support (4h response)", "Slack + Email delivery", "Advanced analytics & reports", "API access", "30-day data retention"], notIncluded: ["Dedicated account manager", "Custom integrations"], popular: true, badge: "Most Popular", cta: "Start Free Trial", ctaLink: "/portal" },
  { title: "Scale", description: "For teams with 10+ employees", price: "Custom", period: "", icon: Building2, items: ["Unlimited AI employees", "Dedicated account manager", "Custom integrations", "99.9% uptime SLA", "On-premise deployment", "Custom AI training", "Unlimited data retention"], badge: "For teams 10+", cta: "Contact Sales", ctaLink: "/contact", popular: false },
];

const faqItems = [
  { question: "What's included in the free trial?", answer: "You get full access to all features of your chosen plan for 7 days. No credit card required. Set up your AI employees, connect your tools, and see the results before committing." },
  { question: "Can I change plans later?", answer: "Absolutely. You can upgrade, downgrade, or cancel your plan at any time. Changes take effect at the start of your next billing cycle." },
  { question: "How do I add more employees?", answer: "Growth plan includes 3 employees. Need more? Contact us for custom pricing. Scale plan offers unlimited employees." },
  { question: "What payment methods do you accept?", answer: "We accept all major credit cards, ACH transfers, and wire transfers for annual plans. Enterprise customers can also pay via invoice." },
  { question: "Is there a discount for annual billing?", answer: "Yes! Annual plans include 2 months free (17% discount). Contact us for enterprise annual pricing." },
  { question: "What happens to my data if I cancel?", answer: "Your data remains accessible for 30 days after cancellation. You can export everything before your account is fully closed." },
>>>>>>> eng-ai/llm-improvements
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
<<<<<<< HEAD
      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Simple, Transparent{" "}
              <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Scale your capabilities without traditional hiring constraints. Start small,
              scale as you grow. No hidden fees, no surprises.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">7-day free trial</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">No credit card required</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Cancel anytime</span>
              </div>
=======
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Simple, Transparent <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">Pricing</span></h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">Scale your capabilities without traditional hiring constraints. Start small, scale as you grow. No hidden fees, no surprises.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"><Check className="w-4 h-4 text-primary" /><span className="text-sm font-medium">7-day free trial</span></div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border"><Check className="w-4 h-4 text-green-500" /><span className="text-sm font-medium">No credit card required</span></div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border"><Check className="w-4 h-4 text-green-500" /><span className="text-sm font-medium">Cancel anytime</span></div>
>>>>>>> eng-ai/llm-improvements
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {pricingPlans.map((plan) => {
              const Icon = plan.icon;
              return (
<<<<<<< HEAD
                <Card 
                  key={plan.title} 
                  className={`h-full flex flex-col relative transition-all duration-300 hover:shadow-xl ${
                    plan.popular 
                      ? 'border-primary shadow-lg md:scale-105 md:-my-4 z-10' 
                      : 'hover:border-primary/30'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{plan.title}</h2>
                        {!plan.popular && plan.badge && (
                          <span className="text-xs text-muted-foreground">{plan.badge}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  
=======
                <Card key={plan.title} className={`h-full flex flex-col relative transition-all duration-300 hover:shadow-xl ${plan.popular ? 'border-primary shadow-lg md:scale-105 md:-my-4 z-10' : 'hover:border-primary/30'}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">{plan.badge}</span>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><Icon className="w-5 h-5" /></div>
                      <div>
                        <h2 className="text-2xl font-bold">{plan.title}</h2>
                        {!plan.popular && plan.badge && <span className="text-xs text-muted-foreground">{plan.badge}</span>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-4"><span className="text-4xl font-bold">{plan.price}</span><span className="text-muted-foreground">{plan.period}</span></div>
                  </CardHeader>
>>>>>>> eng-ai/llm-improvements
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold mb-3">What's included:</h4>
                      <ul className="space-y-3 mb-6">
                        {plan.items.map((item) => (
                          <li key={item} className="flex items-start gap-3">
<<<<<<< HEAD
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
=======
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-primary" /></div>
>>>>>>> eng-ai/llm-improvements
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
<<<<<<< HEAD
                      
=======
>>>>>>> eng-ai/llm-improvements
                      {plan.notIncluded && plan.notIncluded.length > 0 && (
                        <>
                          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Not included:</h4>
                          <ul className="space-y-2 mb-6">
                            {plan.notIncluded.map((item) => (
                              <li key={item} className="flex items-start gap-3 text-muted-foreground">
<<<<<<< HEAD
                                <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-muted-foreground">—</span>
                                </div>
=======
                                <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5"><span className="text-muted-foreground">—</span></div>
>>>>>>> eng-ai/llm-improvements
                                <span className="text-sm">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
<<<<<<< HEAD
                    
                    <Button 
                      variant={plan.popular ? "default" : "outline"} 
                      size="lg"
                      className="w-full mt-6 group"
                      asChild
                    >
                      <Link href={plan.ctaLink}>
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
=======
                    <Button variant={plan.popular ? "default" : "outline"} size="lg" className="w-full mt-6 group" asChild>
                      <Link href={plan.ctaLink}>{plan.cta}<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></Link>
>>>>>>> eng-ai/llm-improvements
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
<<<<<<< HEAD
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Got questions? We've got answers.
            </p>
=======
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4"><HelpCircle className="w-6 h-6 text-primary" /></div>
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Got questions? We've got answers.</p>
>>>>>>> eng-ai/llm-improvements
          </FadeIn>
          <FadeIn delay={0.1}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
<<<<<<< HEAD
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 data-[state=open]:shadow-md transition-all duration-200"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-5 text-base">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
=======
                <AccordionItem key={index} value={`item-${index}`} className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 data-[state=open]:shadow-md transition-all duration-200">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-5 text-base">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">{item.answer}</AccordionContent>
>>>>>>> eng-ai/llm-improvements
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
<<<<<<< HEAD
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Still Have Questions?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Book a demo and we'll walk you through the platform, answer your questions, 
              and help you choose the right plan.
            </p>
=======
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">Book a demo and we'll walk you through the platform, answer your questions, and help you choose the right plan.</p>
>>>>>>> eng-ai/llm-improvements
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild><Link href="/contact">Book a Demo</Link></Button>
              <Button size="lg" variant="outline" asChild><Link href="/agents">View AI Employees</Link></Button>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
