import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Users, Headphones, PenTool, Palette, Video, ArrowRight, Check } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Employees | Pink Beam ARM",
  description: "Meet your AI workforce. Hire autonomous AI employees for research, sales, support, content, design, and video production.",
};

const employees = [
  {
    id: "researcher",
    name: "Sarah",
    role: "Market Intelligence Analyst",
    description: "Monitors competitors, tracks industry trends, and delivers weekly briefs with actionable insights.",
    icon: Search,
    color: "bg-pink-500",
    capabilities: [
      "Competitive monitoring",
      "Market intelligence",
      "Prospect research",
      "Regulatory tracking",
    ],
  },
  {
    id: "sdr",
    name: "Mike",
    role: "Sales Development Representative",
    description: "Identifies prospects, crafts personalized outreach, and books meetings on your calendar.",
    icon: Users,
    color: "bg-purple-500",
    capabilities: [
      "Lead generation",
      "Personalized outreach",
      "Multi-channel sequences",
      "Meeting booking",
    ],
  },
  {
    id: "support",
    name: "Alex",
    role: "Customer Support Specialist",
    description: "Handles tier-1 support tickets, answers FAQs, and escalates only what needs human judgment.",
    icon: Headphones,
    color: "bg-cyan-500",
    capabilities: [
      "Instant response 24/7",
      "Ticket resolution",
      "Smart escalation",
      "Knowledge base learning",
    ],
  },
  {
    id: "content",
    name: "Casey",
    role: "Content Marketing Specialist",
    description: "Writes blog posts, social content, email sequences, and ad copy in your brand voice.",
    icon: PenTool,
    color: "bg-amber-500",
    capabilities: [
      "Blog posts & articles",
      "Social media content",
      "Email sequences",
      "Ad copy writing",
    ],
  },
  {
    id: "designer",
    name: "LUMEN",
    role: "Visual Designer",
    description: "Creates social graphics, presentation decks, ad creatives, and brand assets.",
    icon: Palette,
    color: "bg-indigo-500",
    capabilities: [
      "Brand assets",
      "Social graphics",
      "Presentation decks",
      "Ad creatives",
    ],
  },
  {
    id: "video",
    name: "FLUX",
    role: "Motion Designer",
    description: "Produces short-form video content, animated explainers, and social clips.",
    icon: Video,
    color: "bg-pink-400",
    capabilities: [
      "Short-form video",
      "Animated explainers",
      "Video editing",
      "Social clips",
    ],
  },
];

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-sm">PB</span>
              </div>
              <span className="font-bold text-xl">Pink Beam</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/agents" className="text-sm text-foreground font-medium">
                AI Employees
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </nav>
            <Button asChild size="sm">
              <Link href="/portal">Enter Portal</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="text-sm font-medium text-primary">
                Available for Hire
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Meet Your{" "}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                AI Workforce
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Fully autonomous AI employees ready to work 24/7. Each one is trained 
              for a specific role and integrates seamlessly with your existing tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/pricing">
                  View Pricing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/portal">Enter Portal</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Employees Grid */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => {
              const Icon = employee.icon;
              return (
                <Card key={employee.id} className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="pt-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`${employee.color} w-14 h-14 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{employee.name}</h2>
                        <p className="text-primary font-medium">{employee.role}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground mb-6">
                      {employee.description}
                    </p>

                    {/* Capabilities */}
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Key Capabilities
                      </h4>
                      <ul className="space-y-2">
                        {employee.capabilities.map((capability) => (
                          <li key={capability} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-muted-foreground">{capability}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <Button variant="outline" className="w-full group" asChild>
                      <Link href={`/agents/employee/${employee.id}`}>
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build Your AI Workforce?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start with one employee or hire a full team. Scale up or down as needed. 
              No long-term contracts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-xs">PB</span>
              </div>
              <span className="font-semibold text-sm">Pink Beam</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Pink Beam. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
