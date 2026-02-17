/**
 * React Query Provider Configuration
 * 
 * Optimized caching strategy for the ARM portal.
 * Provides intelligent cache management for different data types.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { cacheConfig } from './config';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          // Default cache configuration
          staleTime: cacheConfig.queries.staleTime,
          gcTime: cacheConfig.queries.gcTime,
          retry: cacheConfig.queries.retry,
          retryDelay: cacheConfig.queries.retryDelay,
          // Performance optimizations
          refetchOnWindowFocus: false, // Disable refetch on window focus for better UX
          refetchOnMount: 'always', // Refetch when component mounts if stale
          // Error handling
          throwOnError: false,
        },
        mutations: {
          retry: 1,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
