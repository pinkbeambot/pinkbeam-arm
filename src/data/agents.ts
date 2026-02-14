import { Search, Users, Headphones, PenTool, Palette, Video, LucideIcon } from "lucide-react";

export interface Agent {
  id: string;
  name: string;
  role: string;
  tagline: string;
  description: string;
  avatar: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  skills: string[];
  fullCapabilities: {
    title: string;
    description: string;
  }[];
  useCases: string[];
  integrations: string[];
  pricing: string;
  responseTime: string;
  availability: string;
}

export const agents: Record<string, Agent> = {
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
    color: "bg-pink-500",
    gradient: "from-pink-500 to-rose-500",
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
    gradient: "from-indigo-500 to-pink-500",
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

export const agentSlugs = Object.keys(agents);
