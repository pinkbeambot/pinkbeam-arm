"use client";

import * as React from "react";
import { motion, useInView, Variants, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  once?: boolean;
}

const directionVariants = {
  up: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  down: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
  none: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
} as const;

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = "up",
  once = true,
}: FadeInProps) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once, margin: "-50px" });
  const prefersReducedMotion = useReducedMotion();

  // Respect user's reduced motion preference
  if (prefersReducedMotion) {
    return (
      <div suppressHydrationWarning className={cn(className)}>
        {children}
      </div>
    );
  }

  const variants = directionVariants[direction as keyof typeof directionVariants];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      suppressHydrationWarning
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}

// Simple Fade In on Mount (no scroll trigger)
interface FadeInOnMountProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function FadeInOnMount({
  children,
  className,
  delay = 0,
  duration = 0.5,
}: FadeInOnMountProps) {
  const prefersReducedMotion = useReducedMotion();

  // Respect user's reduced motion preference
  if (prefersReducedMotion) {
    return (
      <div suppressHydrationWarning className={cn(className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      suppressHydrationWarning
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}

export default FadeIn;
