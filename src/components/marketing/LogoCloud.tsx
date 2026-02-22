"use client";

import { FadeIn } from "@/components/animations";
import { motion } from "framer-motion";

const companyLogos = [
  { name: "Y Combinator", display: "Y Combinator" },
  { name: "TechCrunch", display: "TechCrunch" },
  { name: "Forbes", display: "Forbes" },
  { name: "ProductHunt", display: "Product Hunt" },
  { name: "AngelList", display: "AngelList" },
  { name: "Sequoia", display: "Sequoia" },
  { name: "Accel", display: "Accel" },
  { name: "A16z", display: "a16z" },
];

export function LogoCloud() {
  return (
    <section className="py-16 md:py-24 bg-muted/20 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-12">
          <p className="text-sm md:text-base text-muted-foreground uppercase tracking-wider">
            Trusted by founders backed by
          </p>
        </FadeIn>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center">
          {companyLogos.map((logo, index) => (
            <motion.div
              key={logo.name}
              className="flex items-center justify-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
            >
              <span className="text-lg md:text-xl font-bold text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-300 whitespace-nowrap">
                {logo.display}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
