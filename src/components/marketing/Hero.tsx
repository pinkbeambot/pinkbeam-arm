"use client";

/* eslint-disable react/no-unescaped-entities */
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn, FadeInOnMount } from "@/components/animations";
import Link from "next/link";

// Logo placeholder component
function LogoPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-2 opacity-50 hover:opacity-80 transition-opacity">
      <span className="font-semibold text-sm text-gray-400 tracking-wider">
        {name}
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F] to-[#111118]">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,110,0.15),transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,110,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,110,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <FadeInOnMount delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-8">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                <span className="text-sm font-medium text-pink-500">
                  Now Hiring AI Employees
                </span>
              </div>
            </FadeInOnMount>

            {/* Main Headline */}
            <FadeInOnMount delay={0.1}>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white tracking-tight">
                Run a{" "}
                <span className="bg-gradient-to-r from-pink-500 to-pink-300 bg-clip-text text-transparent">
                  50-person company
                </span>
                <br className="hidden md:block" />
                <span className="text-white"> as a 1-person founder</span>
              </h1>
            </FadeInOnMount>

            {/* Subheadline */}
            <FadeInOnMount delay={0.15}>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                Build a workforce that scales with your ambition. AI employees handle the details while you focus on the big picture.
              </p>
            </FadeInOnMount>

            {/* VALIS Quote */}
            <FadeInOnMount delay={0.2}>
              <div className="mx-auto max-w-2xl mb-10 p-6 rounded-xl border border-pink-500/30 bg-pink-500/5">
                <p className="text-lg text-pink-400 italic mb-3">
                  &ldquo;The future of work isn&apos;t humans vs. AI. It&apos;s humans with AI.&rdquo;
                </p>
                <p className="text-sm text-gray-500">
                  — VALIS
                </p>
              </div>
            </FadeInOnMount>

            {/* CTA Buttons */}
            <FadeInOnMount delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Button size="lg" variant="beam" className="w-full sm:w-auto shadow-beam" asChild>
                  <Link href="/auth">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" className="w-full sm:w-auto border border-gray-600 bg-transparent text-white hover:bg-white/10" asChild>
                  <Link href="/agents">
                    Explore AI Employees
                  </Link>
                </Button>
              </div>
            </FadeInOnMount>

            {/* Social Proof */}
            <FadeInOnMount delay={0.4}>
              <div className="space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
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
      {/* Scroll Indicator — at the bottom of the hero, right at the fold */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500">
        <span className="text-xs uppercase tracking-wider">Scroll</span>
        <ChevronDown className="w-5 h-5 text-pink-500 animate-bounce" />
      </div>
    </section>
  );
}
