"use client";

import * as React from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// Button Micro-interactions
// ============================================================================

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "beam" | "outline" | "ghost";
  isLoading?: boolean;
  success?: boolean;
}

/**
 * Button with press animation and loading state
 * 
 * @example
 * ```tsx
 * <AnimatedButton onClick={handleClick} isLoading={isLoading}>
 *   Save Changes
 * </AnimatedButton>
 * ```
 */
export function AnimatedButton({
  children,
  className,
  variant = "default",
  isLoading,
  success,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  const baseStyles = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "beam" && "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-beam hover:shadow-glow-pink-md",
    variant === "outline" && "border bg-background hover:bg-accent hover:text-accent-foreground",
    variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
    "h-9 px-4 py-2",
    className
  );

  if (prefersReducedMotion) {
    return (
      <button className={baseStyles} disabled={disabled || isLoading} {...props}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      className={baseStyles}
      disabled={disabled || isLoading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <LoadingDots />
          </motion.span>
        ) : success ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-2"
          >
            <SuccessCheckmark />
            Done
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ============================================================================
// Loading Dots Animation
// ============================================================================

function LoadingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

// ============================================================================
// Success Checkmark Animation
// ============================================================================

function SuccessCheckmark() {
  return (
    <motion.svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      initial="hidden"
      animate="visible"
    >
      <motion.path
        d="M3 8L6.5 11.5L13 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1 },
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

// ============================================================================
// Card Hover Effects
// ============================================================================

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  glowOnHover?: boolean;
}

/**
 * Card with hover lift effect and optional glow
 * 
 * @example
 * ```tsx
 * <HoverCard glowOnHover>
 *   <Content />
 * </HoverCard>
 * ```
 */
export function HoverCard({
  children,
  className,
  hoverScale = 1.02,
  glowOnHover = false,
}: HoverCardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={cn("rounded-lg border bg-card p-6", className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(
        "rounded-lg border bg-card p-6 transition-shadow",
        glowOnHover && "hover:shadow-lg hover:shadow-pink-500/10",
        className
      )}
      whileHover={{ 
        scale: hoverScale,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Pulse Ring Effect (for notifications, alerts)
// ============================================================================

interface PulseRingProps {
  children: React.ReactNode;
  className?: string;
  color?: "primary" | "destructive" | "success";
}

export function PulseRing({ children, className, color = "primary" }: PulseRingProps) {
  const prefersReducedMotion = useReducedMotion();

  const colorClasses = {
    primary: "bg-primary",
    destructive: "bg-destructive",
    success: "bg-green-500",
  };

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative inline-flex", className)}>
      <span className={cn("relative flex h-3 w-3")}>
        <motion.span
          className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", colorClasses[color])}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <span className={cn("relative inline-flex rounded-full h-3 w-3", colorClasses[color])} />
      </span>
      <span className="ml-2">{children}</span>
    </div>
  );
}

// ============================================================================
// Shake Animation (for errors)
// ============================================================================

interface ShakeProps {
  children: React.ReactNode;
  className?: string;
  shake?: boolean;
}

export function Shake({ children, className, shake = false }: ShakeProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || !shake) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{
        x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
      }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Ripple Effect (for interactive elements)
// ============================================================================

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function RippleButton({ children, className, ...props }: RippleButtonProps) {
  const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples((prev) => [...prev, { x, y, id }]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);

    props.onClick?.(e);
  };

  if (prefersReducedMotion) {
    return (
      <button className={className} {...props}>
        {children}
      </button>
    );
  }

  return (
    <button
      className={cn("relative overflow-hidden", className)}
      onClick={handleClick}
      {...props}
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 200, height: 200, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
      {children}
    </button>
  );
}

// ============================================================================
// Magnetic Button (follows cursor slightly)
// ============================================================================

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticButton({ children, className, strength = 0.3 }: MagneticButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current || prefersReducedMotion) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;
    
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.button>
  );
}
