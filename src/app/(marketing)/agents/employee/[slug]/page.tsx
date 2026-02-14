import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Headphones, PenTool, Palette, Video, ArrowLeft, Check, ArrowRight, HelpCircle } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { MarketingNav, MarketingFooter } from "@/components/marketing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Agent data with name-based slugs as per assignment
const agents = {
  sarah: {
    id: "sarah",
    name: "Sarah",
    role: "Market Intelligence Analyst",
    tagline: "Your eyes and ears in the market",
    description: "Sarah monitors competitors, tracks industry trends, and delivers weekly briefs with actionable insights. She reads your industry's top sources so you don't have to, surfacing opportunities and threats before your competitors know about them.",
    avatar: "/agents/sarah-avatar.png",
    icon: Search,
    color: "bg-pink-500",
    gradient: "from-pink-500 to-rose-500",
    skills: ["Competitive Analysis", "Market Research", "Trend Forecasting", "Report Generation", "Data Synthesis"],
    fullCapabilities: [
      {
        title: "Competitive Monitoring",
        description: "Track competitor pricing, product launches, and messaging changes in real-time. Get alerted the moment something important happens.",
      },
      {
        title: "Market Intelligence",
        description: "Synthesize industry reports, news, and trends into weekly executive briefs that actually get read.",
      },
      {
        title: "Prospect Research",
        description: "Deep-dive on target accounts and decision-makers before your sales calls. Know their pain points before they tell you.",
      },
      {
        title: "Regulatory Tracking",
        description: "Monitor policy changes and compliance requirements affecting your industry. Stay ahead of the curve.",
      },
      {
        title: "Custom Reports",
        description: "Answer specific research questions with sourced, cited findings. Get board-ready reports in minutes, not days.",
      },
    ],
    useCases: [
      "Weekly competitive intelligence briefs",
      "Pre-meeting prospect research",
      "Industry trend analysis",
      "Regulatory compliance monitoring",
    ],
    integrations: ["Crunchbase", "LinkedIn Sales Navigator", "Google Alerts", "SEMrush", "Gartner", "Industry Publications"],
    pricing: "Starting at $397/month",
    responseTime: "< 5 minutes",
    availability: "24/7",
  },
  mike: {
    id: "mike",
    name: "Mike",
    role: "Sales Development Representative",
    tagline: "Your 24/7 SDR — prospecting, qualifying, and booking meetings",
    description: "Mike identifies prospects, crafts personalized outreach, and books meetings on your calendar. He sends personalized emails at scale—and follows up perfectly every time. Your pipeline will never be empty again.",
    avatar: "/agents/mike-avatar.png",
    icon: Users,
    color: "bg-purple-500",
    gradient: "from-purple-500 to-violet-500",
    skills: ["Lead Research", "Outreach", "Qualification", "CRM Sync", "Meeting Booking"],
    fullCapabilities: [
      {
        title: "Lead Generation",
        description: "Identify and enrich prospects from 50+ data sources based on your ICP. Never run out of people to talk to.",
      },
      {
        title: "Personalized Outreach",
        description: "Write unique, research-backed emails that don't sound like templates. Each message is tailored to the recipient.",
      },
      {
        title: "Multi-Channel Sequences",
        description: "Orchestrate email, LinkedIn, and voicemail touchpoints automatically. Meet prospects where they are.",
      },
      {
        title: "Meeting Booking",
        description: "Handle objections, answer questions, and schedule qualified calls on your calendar. You just show up.",
      },
      {
        title: "CRM Sync",
        description: "Log all activities, update stages, and maintain clean data in your existing tools. No manual data entry.",
      },
    ],
    useCases: [
      "Outbound prospecting campaigns",
      "Inbound lead qualification",
      "Event follow-up sequences",
      "Account-based outreach",
    ],
    integrations: ["Salesforce", "HubSpot", "Apollo", "LinkedIn", "Outreach", "Salesloft", "Calendly"],
    pricing: "Starting at $397/month",
    responseTime: "< 2 minutes",
    availability: "24/7",
  },
  alex: {
    id: "alex",
    name: "Alex",
    role: "Customer Support Specialist",
    tagline: "Instant support, zero wait time",
    description: "Alex handles tier-1 support tickets, answers FAQs, and escalates only what needs human judgment. He responds instantly, 24/7, learning from every interaction to get better over time.",
    avatar: "/agents/alex-avatar.png",
    icon: Headphones,
    color: "bg-cyan-500",
    gradient: "from-cyan-500 to-blue-500",
    skills: ["Ticket Resolution", "Live Chat", "Knowledge Base", "Escalation", "Customer Retention"],
    fullCapabilities: [
      {
        title: "Instant Response",
        description: "Answer common questions in under 2 minutes, 24/7/365. Your customers never wait.",
      },
      {
        title: "Ticket Resolution",
        description: "Handle password resets, billing questions, and feature guidance autonomously. Free up your team for complex issues.",
      },
      {
        title: "Smart Escalation",
        description: "Route complex issues to the right human with full context attached. No more 'Can you explain that again?'",
      },
      {
        title: "Knowledge Base",
        description: "Learn from your docs and improve answers over time. The more he works, the smarter he gets.",
      },
      {
        title: "Proactive Outreach",
        description: "Identify at-risk customers and trigger retention workflows. Stop churn before it happens.",
      },
    ],
    useCases: [
      "24/7 customer support coverage",
      "Password reset and account recovery",
      "Billing and subscription questions",
      "Feature how-to guidance",
    ],
    integrations: ["Zendesk", "Intercom", "Freshdesk", "Slack", "Notion", "Stripe", "Chargebee"],
    pricing: "Starting at $397/month",
    responseTime: "< 2 minutes",
    availability: "24/7",
  },
  casey: {
    id: "casey",
    name: "Casey",
    role: "Content Marketing Specialist",
    tagline: "Content that sounds like you, at scale",
    description: "Casey writes blog posts, social content, email sequences, and ad copy in your brand voice. She publishes consistently—without the content calendar headaches. Finally, a content marketer who never misses a deadline.",
    avatar: "/agents/casey-avatar.png",
    icon: PenTool,
    color: "bg-amber-500",
    gradient: "from-amber-500 to-orange-500",
    skills: ["Blog Writing", "Social Media", "Email Marketing", "SEO", "Copywriting"],
    fullCapabilities: [
      {
        title: "Blog Posts",
        description: "Write SEO-optimized long-form content in your brand voice. Rank higher without the writing grind.",
      },
      {
        title: "Social Media",
        description: "Create platform-native content for LinkedIn, Twitter, and Instagram. Engage your audience where they hang out.",
      },
      {
        title: "Email Sequences",
        description: "Build nurture campaigns, newsletters, and transactional emails. Keep your audience engaged.",
      },
      {
        title: "Ad Copy",
        description: "Generate and test variations for Google, Meta, and LinkedIn ads. Find winning copy faster.",
      },
      {
        title: "Content Strategy",
        description: "Recommend topics based on trending searches and competitor gaps. Never run out of ideas.",
      },
    ],
    useCases: [
      "Weekly blog post publishing",
      "Daily social media content",
      "Email newsletter campaigns",
      "Landing page copy",
    ],
    integrations: ["WordPress", "HubSpot", "Mailchimp", "ConvertKit", "Buffer", "Hootsuite", "Google Analytics"],
    pricing: "Starting at $397/month",
    responseTime: "< 1 hour",
    availability: "24/7",
  },
  lumen: {
    id: "lumen",
    name: "Lumen",
    role: "Visual Designer",
    tagline: "Beautiful design, delivered instantly",
    description: "Lumen creates social graphics, presentation decks, ad creatives, and brand assets. She works in your brand guidelines and delivers print-ready files. Your design bottleneck just disappeared.",
    avatar: "/agents/lumen-avatar.png",
    icon: Palette,
    color: "bg-indigo-500",
    gradient: "from-indigo-500 to-purple-500",
    skills: ["Brand Design", "Social Graphics", "Presentations", "Ad Creatives", "Asset Production"],
    fullCapabilities: [
      {
        title: "Brand Assets",
        description: "Create logos, icons, and design systems that reflect your brand. Consistency at scale.",
      },
      {
        title: "Social Graphics",
        description: "Design engaging posts, stories, and carousel graphics at scale. Never miss a posting opportunity.",
      },
      {
        title: "Presentation Decks",
        description: "Build polished pitch decks and marketing materials. Close more deals with stunning visuals.",
      },
      {
        title: "Ad Creatives",
        description: "Produce high-converting banner ads and social campaign visuals. Test more variations.",
      },
      {
        title: "Design Consistency",
        description: "Maintain brand guidelines across all deliverables automatically. No more off-brand assets.",
      },
    ],
    useCases: [
      "Social media graphics at scale",
      "Investor pitch decks",
      "Marketing collateral",
      "Brand asset libraries",
    ],
    integrations: ["Figma", "Canva", "Adobe Creative Suite", "Google Slides", "Pitch", "Notion"],
    pricing: "Starting at $397/month",
    responseTime: "< 2 hours",
    availability: "24/7",
  },
  flux: {
    id: "flux",
    name: "Flux",
    role: "Motion Designer",
    tagline: "Video content, automatically optimized",
    description: "Flux produces short-form video content, animated explainers, and social clips. She edits, adds captions, and optimizes for every platform—automatically. Your video production just went autonomous.",
    avatar: "/agents/flux-avatar.png",
    icon: Video,
    color: "bg-pink-400",
    gradient: "from-pink-400 to-rose-400",
    skills: ["Video Editing", "Motion Graphics", "Captioning", "Platform Optimization", "Short-form Content"],
    fullCapabilities: [
      {
        title: "Short-Form Video",
        description: "Create TikTok, Reels, and YouTube Shorts optimized for each platform. Dominate short-form.",
      },
      {
        title: "Animated Explainers",
        description: "Build engaging product demos and how-to videos. Show, don't just tell.",
      },
      {
        title: "Video Editing",
        description: "Edit raw footage, add captions, effects, and music automatically. Professional edits in minutes.",
      },
      {
        title: "Social Clips",
        description: "Transform long-form content into shareable video snippets. Maximize every piece of content.",
      },
      {
        title: "Auto-Optimization",
        description: "Repurpose and adapt videos for different platforms and audiences. One video, many formats.",
      },
    ],
    useCases: [
      "TikTok and Reels creation",
      "Product demo videos",
      "Podcast clip extraction",
      "Webinar repurposing",
    ],
    integrations: ["Adobe Premiere", "Final Cut Pro", "CapCut", "YouTube", "TikTok", "Instagram", "Descript"],
    pricing: "Starting at $397/month",
    responseTime: "< 4 hours",
    availability: "24/7",
  },
};

