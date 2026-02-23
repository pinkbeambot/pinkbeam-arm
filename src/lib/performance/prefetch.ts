/**
 * Data Prefetching Utilities
 * 
 * Preloads common data on page load to improve perceived performance.
 */

import { QueryClient } from '@tanstack/react-query';

// Global query client for prefetching
let queryClient: QueryClient | null = null;

export function setPrefetchQueryClient(client: QueryClient) {
  queryClient = client;
}

export function getPrefetchQueryClient(): QueryClient | null {
  return queryClient;
}

// Common data keys
export const PREFETCH_KEYS = {
  USER_PROFILE: 'user-profile',
  TENANT_INFO: 'tenant-info',
  AGENTS_LIST: 'agents-list',
  RECENT_TASKS: 'recent-tasks',
  ACTIVITIES: 'activities',
  NOTIFICATIONS: 'notifications',
  ANALYTICS_OVERVIEW: 'analytics-overview',
} as const;

// Prefetch priorities
export const PREFETCH_PRIORITY = {
  CRITICAL: 'critical', // Prefetch immediately
  HIGH: 'high',         // Prefetch after critical
  MEDIUM: 'medium',     // Prefetch when idle
  LOW: 'low',           // Prefetch on hover/focus
} as const;

type PrefetchPriority = typeof PREFETCH_PRIORITY[keyof typeof PREFETCH_PRIORITY];

interface PrefetchTask {
  key: string;
  fetchFn: () => Promise<unknown>;
  priority: PrefetchPriority;
  staleTime?: number;
}

const prefetchQueue: PrefetchTask[] = [];
let isProcessingQueue = false;

/**
 * Add a prefetch task to the queue
 */
export function queuePrefetch(
  key: string,
  fetchFn: () => Promise<unknown>,
  priority: PrefetchPriority = PREFETCH_PRIORITY.MEDIUM,
  staleTime: number = 5 * 60 * 1000
) {
  prefetchQueue.push({ key, fetchFn, priority, staleTime });
  processPrefetchQueue();
}

/**
 * Process the prefetch queue based on priority
 */
async function processPrefetchQueue() {
  if (isProcessingQueue || !queryClient) return;
  
  isProcessingQueue = true;

  // Sort by priority
  const priorityOrder = {
    [PREFETCH_PRIORITY.CRITICAL]: 0,
    [PREFETCH_PRIORITY.HIGH]: 1,
    [PREFETCH_PRIORITY.MEDIUM]: 2,
    [PREFETCH_PRIORITY.LOW]: 3,
  };

  prefetchQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Process critical and high priority immediately
  while (prefetchQueue.length > 0) {
    const task = prefetchQueue[0];
    
    // Wait for idle time for medium/low priority
    if (task.priority === PREFETCH_PRIORITY.MEDIUM || task.priority === PREFETCH_PRIORITY.LOW) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        await new Promise<void>(resolve => {
          requestIdleCallback(() => resolve(), { timeout: 2000 });
        });
      } else {
        // Fallback: wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const currentTask = prefetchQueue.shift();
    if (!currentTask) continue;

    try {
      await queryClient.prefetchQuery({
        queryKey: [currentTask.key],
        queryFn: currentTask.fetchFn,
        staleTime: currentTask.staleTime,
      });
    } catch (error) {
      // Silently fail - prefetching is best-effort
      console.debug(`Prefetch failed for ${currentTask.key}:`, error);
    }
  }

  isProcessingQueue = false;
}

/**
 * Prefetch on link hover
 */
export function prefetchOnHover(
  element: HTMLElement,
  key: string,
  fetchFn: () => Promise<unknown>
) {
  const handleMouseEnter = () => {
    queuePrefetch(key, fetchFn, PREFETCH_PRIORITY.LOW);
  };

  element.addEventListener('mouseenter', handleMouseEnter);
  
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
  };
}

/**
 * Prefetch critical data on app load
 */
export function prefetchCriticalData(tenantId: string, accessToken: string) {
  if (!queryClient) return;

  // Critical: User and tenant info
  queuePrefetch(
    PREFETCH_KEYS.USER_PROFILE,
    () => fetchUserProfile(accessToken),
    PREFETCH_PRIORITY.CRITICAL
  );

  queuePrefetch(
    PREFETCH_KEYS.TENANT_INFO,
    () => fetchTenantInfo(accessToken),
    PREFETCH_PRIORITY.CRITICAL
  );

  // High: Commonly accessed data
  queuePrefetch(
    PREFETCH_KEYS.AGENTS_LIST,
    () => fetchAgentsList(accessToken),
    PREFETCH_PRIORITY.HIGH
  );

  queuePrefetch(
    PREFETCH_KEYS.RECENT_TASKS,
    () => fetchRecentTasks(accessToken),
    PREFETCH_PRIORITY.HIGH
  );
}

// Fetch functions (implement based on your API)
async function fetchUserProfile(accessToken: string) {
  const response = await fetch('/api/user/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return response.json();
}

async function fetchTenantInfo(accessToken: string) {
  const response = await fetch('/api/tenant', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch tenant info');
  return response.json();
}

async function fetchAgentsList(accessToken: string) {
  const response = await fetch('/api/agents?limit=20', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch agents');
  return response.json();
}

async function fetchRecentTasks(accessToken: string) {
  const response = await fetch('/api/tasks?limit=10&status=in_progress', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

/**
 * Resource hints for preloading critical assets
 */
export function addResourceHints() {
  if (typeof window === 'undefined') return;

  // Preconnect to critical origins
  const preconnectUrls = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ].filter(Boolean);

  preconnectUrls.forEach(url => {
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // DNS prefetch fallback
    const dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = url;
    document.head.appendChild(dnsLink);
  });
}
