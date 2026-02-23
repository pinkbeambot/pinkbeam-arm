"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/animations";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,110,0.08),transparent_70%)] pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <FadeIn className="text-center max-w-4xl mx-auto">
          <motion.div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8" whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Start Your AI Workforce Today</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Build Your <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">AI Workforce?</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of founders who are scaling their businesses with AI employees. Start your free trial today—no credit card required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-muted-foreground">
            {["7-day free trial", "No credit card required", "Cancel anytime"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" variant="beam" className="w-full sm:w-auto text-base px-8 shadow-beam hover:shadow-glow-pink-md transition-shadow group" asChild>
              <Link href="/auth">Get Started Free<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" asChild>
              <Link href="/contact">Talk to Sales</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">Join 500+ founders already scaling with AI employees</p>
        </FadeIn>
      </div>
    </section>
  );
}
