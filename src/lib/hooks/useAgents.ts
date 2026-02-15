'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

import { ApiError } from '@/lib/errors';
import { useTenant } from '@/lib/hooks/useTenant';
import type { Agent, RealtimeChangePayload, CreateAgentInput } from '@/types';

const API_BASE = '/api/agents';
const REALTIME_DEBOUNCE_MS = 100;

type PendingChange<T> = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: RealtimeChangePayload<T>;
};

/**
 * Hook to subscribe to real-time agent changes via API
 * Uses server-side API routes that properly set tenant context for RLS
 * Falls back to realtime updates via Supabase subscriptions
 * 
 * Realtime updates are batched in 100ms windows to prevent excessive re-renders
 * when multiple changes arrive rapidly.
 */
export function useAgentsRealtime(tenantId: string | null) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { session, user } = useAuth();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Refs for debouncing realtime updates
  const pendingChangesRef = useRef<PendingChange<Agent>[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch agents via API route (properly handles auth and RLS)
  const fetchAgents = useCallback(async () => {
    if (!tenantId || !session?.access_token) {
      setAgents([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}?limit=100`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, 'AGENT_FETCH_FAILED', errorData.error || `Failed to fetch agents: ${response.status}`);
      }

      const result = await response.json();
      setAgents(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(err instanceof ApiError ? err : new Error(errorMessage));
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, session?.access_token]);

  // Flush pending changes after debounce period
  const flushPendingChanges = useCallback(() => {
    if (pendingChangesRef.current.length === 0) return;
    
    const changes = [...pendingChangesRef.current];
    pendingChangesRef.current = [];
    
    setAgents((current: Agent[]) => {
      let result: Agent[] = current;
      
      for (const change of changes) {
        const payload = change.payload;
        
        if (payload.eventType === 'INSERT') {
          const newAgent = payload.new;
          if (newAgent) {
            // Check if already exists (avoid duplicates from rapid updates)
            const exists = result.some(agent => agent.id === newAgent.id);
            if (!exists) {
              result = [newAgent, ...result];
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedAgent = payload.new;
          if (updatedAgent) {
            result = result.map(agent => 
              agent.id === updatedAgent.id ? updatedAgent : agent
            );
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedAgent = payload.old;
          if (deletedAgent) {
            result = result.filter(agent => agent.id !== deletedAgent.id);
          }
        }
      }
      
      return result;
    });
  }, []);

  // Set up real-time subscription for live updates
  useEffect(() => {
    if (!tenantId || !user?.id) {
      setAgents([]);
      setLoading(false);
      return;
    }

    // Fetch initial data via API
    fetchAgents();

    // Subscribe to realtime changes with debouncing
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
        (payload: RealtimeChangePayload<Agent>) => {
          // Queue the change
          pendingChangesRef.current.push({
            type: payload.eventType,
            payload,
          });
          
          // Clear existing timer and set new one
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          
          debounceTimerRef.current = setTimeout(() => {
            flushPendingChanges();
          }, REALTIME_DEBOUNCE_MS);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      // Flush any pending changes before cleanup
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      flushPendingChanges();
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, user?.id, supabase, fetchAgents, flushPendingChanges]);

  return { agents, loading, error, refetch: fetchAgents };
}

/**
 * Hook to fetch and subscribe to a single agent
 */
export function useAgentRealtime(agentId: string | null, tenantId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!agentId || !tenantId || !session?.access_token) {
      setAgent(null);
      setLoading(false);
      return;
    }

    const fetchAgent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/${agentId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(response.status, 'AGENT_FETCH_FAILED', errorData.error || `Failed to fetch agent: ${response.status}`);
        }

        const result = await response.json();
        setAgent(result.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent';
        setError(err instanceof ApiError ? err : new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`agent:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${agentId}`,
        },
        (payload: RealtimeChangePayload<Agent>) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setAgent(current => ({ ...current!, ...payload.new }));
          } else if (payload.eventType === 'DELETE') {
            setAgent(null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, tenantId, session?.access_token, supabase]);

  return { agent, loading, error };
}

/**
 * Hook to create a new agent via API
 */
export function useCreateAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  const createAgent = useCallback(async (agentData: Partial<CreateAgentInput> & { tenant_id: string }) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, 'AGENT_CREATE_FAILED', errorData.error || `Failed to create agent: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const error = err instanceof ApiError ? err : new Error('Failed to create agent');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  return { createAgent, loading, error };
}

/**
 * Hook to update an agent via API
 */
export function useUpdateAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  const updateAgent = useCallback(async (agentId: string, updates: Partial<Agent>) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, 'AGENT_UPDATE_FAILED', errorData.error || `Failed to update agent: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const error = err instanceof ApiError ? err : new Error('Failed to update agent');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  return { updateAgent, loading, error };
}

/**
 * Hook to delete an agent via API
 */
export function useDeleteAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  const deleteAgent = useCallback(async (agentId: string) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, 'AGENT_DELETE_FAILED', errorData.error || `Failed to delete agent: ${response.status}`);
      }
    } catch (err) {
      const error = err instanceof ApiError ? err : new Error('Failed to delete agent');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  return { deleteAgent, loading, error };
}

/**
 * Convenience hook for fetching all agents
 * Uses useTenant() to get the real tenant ID from auth context
 */
export function useAgents() {
  const { tenantId } = useTenant();
  const { agents, loading, error, refetch } = useAgentsRealtime(tenantId);
  return { agents, isLoading: loading, error, refetch };
}
