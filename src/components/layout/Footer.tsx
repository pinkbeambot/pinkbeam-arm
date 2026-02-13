"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Twitter, Linkedin, Github, Mail, Users, Globe, Code2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";

// Service configuration (matches Navigation.tsx)
const services = [
  {
    id: "agents",
    name: "Agents",
    description: "AI employees for your business",
    icon: Users,
    href: "/agents",
    color: "#FF006E",
    bgColor: "bg-pink-500",
    textColor: "text-pink-500",
    borderColor: "border-pink-500/30",
    hoverColor: "hover:bg-pink-500/10 hover:text-pink-500",
    accentColor: "text-pink-400",
  },
  {
    id: "web",
    name: "Web",
    description: "Website & SEO services",
    icon: Globe,
    href: "/web",
    color: "#8B5CF6",
    bgColor: "bg-violet-500",
    textColor: "text-violet-500",
    borderColor: "border-violet-500/30",
    hoverColor: "hover:bg-violet-500/10 hover:text-violet-500",
    accentColor: "text-violet-400",
  },
  {
    id: "labs",
    name: "Labs",
    description: "Custom software development",
    icon: Code2,
    href: "/labs",
    color: "#06B6D4",
    bgColor: "bg-cyan-500",
    textColor: "text-cyan-500",
    borderColor: "border-cyan-500/30",
    hoverColor: "hover:bg-cyan-500/10 hover:text-cyan-500",
    accentColor: "text-cyan-400",
  },
  {
    id: "solutions",
    name: "Solutions",
    description: "Strategic consulting",
    icon: Lightbulb,
    href: "/solutions",
    color: "#F59E0B",
    bgColor: "bg-amber-500",
    textColor: "text-amber-500",
    borderColor: "border-amber-500/30",
    hoverColor: "hover:bg-amber-500/10 hover:text-amber-500",
    accentColor: "text-amber-400",
  },
];

// Detect current service from pathname
function useCurrentService() {
  const pathname = usePathname();

  if (pathname?.startsWith("/agents")) return services.find(s => s.id === "agents") || null;
  if (pathname?.startsWith("/web")) return services.find(s => s.id === "web") || null;
  if (pathname?.startsWith("/labs")) return services.find(s => s.id === "labs") || null;
  if (pathname?.startsWith("/solutions")) return services.find(s => s.id === "solutions") || null;

  return null; // Home page
}

// Social links
const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/pinkbeam", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com/company/pinkbeam", label: "LinkedIn" },
  { icon: Github, href: "https://github.com/pinkbeambot", label: "GitHub" },
  { icon: Mail, href: "/contact", label: "Contact" },
];

// Logo component
function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-beam">
        <span className="text-white font-display font-bold text-sm">PB</span>
        <div className="absolute inset-0 rounded-lg bg-gradient-beam blur-md opacity-50" />
      </div>
      <span className="font-display font-bold text-xl tracking-tight">
        <span className="text-gradient-beam">Pink</span>
        <span className="text-foreground"> Beam</span>
      </span>
    </Link>
  );
}

// Footer column component with service-specific hover color
function FooterColumn({
  title,
  links,
  hoverColor,
}: {
  title: string;
  links: { label: string; href: string }[];
  hoverColor?: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-display font-semibold text-sm text-foreground">
        {title}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className={cn(
                "text-sm text-muted-foreground transition-colors",
                hoverColor || "hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Social links component with service-specific hover color
function SocialLinks({ currentService }: { currentService: typeof services[0] | null }) {
  const hoverColor = currentService?.hoverColor || "hover:bg-pink-500/10 hover:text-pink-500";

  return (
    <div className="flex items-center gap-3">
      {socialLinks.map((social) => {
        const Icon = social.icon;
        return (
          <a
            key={social.label}
            href={social.href}
            target={social.href.startsWith("http") ? "_blank" : undefined}
            rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
            aria-label={social.label}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg bg-muted transition-colors",
              hoverColor
            )}
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
    </div>
  );
}

// Main Footer Component
export function Footer() {
  const currentService = useCurrentService();

  // Service-specific description
  const description = currentService
    ? `${currentService.description}. Professional solutions designed to help your business grow.`
    : "Professional AI employees, websites, software development, and strategic consulting—all under one roof.";

  // Service-specific link hover color
  const linkHoverColor = currentService?.textColor ? `hover:${currentService.textColor}` : undefined;

  // Footer links - only include real pages
  const footerLinks = {
    services: {
      title: "Services",
      links: [
        { label: "AI Employees", href: "/agents" },
        { label: "Websites & SEO", href: "/web" },
        { label: "Custom Software", href: "/labs" },
        { label: "Consulting", href: "/solutions" },
      ],
    },
    pricing: {
      title: "Pricing",
      links: [
        { label: "Agents", href: "/agents/pricing" },
        { label: "Web", href: "/web/pricing" },
        { label: "Labs", href: "/labs/pricing" },
        { label: "Solutions", href: "/solutions/pricing" },
      ],
    },
    resources: {
      title: "Resources",
      links: [
        { label: "AI Readiness", href: "/solutions/resources/ai-readiness-score" },
        { label: "ROI Calculator", href: "/solutions/resources/automation-roi-calculator" },
      ],
    },
    company: {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    legal: {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
      ],
    },
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <FadeIn direction="up" once>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <Logo />
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                {description}
              </p>
              <SocialLinks currentService={currentService} />
            </div>

            {/* Links Grid */}
            <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 lg:gap-8">
              <FooterColumn
                title={footerLinks.services.title}
                links={footerLinks.services.links}
                hoverColor={linkHoverColor}
              />
              <FooterColumn
                title={footerLinks.pricing.title}
                links={footerLinks.pricing.links}
                hoverColor={linkHoverColor}
              />
              <FooterColumn
                title={footerLinks.resources.title}
                links={footerLinks.resources.links}
                hoverColor={linkHoverColor}
              />
              <FooterColumn
                title={footerLinks.company.title}
                links={footerLinks.company.links}
                hoverColor={linkHoverColor}
              />
              <FooterColumn
                title={footerLinks.legal.title}
                links={footerLinks.legal.links}
                hoverColor={linkHoverColor}
              />
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Pink Beam. All rights reserved.
            </p>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}

export default Footer;
