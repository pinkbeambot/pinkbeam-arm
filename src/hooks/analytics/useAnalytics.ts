/**
 * Analytics Hooks
 * 
 * React Query hooks for fetching analytics data.
 */

'use client';

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type {
  DateRange,
  AgentPerformanceResponse,
  TaskPipelineResponse,
  DecisionAnalyticsResponse,
  CostAnalyticsResponse,
  ActivityTimelineResponse,
  AnalyticsQueryParams,
} from '@/types/analytics';

export const analyticsKeys = {
  all: ['analytics'] as const,
  agents: (params: AnalyticsQueryParams) => [...analyticsKeys.all, 'agents', params] as const,
  tasks: (params: AnalyticsQueryParams) => [...analyticsKeys.all, 'tasks', params] as const,
  decisions: (params: AnalyticsQueryParams) => [...analyticsKeys.all, 'decisions', params] as const,
  costs: (params: AnalyticsQueryParams) => [...analyticsKeys.all, 'costs', params] as const,
  activities: (params: AnalyticsQueryParams) => [...analyticsKeys.all, 'activities', params] as const,
};

function buildQueryParams(dateRange: DateRange, filters?: { agentIds?: string[]; categories?: string[] }): AnalyticsQueryParams {
  return {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
    agentIds: filters?.agentIds,
    categories: filters?.categories,
  };
}

function buildQueryString(params: AnalyticsQueryParams): string {
  const queryParts: string[] = [
    `from=${encodeURIComponent(params.from)}`,
    `to=${encodeURIComponent(params.to)}`,
  ];
  
  if (params.agentIds?.length) {
    queryParts.push(`agentIds=${encodeURIComponent(params.agentIds.join(','))}`);
  }
  
  if (params.categories?.length) {
    queryParts.push(`categories=${encodeURIComponent(params.categories.join(','))}`);
  }
  
  if (params.limit !== undefined) {
    queryParts.push(`limit=${params.limit}`);
  }
  
  if (params.offset !== undefined) {
    queryParts.push(`offset=${params.offset}`);
  }
  
  return queryParts.join('&');
}

export function useAgentPerformance(
  dateRange: DateRange,
  filters?: { agentIds?: string[] },
  options?: Omit<UseQueryOptions<AgentPerformanceResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const params = buildQueryParams(dateRange, filters);
  
  return useQuery({
    queryKey: analyticsKeys.agents(params),
    queryFn: async () => {
      const response = await fetch(`/api/analytics/agents?${buildQueryString(params)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch agent analytics');
      }
      const result = await response.json();
      return result.data as AgentPerformanceResponse;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTaskPipeline(
  dateRange: DateRange,
  options?: Omit<UseQueryOptions<TaskPipelineResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const params = buildQueryParams(dateRange);
  
  return useQuery({
    queryKey: analyticsKeys.tasks(params),
    queryFn: async () => {
      const response = await fetch(`/api/analytics/tasks?${buildQueryString(params)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch task analytics');
      }
      const result = await response.json();
      return result.data as TaskPipelineResponse;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useDecisionAnalytics(
  dateRange: DateRange,
  filters?: { categories?: string[] },
  options?: Omit<UseQueryOptions<DecisionAnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const params = buildQueryParams(dateRange, filters);
  
  return useQuery({
    queryKey: analyticsKeys.decisions(params),
    queryFn: async () => {
      const response = await fetch(`/api/analytics/decisions?${buildQueryString(params)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch decision analytics');
      }
      const result = await response.json();
      return result.data as DecisionAnalyticsResponse;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCostAnalytics(
  dateRange: DateRange,
  filters?: { agentIds?: string[] },
  options?: Omit<UseQueryOptions<CostAnalyticsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const params = buildQueryParams(dateRange, filters);
  
  return useQuery({
    queryKey: analyticsKeys.costs(params),
    queryFn: async () => {
      const response = await fetch(`/api/analytics/costs?${buildQueryString(params)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch cost analytics');
      }
      const result = await response.json();
      return result.data as CostAnalyticsResponse;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export interface ActivityTimelineOptions {
  limit?: number;
  offset?: number;
}

export function useActivityTimeline(
  dateRange: DateRange,
  filters?: { agentIds?: string[]; categories?: string[] },
  timelineOptions?: ActivityTimelineOptions,
  options?: Omit<UseQueryOptions<ActivityTimelineResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const params: AnalyticsQueryParams = {
    ...buildQueryParams(dateRange, filters),
    limit: timelineOptions?.limit ?? 50,
    offset: timelineOptions?.offset ?? 0,
  };
  
  return useQuery({
    queryKey: analyticsKeys.activities(params),
    queryFn: async () => {
      const response = await fetch(`/api/analytics/activities?${buildQueryString(params)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch activity analytics');
      }
      const result = await response.json();
      return result.data as ActivityTimelineResponse;
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useRefreshAnalytics() {
  const queryClient = useQueryClient();
  
  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
    refreshAgents: () => {
      queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'agents'] });
    },
    refreshTasks: () => {
      queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'tasks'] });
    },
    refreshDecisions: () => {
      queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'decisions'] });
    },
    refreshCosts: () => {
      queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'costs'] });
    },
    refreshActivities: () => {
      queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'activities'] });
    },
  };
}
