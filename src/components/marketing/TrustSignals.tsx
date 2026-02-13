"use client";

import { FadeIn } from "@/components/animations";

const trustLogos = [
  { name: "Y Combinator", width: "w-24" },
  { name: "TechCrunch", width: "w-20" },
  { name: "Forbes", width: "w-16" },
  { name: "Product Hunt", width: "w-24" },
  { name: "AngelList", width: "w-20" },
];

export function TrustSignals() {
  return (
    <section className="py-12 bg-muted/30 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-6">
            Featured in
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {trustLogos.map((logo) => (
              <div 
                key={logo.name}
                className={`${logo.width} opacity-40 hover:opacity-70 transition-opacity`}
              >
                <span className="font-semibold text-muted-foreground text-sm">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
