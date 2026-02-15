"use client";

import { Settings, Clock, ClipboardCheck } from "lucide-react";
import { SlideUp } from "@/components/animations";
import { FadeIn } from "@/components/animations";

const steps = [
  {
    number: "01",
    icon: Settings,
    headline: "Hire in Minutes, Not Months",
    description: "Pick your employee type, connect your tools, and spend 5 minutes training them on your brand voice and priorities. Start working immediately—no lengthy recruitment process required.",
  },
  {
    number: "02",
    icon: Clock,
    headline: "They Start Immediately",
    description: "Your AI employee begins working the moment you finish setup. They monitor, research, reach out, respond, create, and optimize—around the clock. While you sleep, they're working.",
  },
  {
    number: "03",
    icon: ClipboardCheck,
    headline: "You Stay in Control",
    description: "Every Monday, get a weekly brief with what your employees accomplished. Review qualified leads, resolved tickets, published content, and completed projects. Adjust priorities anytime.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            From Signup to Employee in{" "}
            <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
              10 Minutes
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple setup. Powerful results. No technical expertise required.
          </p>
        </FadeIn>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <SlideUp key={step.number} delay={index * 0.15} className="relative">
                  <div className="text-center">
                    {/* Step Number and Icon */}
                    <div className="relative inline-flex items-center justify-center mb-6">
                      {/* Background Circle */}
                      <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center relative z-10">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                      {/* Step Number Badge */}
                      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-primary to-pink-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {step.number}
                        </span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-semibold mb-4">
                      {step.headline}
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {step.description}
                    </p>
                  </div>
                </SlideUp>
              );
            })}
          </div>
        </div>

        {/* Timeline visualization for mobile */}
        <div className="lg:hidden mt-12 relative">
          <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
