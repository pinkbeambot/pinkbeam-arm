"use client";

import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeIn } from "@/components/animations";

const faqItems = [
  {
    question: "How is this different from other AI tools?",
    answer: "Most AI tools are interfaces—you still have to prompt them, wait for output, and integrate the results. Pink Beam employees are autonomous. You configure them once, and they work independently: monitoring, researching, creating, and responding without constant input. Think employee, not tool.",
  },
  {
    question: "How do I configure an employee?",
    answer: "Setup takes about 5 minutes. You connect your existing tools (CRM, help desk, social accounts), define your brand voice and priorities, and set any guardrails. Your employee starts working immediately and learns from your feedback over time.",
  },
  {
    question: "What integrations do you support?",
    answer: "We integrate with 100+ tools including Salesforce, HubSpot, Zendesk, Intercom, Slack, Notion, Google Workspace, LinkedIn, Twitter, Meta Ads, and more. New integrations ship weekly. If we don't support something you need, we'll build it.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We're SOC 2 Type II certified, use AES-256 encryption, and operate under a strict zero data retention policy—your proprietary information is never used to train our models. We sign NDAs with enterprise customers and can deploy in isolated environments if needed.",
  },
  {
    question: "Can I customize the employee's voice and approach?",
    answer: "Absolutely. During setup, you define tone (professional, casual, technical), communication style, and brand guidelines. You can update these anytime, and your employee adapts. Many customers train different employees for different contexts—one for enterprise prospects, another for startup founders.",
  },
  {
    question: "What happens if something goes wrong?",
    answer: "Every employee has human-in-the-loop checkpoints for critical actions. They escalate uncertain situations with full context. Plus, you get complete visibility into everything they do—every email sent, every ticket handled, every report generated. You're always in control.",
  },
  {
    question: "How much does it cost?",
    answer: "Individual employees start at $397/month. Full teams start at $997/month. Scale your capabilities without traditional hiring constraints. Annual plans include two months free.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Monthly plans can be canceled anytime with 7 days notice. Annual plans can be downgraded to monthly at renewal. No long-term contracts, no hidden fees. We win by delivering value, not locking you in.",
  },
  {
    question: "How many employees can I hire?",
    answer: "As many as you need. Start with one. Scale to twenty. Most customers begin with their biggest pain point—usually research or sales—and expand from there once they see the ROI.",
  },
  {
    question: "Can I talk to someone before signing up?",
    answer: "Of course. Book a demo and we'll show you exactly how AI employees work for your specific use case. No sales pressure—just a walkthrough and honest answers to your questions.",
  },
];

export function FAQ() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Everything you need to know about hiring AI employees.
          </p>
        </FadeIn>

        {/* FAQ Accordion */}
        <FadeIn delay={0.1}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>

        {/* Contact CTA */}
        <FadeIn delay={0.2} className="mt-12 text-center">
          <p className="text-muted-foreground">
            Still have questions?{" "}
            <a href="#" className="text-primary hover:text-primary/80 font-medium">
              Book a demo
            </a>{" "}
            and we&apos;ll answer everything.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
