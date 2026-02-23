'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /** Title text displayed below the spinner */
  title?: string;
  /** Description text displayed below the title */
  description?: string;
  /** Size of the loading spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Full screen overlay or inline */
  fullScreen?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Minimum height when not fullscreen */
  minHeight?: string;
  /** Whether to show the logo animation */
  showLogo?: boolean;
  /** Custom children to render instead of default spinner */
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * LoadingState - Full-page or section loading component
 * 
 * Provides a consistent loading experience with:
 * - Animated spinner with brand colors
 * - Optional title and description
 * - Full-screen or inline variants
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * // Full page loading
 * <LoadingState 
 *   fullScreen 
 *   title="Loading Dashboard" 
 *   description="Preparing your workspace..." 
 * />
 * 
 * // Inline section loading
 * <LoadingState 
 *   size="md"
 *   title="Loading agents..." 
 * />
 * ```
 */
export function LoadingState({
  title,
  description,
  size = 'md',
  fullScreen = false,
  className,
  minHeight = '400px',
  showLogo = false,
  children,
}: LoadingStateProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        fullScreen ? 'h-screen w-full' : 'w-full',
        className
      )}
      style={!fullScreen ? { minHeight } : undefined}
    >
      {children || (
        <>
          {showLogo ? (
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-pink-500/20 blur-xl rounded-full" />
                <Sparkles className={cn("relative text-pink-500", sizeClasses[size])} />
              </div>
            </motion.div>
          ) : (
            <div className="relative mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Loader2 className={cn("text-primary", sizeClasses[size])} />
              </motion.div>
            </div>
          )}

          {title && (
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'font-semibold text-foreground mb-2',
                textSizes[size]
              )}
            >
              {title}
            </motion.h3>
          )}

          {description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground max-w-sm"
            >
              {description}
            </motion.p>
          )}
        </>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * PageLoadingState - Full page loading with default messaging
 * 
 * Use during route transitions or initial page loads
 */
export function PageLoadingState({ 
  message = 'Loading...' 
}: { 
  message?: string 
}) {
  return (
    <LoadingState
      fullScreen
      showLogo
      title={message}
      description="Please wait while we prepare everything for you"
    />
  );
}

/**
 * SectionLoadingState - Inline loading for page sections
 * 
 * Use when loading data for a specific section/card
 */
export function SectionLoadingState({
  title = 'Loading...',
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <LoadingState
      size="sm"
      title={title}
      minHeight="200px"
      className={className}
    />
  );
}

export default LoadingState;
