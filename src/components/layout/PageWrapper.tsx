import * as React from "react";
import { Metadata } from "next";
import { cn } from "@/lib/utils";

// SEO Metadata types
interface PageMeta {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: "website" | "article";
  canonicalUrl?: string;
  noIndex?: boolean;
}

// PageWrapper props
interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  background?: "default" | "muted" | "sunken" | "void" | "gradient";
  padding?: "none" | "sm" | "md" | "lg";
  meta?: PageMeta;
}

// Background styles
const backgroundClasses = {
  default: "bg-background",
  muted: "bg-[var(--surface-elevated)]",
  sunken: "bg-[var(--surface-sunken)]",
  void: "bg-gradient-void",
  gradient: "bg-gradient-beam",
};

// Padding styles
const paddingClasses = {
  none: "",
  sm: "py-8",
  md: "py-12 lg:py-16",
  lg: "py-16 lg:py-24",
};

// Generate metadata object for Next.js
export function generatePageMetadata(meta: PageMeta): Metadata {
  const {
    title,
    description,
    keywords = [],
    ogImage,
    ogType = "website",
    canonicalUrl,
    noIndex = false,
  } = meta;

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: [{ name: "Pink Beam" }],
    creator: "Pink Beam",
    publisher: "Pink Beam",
    robots: noIndex ? { index: false, follow: false } : undefined,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      type: ogType,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
      siteName: "Pink Beam",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
      creator: "@pinkbeam",
      site: "@pinkbeam",
    },
  };
}

// Default SEO metadata
export const defaultMeta: PageMeta = {
  title: "Pink Beam — Hire AI Employees for $397/Month",
  description:
    "Build your AI workforce with Pink Beam. Hire AI employees for research, sales, support, content, and design starting at $397/month. Replace $12K+ human salaries.",
  keywords: [
    "AI employees",
    "AI workforce",
    "automation",
    "AI sales",
    "AI support",
    "AI content",
    "AI research",
    "business automation",
    "Pink Beam",
  ],
  ogImage: "/og-image.png",
  ogType: "website",
};

// Page Wrapper Component
export function PageWrapper({
  children,
  className,
  background = "default",
  padding = "none",
  meta,
}: PageWrapperProps) {
  return (
    <main
      className={cn(
        "min-h-screen",
        backgroundClasses[background],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </main>
  );
}

// Section component for consistent page sections
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: "default" | "muted" | "sunken" | "void" | "gradient";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  container?: boolean;
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
}

const sectionPaddingClasses = {
  none: "",
  sm: "py-8 md:py-12",
  md: "py-12 md:py-16 lg:py-20",
  lg: "py-16 md:py-24 lg:py-32",
  xl: "py-20 md:py-32 lg:py-40",
};

const containerSizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export function Section({
  children,
  className,
  id,
  background = "default",
  padding = "lg",
  container = true,
  containerSize = "xl",
}: SectionProps) {
  const content = container ? (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        containerSizeClasses[containerSize]
      )}
    >
      {children}
    </div>
  ) : (
    children
  );

  return (
    <section
      id={id}
      className={cn(
        backgroundClasses[background],
        sectionPaddingClasses[padding],
        className
      )}
    >
      {content}
    </section>
  );
}

// Container component
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Container({
  children,
  className,
  size = "xl",
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        containerSizeClasses[size],
        className
      )}
    >
      {children}
    </div>
  );
}

export default PageWrapper;
