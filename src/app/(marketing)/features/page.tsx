import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Bot, Workflow, Shield, Zap, BarChart3, Users, Clock, Sparkles, Lock, Globe } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Features | Pink Beam ARM",
  description: "Discover the powerful features of Pink Beam ARM. AI employees, real-time collaboration, enterprise security, and seamless integrations.",
  keywords: ["AI employees features", "ARM features", "AI workforce platform", "autonomous agents features"],
  openGraph: {
    title: "Features | Pink Beam ARM",
    description: "Discover the powerful features of Pink Beam ARM. AI employees, real-time collaboration, enterprise security.",
    images: ["/og-features.png"],
  },
};

const features = [
  { icon: Bot, title: "AI Employee Roster", description: "Hire from a diverse team of specialized AI employees. Each with unique skills, personalities, and capabilities.", highlights: ["6 specialized roles", "Customizable personalities", "Role-specific training"] },
  { icon: Workflow, title: "Autonomous Workflows", description: "AI employees work independently, making decisions and completing tasks without constant supervision.", highlights: ["Self-directed execution", "Smart task prioritization", "Automatic escalation"] },
  { icon: Shield, title: "Enterprise Security", description: "Bank-grade security with SOC 2 compliance, end-to-end encryption, and granular access controls.", highlights: ["SOC 2 Type II", "End-to-end encryption", "Audit logs"] },
  { icon: Zap, title: "Real-time Collaboration", description: "Watch your AI employees work in real-time. Intervene when needed, approve decisions, and guide outcomes.", highlights: ["Live activity feed", "Instant notifications", "One-click approvals"] },
  { icon: BarChart3, title: "Advanced Analytics", description: "Track performance, measure ROI, and optimize your AI workforce with detailed analytics.", highlights: ["Performance dashboards", "ROI tracking", "Usage insights"] },
  { icon: Users, title: "Human-AI Handoff", description: "Seamless escalation system ensures complex issues reach the right human at the right time.", highlights: ["Smart routing", "Context preservation", "Priority-based escalation"] },
];

const comparisonFeatures = [
  { name: "AI Employees", starter: "1", growth: "3", scale: "Unlimited" },
  { name: "Email Integration", starter: true, growth: true, scale: true },
  { name: "Slack Integration", starter: false, growth: true, scale: true },
  { name: "API Access", starter: false, growth: true, scale: true },
  { name: "Analytics Dashboard", starter: "Basic", growth: "Advanced", scale: "Custom" },
  { name: "Support Response", starter: "24h", growth: "4h", scale: "1h" },
  { name: "Data Retention", starter: "7 days", growth: "30 days", scale: "Unlimited" },
  { name: "Custom Integrations", starter: false, growth: false, scale: true },
  { name: "Dedicated Account Manager", starter: false, growth: false, scale: true },
  { name: "99.9% Uptime SLA", starter: false, growth: false, scale: true },
];

function ComparisonValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") return value ? <Check className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>;
  return <span className="font-medium">{value}</span>;
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Powerful Capabilities</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Everything You Need to <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">Scale with AI</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              A complete platform for hiring, managing, and scaling your AI workforce. Built for founders who want to move fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild><Link href="/pricing">Get Started<ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link href="/agents">View AI Employees</Link></Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-muted-foreground">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Plan Comparison</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Choose the plan that fits your needs. Upgrade or downgrade anytime.</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[300px]">Feature</TableHead>
                      <TableHead className="text-center">Starter</TableHead>
                      <TableHead className="text-center bg-primary/5">Growth</TableHead>
                      <TableHead className="text-center">Scale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonFeatures.map((feature, index) => (
                      <TableRow key={feature.name} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell className="text-center"><ComparisonValue value={feature.starter} /></TableCell>
                        <TableCell className="text-center bg-primary/5"><ComparisonValue value={feature.growth} /></TableCell>
                        <TableCell className="text-center"><ComparisonValue value={feature.scale} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.2} className="mt-12 text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild><Link href="/pricing">View Full Pricing</Link></Button>
              <Button size="lg" variant="outline" asChild><Link href="/contact">Talk to Sales</Link></Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built for <span className="bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">Enterprise Scale</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">Security, compliance, and reliability at the core of everything we build.</p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Lock className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold mb-1">SOC 2 Type II Certified</h3>
                    <p className="text-sm text-muted-foreground">Independent audits verify our security controls and processes.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Globe className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold mb-1">GDPR & CCPA Compliant</h3>
                    <p className="text-sm text-muted-foreground">Full data protection with right-to-deletion and export capabilities.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Clock className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold mb-1">99.9% Uptime SLA</h3>
                    <p className="text-sm text-muted-foreground">Enterprise plans include guaranteed uptime with financial backing.</p>
                  </div>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.1} direction="left">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-pink-500/20 rounded-3xl blur-3xl" />
                <div className="relative bg-card border border-border rounded-3xl p-8">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-4 text-sm text-muted-foreground">Security Dashboard</span>
                  </div>
                  <div className="space-y-3 mt-4">
                    {["Encryption at Rest", "Encryption in Transit", "Access Controls", "Audit Logging", "SSO / SAML"].map((item) => (
                      <div key={item} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm">{item}</span><Check className="w-5 h-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Workforce?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">Join hundreds of founders who are scaling their businesses with AI employees. Start your 7-day free trial today.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild><Link href="/pricing">Start Free Trial</Link></Button>
              <Button size="lg" variant="outline" asChild><Link href="/contact">Schedule a Demo</Link></Button>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
