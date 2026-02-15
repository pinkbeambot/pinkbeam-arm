'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Agent, RealtimeChangePayload, CreateAgentInput } from '@/types';

const API_BASE = '/api/agents';

/**
 * Hook to subscribe to real-time agent changes via API
 * Uses server-side API routes that properly set tenant context for RLS
 * Falls back to realtime updates via Supabase subscriptions
 */
export function useAgentsRealtime(tenantId: string | null) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { session, user } = useAuth();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
        throw new Error(errorData.error || `Failed to fetch agents: ${response.status}`);
      }

      const result = await response.json();
      setAgents(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(new Error(errorMessage));
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, session?.access_token]);

  // Set up real-time subscription for live updates
  useEffect(() => {
    if (!tenantId || !user?.id) {
      setAgents([]);
      setLoading(false);
      return;
    }

    // Fetch initial data via API
    fetchAgents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`agents:${tenantId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: RealtimeChangePayload<Agent>) => {
          setAgents(current => {
            if (payload.eventType === 'INSERT') {
              return payload.new ? [payload.new, ...current] : current;
            } else if (payload.eventType === 'UPDATE') {
              return current.map(agent => 
                agent.id === payload.new?.id ? payload.new : agent
              );
            } else if (payload.eventType === 'DELETE') {
              return current.filter(agent => agent.id !== payload.old?.id);
            }
            return current;
          });
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
  }, [tenantId, user?.id, supabase, fetchAgents]);

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
          throw new Error(errorData.error || `Failed to fetch agent: ${response.status}`);
        }

        const result = await response.json();
        setAgent(result.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent';
        setError(new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`agent:${agentId}`)
      .on(
        'postgres_changes' as any,
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
        throw new Error(errorData.error || `Failed to create agent: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create agent');
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
        throw new Error(errorData.error || `Failed to update agent: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update agent');
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
        throw new Error(errorData.error || `Failed to delete agent: ${response.status}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete agent');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  return { deleteAgent, loading, error };
}

// Demo tenant ID - in production, this comes from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Convenience hook for fetching all agents
 * Uses the demo tenant ID for development
 */
export function useAgents() {
  const { agents, loading, error, refetch } = useAgentsRealtime(DEMO_TENANT_ID);
  return { agents, isLoading: loading, error, refetch };
}
