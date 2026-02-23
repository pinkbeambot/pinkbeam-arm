/**
 * Optimized Image Component
 * 
 * Next.js Image wrapper with performance optimizations.
 * Ensures consistent lazy loading and WebP format usage.
 */

'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized Image component with lazy loading and blur placeholder.
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  containerClassName,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 80,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(!priority);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate blur placeholder for avatars
  const defaultBlurDataURL = blurDataURL || 
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill && 'absolute inset-0',
        containerClassName
      )}
      style={!fill && width && height ? { width, height } : undefined}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit" />
      )}
      {!hasError && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          quality={quality}
          sizes={sizes}
          placeholder={placeholder}
          blurDataURL={defaultBlurDataURL}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <span className="text-sm">Failed to load</span>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar image component with optimizations for user/agent avatars.
 */
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 128,
};

export function OptimizedAvatarImage({
  src,
  alt,
  size = 'md',
  className,
  priority = false,
}: AvatarImageProps) {
  const dimensions = sizeMap[size];
  
  return (
    <OptimizedImage
      src={src || '/images/default-avatar.png'}
      alt={alt}
      width={dimensions}
      height={dimensions}
      priority={priority}
      quality={85}
      sizes={`${dimensions}px`}
      placeholder="blur"
      className={cn('rounded-full object-cover', className)}
      containerClassName="rounded-full"
    />
  );
}
