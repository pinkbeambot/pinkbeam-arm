'use client';

/**
 * useDashboardStats Hook
 * 
 * Fetches real-time dashboard statistics from the API:
 * - Active Agents count
 * - Tasks completed today
 * - Pending escalations count
 * 
 * Features:
 * - Uses API endpoint that properly sets tenant context
 * - Auto-refresh every 30 seconds
 * - Loading and error states
 * - Tenant-scoped data (via RLS on server)
 */

import * as React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export interface DashboardStats {
  activeAgents: number;
  tasksCompletedToday: number;
  pendingEscalations: number;
  avgResponseTime: string | null;
}

export interface UseDashboardStatsReturn {
  stats: DashboardStats;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const defaultStats: DashboardStats = {
  activeAgents: 0,
  tasksCompletedToday: 0,
  pendingEscalations: 0,
  avgResponseTime: null,
};

// Refresh interval in milliseconds (30 seconds)
const REFRESH_INTERVAL = 30000;

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = React.useState<DashboardStats>(defaultStats);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const { session } = useAuth();

  const fetchStats = React.useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch stats: ${response.status}`);
      }

      const { data } = await response.json();
      setStats({
        activeAgents: data.activeAgents || 0,
        tasksCompletedToday: data.tasksCompletedToday || 0,
        pendingEscalations: data.pendingEscalations || 0,
        avgResponseTime: data.avgResponseTime || null,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  // Initial fetch
  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh interval
  React.useEffect(() => {
    const intervalId = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
