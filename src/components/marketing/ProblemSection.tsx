"use client";

import { Search, Users, Headphones, PenTool, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer } from "@/components/animations";
import { FadeIn } from "@/components/animations";

const painPoints = [
  {
    icon: Search,
    title: "The Research Black Hole",
    headline: "Drowning in Information",
    description: "You're supposed to make strategic decisions, but you're stuck reading 47-page market reports, hunting through competitor pricing, and manually tracking industry news. By the time you've finished researching, the opportunity's gone.",
    color: "bg-pink-500",
  },
  {
    icon: Users,
    title: "The Sales Time Sink",
    headline: "Sales Outreach That Never Ends",
    description: "You know you should be prospecting, but crafting 50 personalized emails takes 4 hours you don't have. So you push it off. And your pipeline dries up. Again.",
    color: "bg-purple-500",
  },
  {
    icon: Headphones,
    title: "The Support Trap",
    headline: "Tickets That Multiply Overnight",
    description: "Every morning starts with 30+ support requests. Password resets, feature questions, refund requests. You're paying yourself founder salary to do $15/hour work.",
    color: "bg-cyan-500",
  },
  {
    icon: PenTool,
    title: "The Content Treadmill",
    headline: "Content Creation Never Ships",
    description: "Your audience needs fresh content, but writing blog posts, social captions, and newsletters takes 20+ hours weekly. You're either creating mediocre content or not creating at all.",
    color: "bg-amber-500",
  },
  {
    icon: Palette,
    title: "The Design Bottleneck",
    headline: "Design Work Piles Up",
    description: "Every project needs graphics, decks, and brand assets. You're either paying $3K for freelance designers or spending nights in Figma doing mediocre work when you should be building.",
    color: "bg-indigo-500",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            You're Doing Work You{" "}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Shouldn't
            </span>{" "}
            Be Doing
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Most founders spend 60% of their time on tasks that don't move the needle. 
            Here's what's actually eating your days:
          </p>
        </FadeIn>

        {/* Pain Point Cards - Responsive Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
          {painPoints.map((point) => {
            const Icon = point.icon;
            return (
              <Card key={point.title} className="group h-full hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Icon */}
                  <div className={`${point.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    {point.title}
                  </p>
                  <h3 className="text-sm font-semibold mb-3 text-foreground leading-snug">
                    {point.headline}
                  </h3>
                  <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                    {point.description}
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
