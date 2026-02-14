"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Agent, AgentStatus, RealtimeChangePayload } from "@/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface UseAgentStatusOptions {
  agentId: string;
  initialStatus?: AgentStatus;
  onStatusChange?: (newStatus: AgentStatus, oldStatus: AgentStatus) => void;
  onError?: (error: Error) => void;
}

export interface UseAgentStatusReturn {
  status: AgentStatus;
  isLoading: boolean;
  error: Error | null;
  lastActiveAt: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for subscribing to real-time agent status updates via Supabase
 * 
 * Features:
 * - Real-time status updates via Supabase Realtime
 * - Automatic cleanup on unmount
 * - Error handling with retry
 * - Last active timestamp tracking
 * 
 * @example
 * ```tsx
 * function AgentCard({ agentId }: { agentId: string }) {
 *   const { status, isLoading, error, lastActiveAt } = useAgentStatus({
 *     agentId,
 *     onStatusChange: (newStatus, oldStatus) => {
 *       console.log(`Agent ${agentId}: ${oldStatus} → ${newStatus}`);
 *     },
 *   });
 * 
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 * 
 *   return (
 *     <div>
 *       <AgentStatusBadge status={status} />
 *       <AgentActivityPulse status={status} lastActiveAt={lastActiveAt} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentStatus({
  agentId,
  initialStatus = "idle",
  onStatusChange,
  onError,
}: UseAgentStatusOptions): UseAgentStatusReturn {
  const [status, setStatus] = useState<AgentStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);
  
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    supabaseRef.current = createClient();
    return () => {
      supabaseRef.current = null;
    };
  }, []);

  // Fetch initial status
  const fetchStatus = useCallback(async () => {
    if (!supabaseRef.current || !agentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabaseRef.current
        .from("agents")
        .select("status, last_active_at")
        .eq("id", agentId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        setStatus(data.status as AgentStatus);
        setLastActiveAt(data.last_active_at || null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch agent status");
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, onError]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!supabaseRef.current || !agentId) return;

    const supabase = supabaseRef.current;

    // Create a unique channel name for this agent
    const channelName = `agent-status-${agentId}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agents",
          filter: `id=eq.${agentId}`,
        },
        (payload: RealtimePostgresChangesPayload<Agent>) => {
          const newRecord = payload.new as Agent;
          const oldRecord = payload.old as Agent;
          
          if (newRecord?.status && newRecord.status !== oldRecord?.status) {
            const oldStatus = status;
            const newStatus = newRecord.status;
            
            setStatus(newStatus);
            setLastActiveAt(newRecord.last_active_at || null);
            onStatusChange?.(newStatus, oldStatus);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          const error = new Error(`Realtime subscription error: ${err.message}`);
          setError(error);
          onError?.(error);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, onStatusChange, onError, status]);

  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    error,
    lastActiveAt,
    refresh,
  };
}

/**
 * Hook for monitoring multiple agents' status
 * 
 * @example
 * ```tsx
 * function AgentRoster({ agentIds }: { agentIds: string[] }) {
 *   const { statuses, isLoading } = useAgentsStatus(agentIds);
 *   
 *   return (
 *     <div>
 *       {agentIds.map(id => (
 *         <AgentStatusDot key={id} status={statuses[id]} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentsStatus(
  agentIds: string[],
  options?: {
    onStatusChange?: (agentId: string, newStatus: AgentStatus, oldStatus: AgentStatus) => void;
    onError?: (error: Error) => void;
  }
): {
  statuses: Record<string, AgentStatus>;
  isLoading: boolean;
  error: Error | null;
} {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    supabaseRef.current = createClient();
    return () => {
      supabaseRef.current = null;
    };
  }, []);

  // Fetch initial statuses
  useEffect(() => {
    if (!supabaseRef.current || agentIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchStatuses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabaseRef.current!
          .from("agents")
          .select("id, status")
          .in("id", agentIds);

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const statusMap: Record<string, AgentStatus> = {};
        data?.forEach((agent: { id: string; status: AgentStatus }) => {
          statusMap[agent.id] = agent.status;
        });
        
        setStatuses(statusMap);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch agent statuses");
        setError(error);
        options?.onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatuses();
  }, [agentIds, options?.onError]);

  // Subscribe to updates for all agents
  useEffect(() => {
    if (!supabaseRef.current || agentIds.length === 0) return;

    const supabase = supabaseRef.current;
    const channelName = `agents-status-${agentIds.join("-")}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agents",
          filter: `id=in.(${agentIds.join(",")})`,
        },
        (payload: RealtimePostgresChangesPayload<Agent>) => {
          const newRecord = payload.new as Agent;
          const oldRecord = payload.old as Agent;
          
          if (newRecord?.id && newRecord?.status) {
            const agentId = newRecord.id;
            const oldStatus = statuses[agentId];
            const newStatus = newRecord.status;
            
            if (oldStatus !== newStatus) {
              setStatuses(prev => ({
                ...prev,
                [agentId]: newStatus,
              }));
              options?.onStatusChange?.(agentId, newStatus, oldStatus);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          const error = new Error(`Realtime subscription error: ${err.message}`);
          setError(error);
          options?.onError?.(error);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentIds, options?.onStatusChange, options?.onError, statuses]);

  return {
    statuses,
    isLoading,
    error,
  };
}

export default useAgentStatus;
