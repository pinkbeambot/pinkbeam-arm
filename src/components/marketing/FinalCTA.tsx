"use client";

import { useState } from "react";
import { ArrowRight, CreditCard, Calendar, CheckCircle, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn, FadeInOnMount } from "@/components/animations";
import { cn } from "@/lib/utils";

const trustBadges = [
  { icon: CreditCard, text: "No credit card required" },
  { icon: Calendar, text: "14-day free trial" },
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
              Your AI Workforce Is{" "}
              <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                Waiting
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

          {/* Email Capture Form */}
          <FadeInOnMount delay={0.2}>
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    required
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? "final-cta-email-error" : undefined}
                    className={cn(
                      "h-12 bg-card border-border",
                      emailError && "border-destructive focus-visible:ring-destructive/30"
                    )}
                  />
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="h-12 shadow-lg whitespace-nowrap"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                {emailError && (
                  <p id="final-cta-email-error" className="text-xs text-destructive mt-2 text-left">
                    {emailError}
                  </p>
                )}
              </form>
            ) : (
              <div className="max-w-md mx-auto mb-8 p-6 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  Thanks! Check your inbox to get started.
                </p>
              </div>
            )}
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
