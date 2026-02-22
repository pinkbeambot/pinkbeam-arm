/**
 * Optimized Image Component
 * 
 * Wraps Next.js Image with additional optimizations:
 * - WebP/AVIF format support
 * - Blur placeholder for better LCP
 * - Lazy loading with intersection observer
 * - Size optimization
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Generate a tiny blur placeholder
function generateBlurPlaceholder(width: number, height: number): string {
  // Create a tiny SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect width="100%" height="100%" fill="url(#grad)" opacity="0.5"/>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
        </linearGradient>
      </defs>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Hook for intersection observer-based lazy loading
function useLazyLoad<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip if native lazy loading is supported and we're not prioritizing
    if ('loading' in HTMLImageElement.prototype) {
      // Use native lazy loading with intersection observer for earlier loading
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: '50px', // Start loading 50px before visible
          threshold: 0,
        }
      );

      observer.observe(element);
      return () => observer.disconnect();
    } else {
      // Fallback for older browsers
      setIsVisible(true);
    }
  }, []);

  return { ref, isVisible };
}

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  fill = false,
  className,
  containerClassName,
  priority = false,
  quality = 80,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, isVisible } = useLazyLoad<HTMLDivElement>();

  // Generate blur placeholder if not provided
  const blurPlaceholder = blurDataURL || generateBlurPlaceholder(10, 10);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Don't render image until visible (unless priority)
  const shouldRender = priority || isVisible;

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden',
        fill ? 'h-full w-full' : '',
        containerClassName
      )}
      style={!fill ? { width, height } : undefined}
    >
      {/* Blur placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 animate-pulse',
            className
          )}
          style={{
            backgroundImage: `url(${blurPlaceholder})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
            transform: 'scale(1.1)', // Prevent blur edges
          }}
        />
      )}

      {/* Actual image */}
      {shouldRender && !hasError && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          priority={priority}
          quality={quality}
          sizes={sizes}
          placeholder={placeholder}
          blurDataURL={blurPlaceholder}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}

// Avatar-specific optimized component
interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96,
};

export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  className,
}: OptimizedAvatarProps) {
  const dimension = avatarSizes[size];
  const initial = alt.charAt(0).toUpperCase();

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium',
          className
        )}
        style={{ width: dimension, height: dimension }}
      >
        {initial}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className={cn('rounded-full object-cover', className)}
      priority={size === 'xl'} // Only prioritize large avatars
      quality={85}
      sizes={`${dimension}px`}
    />
  );
}
