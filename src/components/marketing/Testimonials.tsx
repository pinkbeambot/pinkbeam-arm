"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer, FadeIn } from "@/components/animations";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "I went from spending 4 hours a day on sales outreach to 15 minutes reviewing what Mike booked. My pipeline has never been healthier.",
    author: "Sarah Chen",
    role: "Founder, CloudMetrics",
    avatar: "SC",
  },
  {
    quote: "Sarah (the researcher) found a competitor pivot before anyone else in our industry knew. That intelligence alone paid for a year of Pink Beam.",
    author: "Marcus Johnson",
    role: "CEO, DataFlow",
    avatar: "MJ",
  },
  {
    quote: "We were drowning in support tickets. Alex handles 80% automatically and escalates the complex stuff with full context. Game changer.",
    author: "Elena Rodriguez",
    role: "Head of Customer Success, SaaSify",
    avatar: "ER",
  },
  {
    quote: "Casey publishes more content in a week than our previous agency did in a month. And it actually sounds like us.",
    author: "David Park",
    role: "Marketing Director, GrowthLabs",
    avatar: "DP",
  },
  {
    quote: "I was skeptical about 'AI employees' but the ROI is undeniable. Best hire I never made.",
    author: "Jennifer Walsh",
    role: "Solo Founder, LegalTech AI",
    avatar: "JW",
  },
  {
    quote: "The escalation system is brilliant. My agents know exactly when to ask for help, and I get full context to make decisions quickly.",
    author: "Alex Thompson",
    role: "CTO, BuildRight",
    avatar: "AT",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Loved by{" "}
            <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
              Founders
            </span>
            {" "}Like You
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            See what early adopters are saying about their AI workforce.
          </p>
        </FadeIn>

        {/* Testimonials Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="h-full">
              <CardContent className="pt-6 flex flex-col h-full">
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-muted-foreground flex-1 mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {testimonial.avatar}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
