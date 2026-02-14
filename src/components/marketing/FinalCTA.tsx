"use client";

import { useState } from "react";
import { ArrowRight, CreditCard, Calendar, CheckCircle, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn, FadeInOnMount } from "@/components/animations";
import { cn } from "@/lib/utils";
import Link from "next/link";

const trustBadges = [
  { icon: CreditCard, text: "No credit card required" },
  { icon: Calendar, text: "7-day free trial" },
  { icon: CheckCircle, text: "Cancel anytime" },
];

export function FinalCTA() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email");
      return;
    }
    
    setEmailError(null);
    setIsSubmitted(true);
    // In a real app, you'd handle the signup here
  };

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-muted/30 via-background to-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Headline */}
          <FadeInOnMount>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
              Start Your{" "}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                AI Workforce
              </span>
            </h2>
          </FadeInOnMount>

          {/* Supporting Text */}
          <FadeInOnMount delay={0.1}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Join 100+ companies already scaling with AI employees. Start your 
              free trial today—no credit card required, no setup fees, cancel anytime.
            </p>
          </FadeInOnMount>

          {/* Email Capture Form or CTA Button */}
          <FadeInOnMount delay={0.2}>
            <div className="max-w-md mx-auto mb-8">
              <Button 
                size="lg" 
                variant="beam"
                className="w-full h-12 shadow-lg"
                asChild
              >
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </FadeInOnMount>

          {/* Trust Badges */}
          <FadeInOnMount delay={0.3}>
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div key={badge.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="w-4 h-4 text-primary" />
                    <span>{badge.text}</span>
                  </div>
                );
              })}
            </div>
          </FadeInOnMount>

          {/* Testimonial Quote */}
          <FadeInOnMount delay={0.4}>
            <div className="max-w-lg mx-auto pt-8 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Quote className="w-4 h-4 text-primary" />
              </div>
              <blockquote className="text-muted-foreground italic mb-3">
                "I've already hired Sarah and Mike. Best decision I made this year."
              </blockquote>
              <cite className="text-sm text-muted-foreground not-italic">
                — David Chen, CEO at Nexus AI
              </cite>
            </div>
          </FadeInOnMount>
        </div>
      </div>
    </section>
  );
}
