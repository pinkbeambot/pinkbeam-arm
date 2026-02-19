'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentLoaderProps {
  /** Children to render when not loading */
  children: React.ReactNode;
  /** Whether content is loading */
  loading: boolean;
  /** Loading indicator type */
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Text to display while loading */
  text?: string;
  /** Minimum height to prevent layout shift */
  minHeight?: number | string;
  /** Whether to show overlay on existing content */
  overlay?: boolean;
  /** Custom className */
  className?: string;
  /** Delay before showing loader (ms) - prevents flash for quick loads */
  delay?: number;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * ContentLoader - Inline content loading wrapper
 * 
 * Wraps content and shows a loading state when data is being fetched.
 * Prevents layout shift with minimum height and supports delayed
 * loading indicator to prevent flashes on quick loads.
 * 
 * @example
 * ```tsx
 * <ContentLoader loading={isLoading} type="spinner" text="Loading agents...">
 *   <AgentList agents={agents} />
 * </ContentLoader>
 * 
 * // Overlay mode - keeps existing content visible with overlay
 * <ContentLoader loading={isRefreshing} overlay>
 *   <DashboardStats stats={stats} />
 * </ContentLoader>
 * ```
 */
export function ContentLoader({
  children,
  loading,
  type = 'spinner',
  size = 'md',
  text,
  minHeight = 100,
  overlay = false,
  className,
  delay = 0,
}: ContentLoaderProps) {
  const [showLoader, setShowLoader] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay > 0 && loading) {
      const timer = setTimeout(() => setShowLoader(true), delay);
      return () => clearTimeout(timer);
    }
    setShowLoader(true);
  }, [loading, delay]);

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return <DotsLoader size={size} />;
      case 'pulse':
        return <PulseLoader size={size} />;
      case 'skeleton':
        return <SkeletonLoader />;
      case 'spinner':
      default:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className={cn('text-primary', sizeClasses[size])} />
          </motion.div>
        );
    }
  };

  if (!loading) {
    return <>{children}</>;
  }

  const minHeightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  if (overlay) {
    return (
      <div className="relative">
        {children}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <div className="flex flex-col items-center gap-3">
            {renderLoader()}
            {text && (
              <span className="text-sm text-muted-foreground">{text}</span>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!showLoader) {
    return (
      <div style={{ minHeight: minHeightStyle }} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex flex-col items-center justify-center',
        className
      )}
      style={{ minHeight: minHeightStyle }}
    >
      <div className="flex flex-col items-center gap-3">
        {renderLoader()}
        {text && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-muted-foreground"
          >
            {text}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * DotsLoader - Animated dots loading indicator
 */
function DotsLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-primary', dotSize)}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * PulseLoader - Pulsing circle loader
 */
function PulseLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const containerSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  
  return (
    <div className={cn('relative', containerSize)}>
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/30"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <div className="absolute inset-0 rounded-full bg-primary" />
    </div>
  );
}

/**
 * SkeletonLoader - Simple skeleton placeholder
 */
function SkeletonLoader() {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-5/6" />
    </div>
  );
}

/**
 * AsyncContentLoader - Hook-based content loader for async data
 * 
 * Combines loading, error, and empty states in one component
 */
interface AsyncContentLoaderProps<T> {
  data: T | null | undefined;
  loading: boolean;
  error: Error | null;
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
}

export function AsyncContentLoader<T>({
  data,
  loading,
  error,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  isEmpty,
}: AsyncContentLoaderProps<T>) {
  if (loading) {
    return <>{loadingComponent || <ContentLoader loading type="spinner" />}</>;
  }

  if (error) {
    return (
      <>
        {errorComponent || (
          <div className="p-4 text-center text-destructive">
            Failed to load: {error.message}
          </div>
        )}
      </>
    );
  }

  if (data === null || data === undefined) {
    return <>{emptyComponent || <div className="p-4 text-center text-muted-foreground">No data available</div>}</>;
  }

  if (isEmpty && isEmpty(data)) {
    return <>{emptyComponent || <div className="p-4 text-center text-muted-foreground">No items found</div>}</>;
  }

  return <>{children(data)}</>;
}

export default ContentLoader;
