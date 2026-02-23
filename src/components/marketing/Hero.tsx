"use client";

import { ArrowRight, ChevronDown, Play, Users, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn, FadeInOnMount } from "@/components/animations";
import Link from "next/link";
import { motion } from "framer-motion";

const companyLogos = [
  { name: "YC", display: "Y Combinator" },
  { name: "TechCrunch", display: "TechCrunch" },
  { name: "Forbes", display: "Forbes" },
  { name: "ProductHunt", display: "Product Hunt" },
  { name: "AngelList", display: "AngelList" },
  { name: "Sequoia", display: "Sequoia" },
];

const stats = [
  { value: "500+", label: "AI Employees Hired" },
  { value: "10k+", label: "Tasks Completed" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9/5", label: "Founder Rating" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F] to-[#111118]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,110,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,110,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,110,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <motion.div className="absolute top-1/4 left-[10%] hidden lg:block" animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center backdrop-blur-sm">
          <Users className="w-8 h-8 text-pink-400" />
        </div>
      </motion.div>

      <motion.div className="absolute top-1/3 right-[12%] hidden lg:block" animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center backdrop-blur-sm">
          <Zap className="w-7 h-7 text-cyan-400" />
        </div>
      </motion.div>

      <motion.div className="absolute bottom-1/3 left-[15%] hidden lg:block" animate={{ y: [0, 8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center backdrop-blur-sm">
          <Shield className="w-6 h-6 text-violet-400" />
        </div>
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-5xl mx-auto">
          <FadeInOnMount delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="text-sm font-medium text-pink-400">Limited: First 100 founders get 50% off first month</span>
            </div>
          </FadeInOnMount>

          <FadeInOnMount delay={0.1}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white tracking-tight leading-tight">
              Run a <span className="bg-gradient-to-r from-pink-500 to-pink-300 bg-clip-text text-transparent">50-person company</span>
              <br className="hidden md:block" />
              <span className="text-white"> as a 1-person founder</span>
            </h1>
          </FadeInOnMount>

          <FadeInOnMount delay={0.15}>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6">
              Hire AI employees that work 24/7. No salaries, no benefits, no burnout. Just results.
            </p>
          </FadeInOnMount>

          <FadeInOnMount delay={0.2}>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm text-gray-500">
              {["7-day free trial", "No credit card required", "Cancel anytime"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </FadeInOnMount>

          <FadeInOnMount delay={0.25}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button size="lg" variant="beam" className="w-full sm:w-auto text-base px-8 py-6 shadow-beam hover:shadow-glow-pink-md transition-shadow group" asChild>
                <Link href="/auth">Start Free Trial<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></Link>
              </Button>
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 border border-gray-600 bg-transparent text-white hover:bg-white/10" asChild>
                <Link href="/agents"><Play className="w-5 h-5 mr-2" />See AI Employees</Link>
              </Button>
            </div>
          </FadeInOnMount>

          <FadeInOnMount delay={0.3}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs md:text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeInOnMount>

          <FadeInOnMount delay={0.35}>
            <div className="space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Trusted by founders backed by</p>
              <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                {companyLogos.map((logo) => (
                  <div key={logo.name} className="opacity-40 hover:opacity-70 transition-opacity duration-300">
                    <span className="font-semibold text-gray-400 text-sm md:text-base tracking-wide">{logo.display}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInOnMount>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500">
        <span className="text-xs uppercase tracking-wider">Scroll</span>
        <ChevronDown className="w-5 h-5 text-pink-500 animate-bounce" />
      </div>
    </section>
  );
}
