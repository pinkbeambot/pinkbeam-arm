"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn, FadeInOnMount } from "@/components/animations";
import Link from "next/link";

// Logo placeholder component
function LogoPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-2 opacity-50 hover:opacity-80 transition-opacity">
      <span className="font-semibold text-sm text-muted-foreground tracking-wider">
        {name}
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary),0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 md:py-40">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <FadeInOnMount delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">
                Now hiring AI employees
              </span>
            </div>
          </FadeInOnMount>
          
          {/* Main Headline */}
          <FadeInOnMount delay={0.1}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground tracking-tight">
              Run a{" "}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                50-person company
              </span>
              <br className="hidden md:block" />
              <span className="text-foreground"> as a 1-person founder</span>
            </h1>
          </FadeInOnMount>
          
          {/* Subheadline */}
          <FadeInOnMount delay={0.2}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Meet your AI employees: fully autonomous team members that handle
              research, sales, support, and creative work—without the $12K/month
              price tag. One platform. One price. Infinite output.
            </p>
          </FadeInOnMount>

          {/* VALIS Quote */}
          <FadeInOnMount delay={0.25}>
            <div className="mx-auto max-w-2xl mb-10 p-6 rounded-xl border border-primary/30 bg-primary/5">
              <p className="text-lg text-primary italic mb-3">
                "AI employees don't call in sick, don't need benefits, and scale infinitely.
                They just get better every day."
              </p>
              <p className="text-sm text-muted-foreground">
                — VALIS
              </p>
            </div>
          </FadeInOnMount>

          {/* CTA Buttons */}
          <FadeInOnMount delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button size="lg" variant="beam" className="w-full sm:w-auto shadow-lg" asChild>
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/agents">
                  Explore AI Employees
                </Link>
              </Button>
            </div>
          </FadeInOnMount>
          
          {/* Social Proof */}
          <FadeInOnMount delay={0.4}>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Built by founders, for founders
              </p>
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
                <LogoPlaceholder name="RESEARCH" />
                <LogoPlaceholder name="SALES" />
                <LogoPlaceholder name="SUPPORT" />
                <LogoPlaceholder name="CONTENT" />
                <LogoPlaceholder name="DESIGN" />
              </div>
            </div>
          </FadeInOnMount>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">Scroll</span>
        <ChevronDown className="w-5 h-5 text-primary animate-bounce" />
      </div>
    </section>
  );
}