// Generate static params for all agents
export function generateStaticParams() {
  return Object.keys(agents).map((slug) => ({ slug }));
}

// Generate metadata for each agent
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = agents[slug as keyof typeof agents];
  
  if (!agent) {
    return {
      title: "Agent Not Found | Pink Beam ARM",
    };
  }

  return {
    title: `${agent.name} | AI ${agent.role} | Pink Beam ARM`,
    description: agent.description,
    openGraph: {
      title: `${agent.name} - AI ${agent.role}`,
      description: agent.tagline,
      images: [{
        url: agent.avatar,
        alt: `${agent.name} - AI ${agent.role}`,
      }],
    },
  };
}

export default async function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }): Promise<ReactElement> {
  const { slug } = await params;
  const agent = agents[slug as keyof typeof agents];

  if (!agent) {
    notFound();
  }

  const Icon = agent.icon;

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav currentPath="/agents" />

      {/* Hero Section */}
      <section className={`pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-br ${agent.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <Link 
              href="/agents" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all agents
            </Link>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
                  {agent.name}
                </h1>
                <p className="text-xl text-white/90">{agent.role}</p>
              </div>
            </div>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl">
              {agent.tagline}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Description & Capabilities */}
          <div className="lg:col-span-2 space-y-12">
            {/* About */}
            <FadeIn>
              <h2 className="text-2xl font-bold mb-4">About {agent.name}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {agent.description}
              </p>
            </FadeIn>

            {/* Skills */}
            <FadeIn delay={0.1}>
              <h2 className="text-2xl font-bold mb-6">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {agent.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </FadeIn>

            {/* Capabilities */}
            <FadeIn delay={0.1}>
              <h2 className="text-2xl font-bold mb-6">Key Capabilities</h2>
              <StaggerContainer className="space-y-4">
                {agent.fullCapabilities.map((capability) => (
                  <Card key={capability.title}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center shrink-0`}>
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{capability.title}</h3>
                          <p className="text-muted-foreground">{capability.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </StaggerContainer>
            </FadeIn>

            {/* Use Cases */}
            <FadeIn delay={0.2}>
              <h2 className="text-2xl font-bold mb-6">Use Cases</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {agent.useCases.map((useCase) => (
                  <Card key={useCase}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${agent.color}`} />
                      <span className="text-muted-foreground">{useCase}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </FadeIn>

            {/* Integrations */}
            <FadeIn delay={0.2}>
              <h2 className="text-2xl font-bold mb-4">Integrations</h2>
              <p className="text-muted-foreground mb-4">
                {agent.name} works seamlessly with your existing tools:
              </p>
              <div className="flex flex-wrap gap-2">
                {agent.integrations.map((integration) => (
                  <Badge key={integration} variant="outline">
                    {integration}
                  </Badge>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right Column - Stats & CTA */}
          <div className="lg:col-span-1">
            <FadeIn delay={0.1}>
              <Card className="sticky top-24">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Starting at</p>
                    <p className="text-3xl font-bold">{agent.pricing}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Response Time</span>
                      <span className="font-medium">{agent.responseTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Availability</span>
                      <span className="font-medium">{agent.availability}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-semibold mb-3">What&apos;s included:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Full setup &amp; training</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Unlimited tasks</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Priority support</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Weekly performance reports</span>
                      </li>
                    </ul>
                  </div>

                  <Button size="lg" variant="beam" className="w-full" asChild>
                    <Link href="/signup">
                      Hire {agent.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    7-day free trial. No credit card required.
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
              <HelpCircle className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Everything you need to know about hiring {agent.name}.
            </p>
          </FadeIn>

          {/* FAQ Accordion */}
          <FadeIn delay={0.1}>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="how-it-works"
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  How does {agent.name} work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {agent.name} integrates with your existing tools and workflows. After a quick 
                  5-minute setup, {agent.name} begins working autonomously based on your 
                  configured preferences. You can monitor progress, provide feedback, and 
                  adjust settings through the Pink Beam portal.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="setup-time"
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  How long does setup take?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Initial setup takes about 5 minutes. Connect your tools, define your 
                  preferences and brand voice, and set any guardrails. {agent.name} starts 
                  working immediately and learns from your feedback over time to improve 
                  performance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="integrations"
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  What integrations are supported?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {agent.name} integrates with {agent.integrations.slice(0, 4).join(", ")}, 
                  and many more. We support 100+ tools and add new integrations weekly. 
                  If you need a specific integration, contact us and we&apos;ll prioritize it.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="security"
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  Is my data secure with {agent.name}?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Yes. We&apos;re SOC 2 Type II certified with AES-256 encryption. Your proprietary 
                  data is never used to train models. We operate under strict zero data retention 
                  policies and can deploy in isolated environments for enterprise customers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="human-override"
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  Can I override or adjust {agent.name}&apos;s work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Absolutely. You have full visibility into everything {agent.name} does. 
                  Set up approval workflows for critical actions, provide feedback to improve 
                  results, and adjust settings anytime. You&apos;re always in control.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="cancellation"
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  Can I cancel anytime?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Yes. Monthly plans can be canceled with 7 days notice. Annual plans can be 
                  downgraded at renewal. No long-term contracts, no hidden fees. We offer a 
                  7-day free trial so you can try {agent.name} risk-free.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </FadeIn>

          {/* Contact CTA */}
          <FadeIn delay={0.2} className="mt-12 text-center">
            <p className="text-muted-foreground">
              Still have questions?{" "}
              <Link href="/contact" className="text-primary hover:text-primary/80 font-medium">
                Book a demo
              </Link>{" "}
              and we&apos;ll answer everything.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Hire {agent.name}?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join 100+ companies already scaling with AI employees. Start your 
              free trial today—no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="beam" asChild>
                <Link href="/signup">Hire Your Team</Link>
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