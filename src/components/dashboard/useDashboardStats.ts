'use client';

/**
 * useDashboardStats Hook
 * 
 * Fetches real-time dashboard statistics from Supabase:
 * - Active Agents count
 * - Tasks completed today
 * - Pending escalations count
 * 
 * Features:
 * - Real-time data fetching
 * - Auto-refresh every 30 seconds
 * - Loading and error states
 * - Tenant-scoped data (via RLS)
 */

import * as React from 'react';
import { supabaseClient } from '@/lib/supabase';

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

  const fetchStats = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current time bounds for "today"
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Fetch all stats in parallel
      const [
        { count: activeAgentsCount, error: agentsError },
        { count: tasksCount, error: tasksError },
        { count: escalationsCount, error: escalationsError },
      ] = await Promise.all([
        // Active agents (status = active, idle, or initializing)
        supabaseClient
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .in('status', ['active', 'idle', 'initializing']),
        
        // Tasks completed today
        supabaseClient
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('updated_at', startOfDay)
          .lt('updated_at', endOfDay),
        
        // Pending escalations (status = open or in_progress)
        supabaseClient
          .from('escalations')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
      ]);

      // Check for errors
      if (agentsError) throw new Error(`Failed to fetch agents: ${agentsError.message}`);
      if (tasksError) throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
      if (escalationsError) throw new Error(`Failed to fetch escalations: ${escalationsError.message}`);

      setStats({
        activeAgents: activeAgentsCount || 0,
        tasksCompletedToday: tasksCount || 0,
        pendingEscalations: escalationsCount || 0,
        avgResponseTime: null, // Will be implemented when we have metrics data
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
