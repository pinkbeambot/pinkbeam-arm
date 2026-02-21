"use client";

/* eslint-disable react/no-unescaped-entities */
import { Search, Users, Headphones, PenTool, Palette, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer, FadeIn } from "@/components/animations";

const employees = [
  {
    name: "Sarah",
    role: "Market Intelligence Analyst",
    description: "Monitors competitors, tracks industry trends, and delivers weekly briefs with actionable insights. She reads your industry's top sources so you don't have to.",
    icon: Search,
    color: "bg-pink-500",
  },
  {
    name: "Mike",
    role: "Sales Development Representative",
    description: "Identifies prospects, crafts personalized outreach, and books meetings on your calendar. He sends personalized emails at scale—and follows up perfectly every time.",
    icon: Users,
    color: "bg-pink-500",
  },
  {
    name: "Alex",
    role: "Customer Support Specialist",
    description: "Handles tier-1 support tickets, answers FAQs, and escalates only what needs human judgment. He responds instantly, 24/7.",
    icon: Headphones,
    color: "bg-cyan-500",
  },
  {
    name: "Casey",
    role: "Content Marketing Specialist",
    description: "Writes blog posts, social content, email sequences, and ad copy in your brand voice. She publishes consistently—without the content calendar headaches.",
    icon: PenTool,
    color: "bg-amber-500",
  },
  {
    name: "LUMEN",
    role: "Visual Designer",
    description: "Creates social graphics, presentation decks, ad creatives, and brand assets. She works in your brand guidelines and delivers print-ready files.",
    icon: Palette,
    color: "bg-indigo-500",
  },
  {
    name: "FLUX",
    role: "Motion Designer",
    description: "Produces short-form video content, animated explainers, and social clips. She edits, adds captions, and optimizes for every platform—automatically.",
    icon: Video,
    color: "bg-pink-400",
  },
];

export function SolutionSection() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Meet Your{" "}
            <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
              AI Workforce
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Pink Beam isn&apos;t another AI tool you have to learn. It&apos;s a team of autonomous
            AI employees that scale your output without scaling your headcount. They handle
            the repetitive work so your human team can focus on what they do best—strategy,
            creativity, and relationships.
          </p>
          <p className="text-base text-foreground mt-6 font-medium">
            Hire your first AI employee today:
          </p>
        </FadeIn>

        {/* Employee Cards Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => {
            const Icon = employee.icon;
            return (
              <Card 
                key={employee.name} 
                className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="pt-6">
                  {/* Header with Icon and Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`${employee.color} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {employee.name}
                      </h3>
                      <p className="text-sm text-primary font-medium">
                        {employee.role}
                      </p>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-muted-foreground">
                    {employee.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
