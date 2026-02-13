import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: boolean;
}

const sizeClasses = {
  sm: "max-w-3xl",      // 768px
  md: "max-w-4xl",      // 896px
  lg: "max-w-6xl",      // 1152px
  xl: "max-w-7xl",      // 1280px
  full: "max-w-none",   // Full width
};

export function Container({
  children,
  className,
  size = "xl",
  padding = true,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        sizeClasses[size],
        padding && "px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: "default" | "muted" | "sunken" | "gradient" | "void";
  padding?: "sm" | "md" | "lg" | "xl";
}

const backgroundClasses = {
  default: "bg-background",
  muted: "bg-[var(--surface-elevated)]",
  sunken: "bg-[var(--surface-sunken)]",
  gradient: "bg-gradient-beam",
  void: "bg-gradient-void",
};

const paddingClasses = {
  sm: "py-8 md:py-12",
  md: "py-12 md:py-16 lg:py-20",
  lg: "py-16 md:py-24 lg:py-32",
  xl: "py-20 md:py-32 lg:py-40",
};

export function Section({
  children,
  className,
  id,
  background = "default",
  padding = "lg",
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        backgroundClasses[background],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </section>
  );
}

// Full-bleed section with inner container
interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
  background?: "default" | "muted" | "sunken" | "gradient" | "void";
  padding?: "sm" | "md" | "lg" | "xl";
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
}

export function SectionContainer({
  children,
  className,
  containerClassName,
  id,
  background = "default",
  padding = "lg",
  containerSize = "xl",
}: SectionContainerProps) {
  return (
    <Section
      id={id}
      background={background}
      padding={padding}
      className={className}
    >
      <Container size={containerSize} className={containerClassName}>
        {children}
      </Container>
    </Section>
  );
}

// Split section for two-column layouts
interface SplitSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: "default" | "muted" | "sunken" | "gradient" | "void";
  padding?: "sm" | "md" | "lg" | "xl";
  gap?: "sm" | "md" | "lg";
  reverse?: boolean;
}

const gapClasses = {
  sm: "gap-8 lg:gap-12",
  md: "gap-12 lg:gap-16",
  lg: "gap-16 lg:gap-24",
};

export function SplitSection({
  children,
  className,
  id,
  background = "default",
  padding = "lg",
  gap = "lg",
  reverse = false,
}: SplitSectionProps) {
  return (
    <Section
      id={id}
      background={background}
      padding={padding}
      className={className}
    >
      <Container>
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-2 items-center",
            gapClasses[gap],
            reverse && "lg:flex-row-reverse"
          )}
        >
          {children}
        </div>
      </Container>
    </Section>
  );
}

export default Container;
