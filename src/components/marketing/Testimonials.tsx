"use client";

/* eslint-disable react/no-unescaped-entities */
import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer, FadeIn } from "@/components/animations";
import { Quote, Star } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  { quote: "I went from spending 4 hours a day on sales outreach to 15 minutes reviewing what Mike booked. My pipeline has never been healthier.", author: "Sarah Chen", role: "Founder, CloudMetrics", avatar: "SC", rating: 5 },
  { quote: "Sarah (the researcher) found a competitor pivot before anyone else in our industry knew. That intelligence alone paid for a year of Pink Beam.", author: "Marcus Johnson", role: "CEO, DataFlow", avatar: "MJ", rating: 5 },
  { quote: "We were drowning in support tickets. Alex handles 80% automatically and escalates the complex stuff with full context. Game changer.", author: "Elena Rodriguez", role: "Head of Customer Success, SaaSify", avatar: "ER", rating: 5 },
  { quote: "Casey publishes more content in a week than our previous agency did in a month. And it actually sounds like us.", author: "David Park", role: "Marketing Director, GrowthLabs", avatar: "DP", rating: 5 },
  { quote: "I was skeptical about 'AI employees' but the ROI is undeniable. Best hire I never made.", author: "Jennifer Walsh", role: "Solo Founder, LegalTech AI", avatar: "JW", rating: 5 },
  { quote: "The escalation system is brilliant. My agents know exactly when to ask for help, and I get full context to make decisions quickly.", author: "Alex Thompson", role: "CTO, BuildRight", avatar: "AT", rating: 5 },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"}`} />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,110,0.03),transparent_70%)] pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <FadeIn className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="text-sm font-medium text-primary">Testimonials</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Loved by <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">Founders</span> Like You
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">See what early adopters are saying about their AI workforce.</p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div key={testimonial.author} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.5 }} viewport={{ once: true }}>
              <Card className="h-full hover:border-primary/30 transition-all duration-300 hover:shadow-lg group">
                <CardContent className="pt-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <Quote className="w-8 h-8 text-primary/20 group-hover:text-primary/40 transition-colors" />
                    <StarRating rating={testimonial.rating} />
                  </div>
                  <p className="text-muted-foreground flex-1 mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center border border-primary/10">
                      <span className="text-sm font-bold text-primary">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </StaggerContainer>

        <FadeIn delay={0.4} className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted border border-border">
            <div className="flex -space-x-2">
              {testimonials.slice(0, 4).map((t) => (
                <div key={t.author} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-pink-500/30 border-2 border-background flex items-center justify-center text-xs font-bold text-primary">
                  {t.avatar}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">Join <span className="font-semibold text-foreground">500+ founders</span> scaling with AI</span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
