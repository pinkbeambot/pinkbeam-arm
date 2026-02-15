"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations";
import Link from "next/link";

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
    badge: "Best for trying out",
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
    popular: true,
    badge: "Most Popular",
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
    ],
    badge: "For teams 10+",
  },
];

interface PricingSectionProps {
  showCTA?: boolean;
}

export function PricingSection({ showCTA = true }: PricingSectionProps) {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Invest in growth, not overhead. Start small, scale as you grow.
            No hidden fees, no surprises.
          </p>
        </FadeIn>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <FadeIn key={plan.title} delay={index * 0.1}>
              <Card className={`h-full flex flex-col ${plan.popular ? 'border-primary shadow-lg relative' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold">{plan.title}</h3>
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
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.popular ? "default" : "outline"} 
                    className="w-full"
                    asChild
                  >
                    <Link href={plan.price === "Custom" ? "#contact" : "/portal"}>
                      {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>

        {showCTA && (
          <FadeIn delay={0.4} className="mt-12 text-center">
            <p className="text-muted-foreground">
              All plans include a 7-day free trial with full access to all features. No credit card required.
            </p>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
