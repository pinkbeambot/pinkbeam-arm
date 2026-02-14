"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer, FadeIn } from "@/components/animations";
import { Building2, ShoppingBag, Code, Briefcase } from "lucide-react";

const useCases = [
  {
    icon: Building2,
    title: "SaaS Companies",
    description: "Scale customer success without scaling headcount. Let AI handle onboarding, support, and expansion while your team focuses on enterprise deals.",
    stat: "10x",
    statLabel: "more customers per CSM",
  },
  {
    icon: ShoppingBag,
    title: "E-commerce Brands",
    description: "Never miss a customer question again. AI support that knows your products, policies, and can handle refunds and exchanges autonomously.",
    stat: "24/7",
    statLabel: "response time",
  },
  {
    icon: Code,
    title: "Agencies & Consultancies",
    description: "Deliver more client work with the same team. AI researchers and writers help you scale output without sacrificing quality.",
    stat: "3x",
    statLabel: "more deliverables",
  },
  {
    icon: Briefcase,
    title: "Professional Services",
    description: "From intake to invoice, automate the repetitive parts of your practice. Research, draft documents, and manage client communication.",
    stat: "15 hrs",
    statLabel: "saved per week",
  },
];

export function UseCases() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Built for{" "}
            <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
              Every Business
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you're a solo founder or a growing team, AI employees adapt to your needs.
          </p>
        </FadeIn>

        {/* Use Cases Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <Card key={useCase.title} className="group hover:border-primary/30 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                      <p className="text-muted-foreground mb-4">{useCase.description}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">{useCase.stat}</span>
                        <span className="text-sm text-muted-foreground">{useCase.statLabel}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
