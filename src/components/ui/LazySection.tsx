/**
 * Lazy Section Component
 * 
 * Wraps below-fold content with Intersection Observer for lazy loading.
 * Only renders children when the section enters the viewport.
 */

'use client';

import { ReactNode } from 'react';
import { useLazyRender } from '@/lib/performance/hooks';
import { cn } from '@/lib/utils';

interface LazySectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  placeholder?: ReactNode;
  rootMargin?: string;
}

/**
 * Lazy-loaded section that renders only when visible.
 */
export function LazySection({
  children,
  className,
  delay = 0,
  placeholder,
  rootMargin = '100px',
}: LazySectionProps) {
  const { ref, shouldRender } = useLazyRender<HTMLDivElement>({
    delay,
  });

  return (
    <div
      ref={ref}
      className={cn(className)}
    >
      {shouldRender ? children : placeholder || <SectionPlaceholder />}
    </div>
  );
}

function SectionPlaceholder() {
  return (
    <div className="min-h-[200px] bg-muted/30 animate-pulse rounded-lg" />
  );
}

/**
 * Lazy-loaded list for long lists.
 * Renders only visible items.
 */
interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemHeight?: number;
  overscan?: number;
}

export function LazyList<T>({
  items,
  renderItem,
  className,
  itemHeight = 60,
  overscan = 5,
}: LazyListProps<T>) {
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <LazySection
          key={index}
          delay={0}
          rootMargin={`${itemHeight * overscan}px`}
          placeholder={
            <div
              className="bg-muted/30 animate-pulse rounded-lg"
              style={{ height: itemHeight }}
            />
          }
        >
          {renderItem(item, index)}
        </LazySection>
      ))}
    </div>
  );
}
