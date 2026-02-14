"use client";

import Link from "next/link";
import { Search, Users, Headphones, PenTool, Palette, Video, Check, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations";

const employeeTabs = [
  {
    id: "sarah",
    label: "Researcher",
    icon: Search,
    name: "Sarah",
    role: "Market Intelligence Analyst",
    capabilities: [
      "Competitive Monitoring: Track competitor pricing, product launches, and messaging changes in real-time",
      "Market Intelligence: Synthesize industry reports, news, and trends into weekly executive briefs",
      "Prospect Research: Deep-dive on target accounts and decision-makers before your sales calls",
      "Regulatory Tracking: Monitor policy changes and compliance requirements affecting your industry",
      "Custom Reports: Answer specific research questions with sourced, cited findings",
    ],
    color: "bg-pink-500",
  },
  {
    id: "mike",
    label: "SDR",
    icon: Users,
    name: "Mike",
    role: "Sales Development Representative",
    capabilities: [
      "Lead Generation: Identify and enrich prospects from 50+ data sources based on your ICP",
      "Personalized Outreach: Write unique, research-backed emails that don't sound like templates",
      "Multi-Channel Sequences: Orchestrate email, LinkedIn, and voicemail touchpoints automatically",
      "Meeting Booking: Handle objections, answer questions, and schedule qualified calls on your calendar",
      "CRM Sync: Log all activities, update stages, and maintain clean data in your existing tools",
    ],
    color: "bg-purple-500",
  },
  {
    id: "alex",
    label: "Support",
    icon: Headphones,
    name: "Alex",
    role: "Customer Support Specialist",
    capabilities: [
      "Instant Response: Answer common questions in under 2 minutes, 24/7/365",
      "Ticket Resolution: Handle password resets, billing questions, and feature guidance autonomously",
      "Smart Escalation: Route complex issues to the right human with full context attached",
      "Knowledge Base: Learn from your docs and improve answers over time",
      "Proactive Outreach: Identify at-risk customers and trigger retention workflows",
    ],
    color: "bg-cyan-500",
  },
  {
    id: "casey",
    label: "Content",
    icon: PenTool,
    name: "Casey",
    role: "Content Marketing Specialist",
    capabilities: [
      "Blog Posts: Write SEO-optimized long-form content in your brand voice",
      "Social Media: Create platform-native content for LinkedIn, Twitter, and Instagram",
      "Email Sequences: Build nurture campaigns, newsletters, and transactional emails",
      "Ad Copy: Generate and test variations for Google, Meta, and LinkedIn ads",
      "Content Strategy: Recommend topics based on trending searches and competitor gaps",
    ],
    color: "bg-amber-500",
  },
  {
    id: "lumen",
    label: "Designer",
    icon: Palette,
    name: "LUMEN",
    role: "Visual Designer",
    capabilities: [
      "Brand Assets: Create logos, icons, and design systems that reflect your brand",
      "Social Graphics: Design engaging posts, stories, and carousel graphics at scale",
      "Presentation Decks: Build polished pitch decks and marketing materials",
      "Ad Creatives: Produce high-converting banner ads and social campaign visuals",
      "Design Consistency: Maintain brand guidelines across all deliverables automatically",
    ],
    color: "bg-indigo-500",
  },
  {
    id: "flux",
    label: "Video",
    icon: Video,
    name: "FLUX",
    role: "Motion Designer",
    capabilities: [
      "Short-Form Video: Create TikTok, Reels, and YouTube Shorts optimized for each platform",
      "Animated Explainers: Build engaging product demos and how-to videos",
      "Video Editing: Edit raw footage, add captions, effects, and music automatically",
      "Social Clips: Transform long-form content into shareable video snippets",
      "Auto-Optimization: Repurpose and adapt videos for different platforms and audiences",
    ],
    color: "bg-pink-400",
  },
];

export function EmployeeTabs() {
  return (
    <section id="employees" className="py-20 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeIn className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            What Each Employee{" "}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Can Do
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Every AI employee comes fully trained and ready to deliver specific, 
            measurable outcomes from day one.
          </p>
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={0.1}>
          <Tabs defaultValue="sarah" className="w-full">
            <TabsList className="w-full flex flex-wrap justify-center h-auto gap-2 bg-transparent mb-8">
              {employeeTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:border-primary/30 data-[state=active]:shadow-sm border border-transparent rounded-lg"
                  >
                    <div className={`${tab.color} w-6 h-6 rounded-md flex items-center justify-center`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {employeeTabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="bg-card rounded-xl p-6 md:p-8 border border-border"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left: Employee Info */}
                  <div className="md:w-1/3">
                    <div className={`${tab.color} w-16 h-16 rounded-xl flex items-center justify-center mb-4`}>
                      <tab.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{tab.name}</h3>
                    <p className="text-primary font-medium mb-4">{tab.role}</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Fully autonomous team member with built-in capabilities
                      and continuous learning.
                    </p>
                    <Link href={`/agents/employee/${tab.id}`}>
                      <Button size="sm" className="w-full group">
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>

                  {/* Right: Capabilities */}
                  <div className="md:w-2/3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Key Capabilities
                    </h4>
                    <ul className="space-y-4">
                      {tab.capabilities.map((capability, index) => {
                        const [title, description] = capability.split(": ");
                        return (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium text-foreground">{title}:</span>{" "}
                              <span className="text-muted-foreground">{description}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </FadeIn>
      </div>
    </section>
  );
}
