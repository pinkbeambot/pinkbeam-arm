"use client";

import { FadeIn } from "@/components/animations";
import { motion } from "framer-motion";

const trustLogos = [
  { name: "Y Combinator", width: "w-24" },
  { name: "TechCrunch", width: "w-20" },
  { name: "Forbes", width: "w-16" },
  { name: "Product Hunt", width: "w-24" },
  { name: "AngelList", width: "w-20" },
  { name: "Wired", width: "w-16" },
];

export function TrustSignals() {
  return (
    <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider mb-8">
            Featured in leading publications
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {trustLogos.map((logo, index) => (
              <motion.div 
                key={logo.name}
                className={`${logo.width} opacity-40 hover:opacity-80 transition-all duration-300 cursor-default`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 0.4, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ opacity: 0.8, scale: 1.05 }}
              >
                <span className="font-semibold text-muted-foreground text-sm md:text-base whitespace-nowrap">
                  {logo.name}
                </span>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
