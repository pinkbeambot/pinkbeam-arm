'use client';

/**
 * useRealtimeAgentStatus Hook
 * 
 * Subscribe to real-time agent status updates.
 * Useful for dashboards, agent lists, and status indicators.
 * 
 * @example
 * ```tsx
 * function AgentList() {
 *   const { agents, isConnected, error } = useRealtimeAgentStatus({
 *     tenantId: 'tenant-uuid',
 *   });
 * 
 *   return (
 *     <div>
 *       {agents.map(agent => (
 *         <AgentCard key={agent.id} agent={agent} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import type { Agent, AgentStatus } from '@/types';

export interface AgentStatusUpdate {
  id: string;
  status: AgentStatus;
  last_active_at?: string;
  status_reason?: string;
  updated_at: string;
}

export interface UseRealtimeAgentStatusOptions {
  /** Tenant ID for filtering */
  tenantId?: string;
  /** Initial agents data (optional) */
  initialAgents?: Agent[];
  /** Enable realtime updates (default: true) */
  enabled?: boolean;
  /** Called when an agent's status changes */
  onStatusChange?: (agentId: string, newStatus: AgentStatus, oldStatus: AgentStatus) => void;
}

export interface UseRealtimeAgentStatusReturn {
  /** Current agent list with live status updates */
  agents: Agent[];
  /** Whether realtime is connected */
  isConnected: boolean;
  /** Connection state */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  /** Connection error if any */
  error: Error | null;
  /** Refresh agent data from server */
  refetch: () => Promise<void>;
  /** Manually update an agent's status (optimistic) */
  updateAgentStatus: (agentId: string, status: Partial<AgentStatusUpdate>) => void;
}

export function useRealtimeAgentStatus(
  options: UseRealtimeAgentStatusOptions
): UseRealtimeAgentStatusReturn {
  const { tenantId, initialAgents = [], enabled = true, onStatusChange } = options;
  
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const supabase = createClient();
  const isMountedRef = useRef(true);

  // Fetch initial agent data
  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (isMountedRef.current) {
        setAgents(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  }, [tenantId, supabase]);

  // Handle realtime updates
  const handleUpdate = useCallback((
    newRecord: object | null,
    oldRecord: object | null
  ) => {
    if (!newRecord) return;

    const update = newRecord as unknown as AgentStatusUpdate;
    const oldUpdate = oldRecord as unknown as AgentStatusUpdate | null;

    setAgents(prevAgents => {
      const index = prevAgents.findIndex(a => a.id === update.id);
      if (index === -1) return prevAgents;

      const newAgents = [...prevAgents];
      const oldAgent = newAgents[index];
      
      newAgents[index] = {
        ...oldAgent,
        ...update,
      } as Agent;

      // Notify callback
      if (onStatusChange && oldUpdate && update.status !== oldUpdate.status) {
        onStatusChange(update.id, update.status, oldUpdate.status);
      }

      return newAgents;
    });
  }, [onStatusChange]);

  // Use core realtime hook for updates
  const {
    connectionState,
    error,
    isConnected,
  } = useRealtime({
    table: 'agents',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    events: ['UPDATE'],
    enabled,
    tenantId,
    onUpdate: handleUpdate,
  });

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    
    if (initialAgents.length === 0 && tenantId) {
      fetchAgents();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [initialAgents.length, tenantId, fetchAgents]);

  // Optimistic update helper
  const updateAgentStatus = useCallback((agentId: string, status: Partial<AgentStatusUpdate>) => {
    setAgents(prevAgents => {
      const index = prevAgents.findIndex(a => a.id === agentId);
      if (index === -1) return prevAgents;

      const newAgents = [...prevAgents];
      newAgents[index] = {
        ...newAgents[index],
        ...status,
        id: agentId,
      } as Agent;

      return newAgents;
    });
  }, []);

  return {
    agents,
    isConnected,
    connectionState,
    error,
    refetch: fetchAgents,
    updateAgentStatus,
  };
}

export default useRealtimeAgentStatus;
