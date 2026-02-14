import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingNav, MarketingFooter } from "@/components/marketing";
import { FadeIn, StaggerContainer } from "@/components/animations";
import {
  Target,
  Zap,
  Users,
  Globe,
  Award,
  Rocket,
  ArrowRight,
  Linkedin,
  Twitter,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Pink Beam ARM",
  description:
    "Meet the team behind Pink Beam ARM. We're building the future of work where AI employees help founders scale their businesses without scaling headcount.",
  keywords: [
    "Pink Beam",
    "AI employees",
    "about us",
    "team",
    "company",
    "mission",
    "values",
  ],
  openGraph: {
    title: "About Pink Beam ARM",
    description:
      "Meet the team building the future of work with AI employees.",
    images: ["/og-about.png"],
  },
};

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description:
      "We believe AI should amplify human potential, not replace it. Our mission is to help founders build world-changing companies.",
  },
  {
    icon: Zap,
    title: "Move Fast",
    description:
      "Speed is our competitive advantage. We ship daily, learn constantly, and iterate based on real customer feedback.",
  },
  {
    icon: Users,
    title: "Customer Obsessed",
    description:
      "Every decision starts with the customer. We measure success by the success of the businesses we power.",
  },
  {
    icon: Globe,
    title: "Global-First",
    description:
      "Talent is everywhere. We hire the best people regardless of location and build for a global customer base.",
  },
  {
    icon: Award,
    title: "Excellence",
    description:
      "We hold ourselves to the highest standards. Good enough isn't good enough when you're building the future.",
  },
  {
    icon: Rocket,
    title: "Ambition",
    description:
      "We're here to change how work gets done. Small thinking has no place at Pink Beam.",
  },
];

const team = [
  {
    name: "Alex Chen",
    role: "CEO & Co-Founder",
    bio: "Former product lead at OpenAI. Built AI systems at scale for Fortune 500 companies.",
    twitter: "#",
    linkedin: "#",
  },
  {
    name: "Sarah Kim",
    role: "CTO & Co-Founder",
    bio: "Ex-Google Brain. PhD in ML from Stanford. 15+ years building autonomous systems.",
    twitter: "#",
    linkedin: "#",
  },
  {
    name: "Marcus Johnson",
    role: "Head of Design",
    bio: "Previously led design at Notion and Figma. Obsessed with human-AI interfaces.",
    twitter: "#",
    linkedin: "#",
  },
  {
    name: "Elena Rodriguez",
    role: "Head of Engineering",
    bio: "Built distributed systems at Netflix and Uber. Expert in multi-tenant architectures.",
    twitter: "#",
    linkedin: "#",
  },
];

const stats = [
  { value: "100+", label: "Companies Powered" },
  { value: "500+", label: "AI Employees Deployed" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "$2M+", label: "Customer Revenue Generated" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav currentPath="/about" />

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6">
              About Pink Beam
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Building the{" "}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Future of Work
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              We're a team of builders, researchers, and dreamers on a mission to
              help founders scale their businesses with AI employees.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Pink Beam started with a simple observation: the best founders
                  were drowning in operational work. They had vision, product
                  sense, and drive—but they were spending 80% of their time on
                  tasks that didn't require their unique talents.
                </p>
                <p>
                  In 2024, we set out to change that. We built the first version
                  of ARM (Agent Relationship Management) to give founders
                  autonomous AI employees that could handle research, sales,
                  support, and creative work—freeing up founders to focus on
                  what only they could do.
                </p>
                <p>
                  Today, we power over 100 companies with 500+ AI employees
                  working around the clock. But we're just getting started. Our
                  vision is a world where every founder can run a 50-person
                  company as a 1-person operation.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <Card key={stat.label} className="border-border/50">
                    <CardContent className="p-6 text-center">
                      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stat.label}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground">
              The principles that guide everything we do.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <Card
                  key={value.title}
                  className="group hover:border-primary/30 transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Meet the Team
            </h2>
            <p className="text-muted-foreground">
              The people building the future of work.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <Card
                key={member.name}
                className="group hover:border-primary/30 transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-center mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-primary text-center mb-3">
                    {member.role}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {member.bio}
                  </p>
                  <div className="flex justify-center gap-3">
                    <a
                      href={member.twitter}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`${member.name} on Twitter`}
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                    <a
                      href={member.linkedin}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`${member.name} on LinkedIn`}
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Join Us CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join Our Team
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              We're always looking for exceptional people who want to build the
              future of work. If you're passionate about AI and entrepreneurship,
              we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Get in Touch
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
