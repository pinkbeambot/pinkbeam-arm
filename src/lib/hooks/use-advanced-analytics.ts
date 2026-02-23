/**
 * Advanced Analytics Hooks
 * React hooks for ML-powered analytics features
 */

import * as React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { 
  PredictiveAnalyticsResponse,
  ActivityHeatmapData,
  NLQueryResult,
  AutomatedInsight,
  SmartAlert,
  RealtimeMetrics,
  AgentStatusUpdate
} from '@/types/advanced-analytics';
import type { DateRange } from '@/types/analytics';

interface UsePredictionsResult {
  data: PredictiveAnalyticsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseHeatmapResult {
  data: ActivityHeatmapData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseNLQueryResult {
  data: NLQueryResult | null;
  isLoading: boolean;
  error: Error | null;
  executeQuery: (query: string) => Promise<NLQueryResult | undefined>;
}

interface UseInsightsResult {
  insights: AutomatedInsight[];
  alerts: SmartAlert[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
}

interface UseRealtimeMetricsResult {
  data: RealtimeMetrics | null;
  agentUpdates: AgentStatusUpdate[];
  isLoading: boolean;
  error: Error | null;
}

// Convert API date range to days
function dateRangeToDays(dateRange: DateRange): number {
  const diffTime = dateRange.to.getTime() - dateRange.from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Fetch wrapper with auth
async function fetchWithAuth(url: string, token: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Hook for fetching predictive analytics (ML predictions, forecasts, anomalies)
 */
export function usePredictions(dateRange: DateRange, forecastDays: number = 7): UsePredictionsResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = React.useState<PredictiveAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const days = dateRangeToDays(dateRange);

  const fetchData = React.useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/analytics/predictions?days=${days}&forecastDays=${forecastDays}`,
        accessToken
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch predictions: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, days, forecastDays]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching heatmap data
 */
export function useHeatmap(
  type: 'hourly' | 'daily' | 'weekly' = 'hourly',
  dateRange: DateRange,
  metric: 'tasks' | 'cost' | 'activity' = 'activity'
): UseHeatmapResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = React.useState<ActivityHeatmapData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const days = dateRangeToDays(dateRange);

  const fetchData = React.useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/analytics/heatmap?type=${type}&metric=${metric}&days=${days}`,
        accessToken
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch heatmap: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, type, metric, days]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for natural language queries
 */
export function useNLQuery(dateRange: DateRange): UseNLQueryResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = React.useState<NLQueryResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const days = dateRangeToDays(dateRange);

  const executeQuery = React.useCallback(async (query: string): Promise<NLQueryResult | undefined> => {
    if (!accessToken || !query.trim()) return undefined;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/analytics/nlquery', accessToken, {
        method: 'POST',
        body: JSON.stringify({ query, days }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to execute query: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
      return result.data as NLQueryResult;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, days]);

  return { data, isLoading, error, executeQuery };
}

/**
 * Hook for fetching automated insights and alerts
 */
export function useInsights(dateRange: DateRange): UseInsightsResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [insights, setInsights] = React.useState<AutomatedInsight[]>([]);
  const [alerts, setAlerts] = React.useState<SmartAlert[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const days = dateRangeToDays(dateRange);

  const fetchData = React.useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/analytics/insights?days=${days}`,
        accessToken
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch insights: ${response.status}`);
      }

      const result = await response.json();
      setInsights(result.data.insights || []);
      setAlerts(result.data.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, days]);

  const acknowledgeAlert = React.useCallback(async (alertId: string) => {
    if (!accessToken) return;

    try {
      const response = await fetchWithAuth('/api/analytics/insights', accessToken, {
        method: 'POST',
        body: JSON.stringify({ alertId }),
      });

      if (!response.ok) {
        console.error('Failed to acknowledge alert:', await response.text());
      } else {
        // Update local state
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  }, [accessToken]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { insights, alerts, isLoading, error, refetch: fetchData, acknowledgeAlert };
}

/**
 * Hook for real-time metrics with polling
 */
export function useRealtimeMetrics(pollInterval: number = 30000): UseRealtimeMetricsResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = React.useState<RealtimeMetrics | null>(null);
  const [agentUpdates, setAgentUpdates] = React.useState<AgentStatusUpdate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/analytics/realtime', accessToken);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch realtime metrics: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
      // Agent updates would come from a separate endpoint or realtime subscription
      setAgentUpdates([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    fetchData();
    
    // Set up polling
    const intervalId = setInterval(fetchData, pollInterval);
    
    return () => clearInterval(intervalId);
  }, [fetchData, pollInterval]);

  return { data, agentUpdates, isLoading, error };
}

// Re-export types
export type {
  UsePredictionsResult,
  UseHeatmapResult,
  UseNLQueryResult,
  UseInsightsResult,
  UseRealtimeMetricsResult,
};
