/**
 * Optimized Data Fetching Hooks
 * 
 * React Query hooks with additional caching, optimistic updates,
 * and performance optimizations.
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

// ============================================================================
// Cache Management
// ============================================================================

interface CacheConfig {
  staleTime: number;
  gcTime: number;
  retry?: number;
}

// Preset cache configurations
export const cachePresets = {
  // Static data that rarely changes
  static: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  } as CacheConfig,
  
  // Dynamic data that changes frequently
  dynamic: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  } as CacheConfig,
  
  // Real-time data with very short cache
  realtime: {
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 60 * 1000, // 1 minute
  } as CacheConfig,
  
  // User preferences (long-lived)
  preferences: {
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  } as CacheConfig,
};

// ============================================================================
// Optimized Query Hook
// ============================================================================

interface UseOptimizedQueryOptions<TData, TError = Error> 
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  cachePreset?: keyof typeof cachePresets;
  cacheKey: string;
  fetchFn: () => Promise<TData>;
  enabled?: boolean;
}

export function useOptimizedQuery<TData, TError = Error>({
  cachePreset = 'static',
  cacheKey,
  fetchFn,
  enabled = true,
  ...options
}: UseOptimizedQueryOptions<TData, TError>) {
  const config = cachePresets[cachePreset];
  
  return useQuery<TData, TError>({
    queryKey: [cacheKey],
    queryFn: fetchFn,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    retry: config.retry ?? 2,
    enabled,
    ...options,
  });
}

// ============================================================================
// Optimized Mutation Hook with Optimistic Updates
// ============================================================================

interface UseOptimisticMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  cacheKey: string;
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  onOptimisticUpdate?: (oldData: TData | undefined, variables: TVariables) => TData;
}

export function useOptimisticMutation<TData, TError = Error, TVariables = unknown, TContext = unknown>({
  mutationFn,
  cacheKey,
  onOptimisticUpdate,
  ...options
}: UseOptimisticMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    ...options,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [cacheKey] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>([cacheKey]);

      // Optimistically update
      if (onOptimisticUpdate && previousData !== undefined) {
        queryClient.setQueryData<TData>([cacheKey], (old) => 
          onOptimisticUpdate(old, variables)
        );
      }

      // Call custom onMutate if provided
      const context = await options.onMutate?.(variables);
      
      return { previousData, ...context } as TContext;
    },
    onError: (err, variables, context) => {
      // Rollback on error
      const ctx = context as { previousData?: TData } | undefined;
      if (ctx?.previousData !== undefined) {
        queryClient.setQueryData([cacheKey], ctx.previousData);
      }
      options.onError?.(err, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: [cacheKey] });
      options.onSettled?.(data, error, variables, context);
    },
  });
}

// ============================================================================
// Prefetch Hook
// ============================================================================

export function usePrefetch() {
  const queryClient = useQueryClient();

  return useCallback(<TData,>(
    cacheKey: string,
    fetchFn: () => Promise<TData>,
    options?: CacheConfig
  ) => {
    const config = options || cachePresets.static;
    
    queryClient.prefetchQuery({
      queryKey: [cacheKey],
      queryFn: fetchFn,
      staleTime: config.staleTime,
      gcTime: config.gcTime,
    });
  }, [queryClient]);
}

// ============================================================================
// Debounced Query Hook (for search/filter inputs)
// ============================================================================

interface UseDebouncedQueryOptions<TData, TError = Error> 
  extends UseOptimizedQueryOptions<TData, TError> {
  debounceMs?: number;
}

export function useDebouncedQuery<TData, TError = Error>({
  debounceMs = 300,
  ...options
}: UseDebouncedQueryOptions<TData, TError>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedEnabled, setDebouncedEnabled] = useState(options.enabled ?? true);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedEnabled(options.enabled ?? true);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [options.enabled, debounceMs]);

  return useOptimizedQuery<TData, TError>({
    ...options,
    enabled: debouncedEnabled,
  });
}

// ============================================================================
// Request Deduplication Hook
// ============================================================================

const pendingRequests = new Map<string, Promise<unknown>>();

export function useDeduplicatedRequest() {
  return useCallback(<T,>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // Return existing pending request if available
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key) as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
  }, []);
}

// ============================================================================
// Background Refresh Hook
// ============================================================================

export function useBackgroundRefresh(
  refreshFn: () => Promise<void>,
  intervalMs: number = 30000,
  enabled: boolean = true
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    // Only refresh when tab is visible
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        refreshFn();
      }
    }, intervalMs);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshFn, intervalMs, enabled]);
}

// Need to import useState for useDebouncedQuery
import { useState } from 'react';
