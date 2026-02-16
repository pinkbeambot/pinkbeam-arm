'use client';

/**
 * useAgents Hook
 * 
 * React Query-style hook for fetching and managing agents data.
 * Connects to /api/agents endpoint.
 * 
 * Features:
 * - Fetch agents with filtering and pagination
 * - Loading and error states with retry
 * - Real-time updates via Supabase
 * - Optimistic updates for mutations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTenant } from '@/lib/hooks';
import { apiFetch } from './fetch';
import type { Agent, AgentStatus, AgentRole } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface AgentsApiResponse {
  data: Agent[];
  count: number;
  limit: number;
  offset: number;
}

export interface UseAgentsOptions {
  status?: AgentStatus;
  role?: AgentRole;
  search?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export interface UseAgentsReturn {
  agents: Agent[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  count: number;
  refetch: () => Promise<void>;
  retry: () => void;
}

// ============================================================================
// Helper: Fetch Agents
// ============================================================================

async function fetchAgents(
  options: UseAgentsOptions = {}
): Promise<AgentsApiResponse> {
  const params = new URLSearchParams();
  
  if (options.status) params.set('status', options.status);
  if (options.role) params.set('role', options.role);
  if (options.search) params.set('search', options.search);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset?.toString() || '0');

  const response = await apiFetch(`/api/agents?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch agents: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// useAgents Hook
// ============================================================================

export function useAgents(options: UseAgentsOptions = {}): UseAgentsReturn {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const supabase = createClient();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [count, setCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch agents
  const fetchData = useCallback(async () => {
    if (!tenantId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsFetching(true);
      setError(null);

      const result = await fetchAgents(options);
      setAgents(result.data);
      setCount(result.count);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [tenantId, user?.id, options.status, options.role, options.search, options.limit, options.offset]);

  // Initial fetch
  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options.enabled, retryCount]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantId || !user?.id || options.enabled === false) return;

    const channel = supabase
      .channel(`agents:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // Handle real-time updates
          if (payload.eventType === 'INSERT') {
            const newAgent = payload.new as Agent;
            setAgents((prev) => {
              // Check if already exists
              if (prev.some(a => a.id === newAgent.id)) return prev;
              return [newAgent, ...prev];
            });
            setCount((c) => c + 1);
          } else if (payload.eventType === 'UPDATE') {
            const updatedAgent = payload.new as Agent;
            setAgents((prev) =>
              prev.map((agent) =>
                agent.id === updatedAgent.id ? { ...agent, ...updatedAgent } : agent
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedAgent = payload.old as Agent;
            setAgents((prev) => prev.filter((agent) => agent.id !== deletedAgent.id));
            setCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tenantId, user?.id, supabase, options.enabled]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return {
    agents,
    isLoading,
    isFetching,
    error,
    count,
    refetch,
    retry,
  };
}

// ============================================================================
// useAgent Hook (Single Agent)
// ============================================================================

export interface UseAgentReturn {
  agent: Agent | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  retry: () => void;
}

export function useAgent(agentId: string | null): UseAgentReturn {
  const { tenantId } = useTenant();
  const supabase = createClient();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!agentId || !tenantId) {
      setAgent(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiFetch(`/api/agents/${agentId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch agent: ${response.status}`);
      }

      const result = await response.json();
      setAgent(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agent'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  // Real-time subscription for single agent
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`agent:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${agentId}`,
        },
        (payload) => {
          const updatedAgent = payload.new as Agent;
          setAgent((current) => (current ? { ...current, ...updatedAgent } : updatedAgent));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, supabase]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return {
    agent,
    isLoading,
    error,
    refetch,
    retry,
  };
}

export default useAgents;
