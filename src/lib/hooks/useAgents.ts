'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Agent, RealtimeChangePayload } from '@/types';

/**
 * Hook to subscribe to real-time agent changes
 * @param tenantId - The tenant ID to subscribe to
 * @returns Object with agents array, loading state, and error
 */
export function useAgentsRealtime(tenantId: string | null) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initial fetch of agents
  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('agents')
        .select(`
          *,
          current_task:tasks(id, title, status)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAgents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  // Set up real-time subscription
  useEffect(() => {
    if (!tenantId) {
      setAgents([]);
      setLoading(false);
      return;
    }

    // Fetch initial data
    fetchAgents();

    // Subscribe to changes
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
        (payload: unknown) => {
          const typedPayload = payload as RealtimeChangePayload<Agent>;
          setAgents(current => {
            if (typedPayload.eventType === 'INSERT') {
              // Add new agent at the beginning
              return typedPayload.new ? [typedPayload.new, ...current] : current;
            } else if (typedPayload.eventType === 'UPDATE') {
              // Update existing agent
              return current.map(agent => 
                agent.id === typedPayload.new?.id ? typedPayload.new : agent
              );
            } else if (typedPayload.eventType === 'DELETE') {
              // Remove deleted agent
              return current.filter(agent => agent.id !== typedPayload.old?.id);
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
  }, [tenantId, supabase, fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

/**
 * Hook to fetch and subscribe to a single agent
 */
export function useAgentRealtime(agentId: string | null, tenantId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!agentId || !tenantId) {
      setAgent(null);
      setLoading(false);
      return;
    }

    const fetchAgent = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('agents')
          .select(`
            *,
            current_task:tasks(id, title, status)
          `)
          .eq('id', agentId)
          .eq('tenant_id', tenantId)
          .single();

        if (fetchError) throw fetchError;
        setAgent(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch agent'));
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();

    // Subscribe to changes
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
        (payload: unknown) => {
          const typedPayload = payload as RealtimeChangePayload<Agent>;
          if (typedPayload.eventType === 'UPDATE' && typedPayload.new) {
            setAgent(current => ({ ...current!, ...typedPayload.new }));
          } else if (typedPayload.eventType === 'DELETE') {
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
  }, [agentId, tenantId, supabase]);

  return { agent, loading, error };
}

/**
 * Hook to create a new agent
 */
export function useCreateAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const createAgent = useCallback(async (agentData: Partial<Agent>) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: createError } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single();

      if (createError) throw createError;
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create agent');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { createAgent, loading, error };
}

/**
 * Hook to update an agent
 */
export function useUpdateAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const updateAgent = useCallback(async (agentId: string, updates: Partial<Agent>) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', agentId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update agent');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { updateAgent, loading, error };
}

/**
 * Hook to delete an agent
 */
export function useDeleteAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (deleteError) throw deleteError;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete agent');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { deleteAgent, loading, error };
}

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Convenience hook for fetching all agents
 * Uses the demo tenant ID for now
 */
export function useAgents() {
  const { agents, loading, error, refetch } = useAgentsRealtime(DEMO_TENANT_ID);
  return { agents, isLoading: loading, error, refetch };
}
