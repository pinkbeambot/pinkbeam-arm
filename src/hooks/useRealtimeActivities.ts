"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Activity } from "@/types";

interface UseRealtimeActivitiesOptions {
  agentId?: string;
  type?: string;
  enabled?: boolean;
}

interface UseRealtimeActivitiesReturn {
  activities: Activity[];
  connectionStatus: "connected" | "disconnected" | "connecting" | "error";
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for subscribing to real-time activities
 * 
 * @example
 * ```tsx
 * const { activities, connectionStatus, refresh } = useRealtimeActivities({
 *   agentId: "agent-123",
 *   enabled: true,
 * });
 * ```
 */
export function useRealtimeActivities(
  options: UseRealtimeActivitiesOptions = {}
): UseRealtimeActivitiesReturn {
  const { agentId, type, enabled = true } = options;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting" | "error"
  >("disconnected");
  const [error, setError] = useState<Error | null>(null);
  
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY_MS = 3000;

  // Fetch initial activities
  const refresh = useCallback(async () => {
    try {
      let query = supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setActivities(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch activities"));
    }
  }, [supabase, agentId, type]);

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled) {
      setConnectionStatus("disconnected");
      return;
    }

    setConnectionStatus("connecting");
    reconnectAttemptsRef.current = 0;

    const setupSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      const channel = supabase
        .channel("activities-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activities",
            filter: agentId ? `agent_id=eq.${agentId}` : undefined,
          },
          (payload) => {
            const newActivity = payload.new as Activity;
            setActivities((prev) => {
              // Avoid duplicates
              if (prev.some((a) => a.id === newActivity.id)) {
                return prev;
              }
              return [newActivity, ...prev].slice(0, 100); // Keep last 100
            });
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected");
            setError(null);
            reconnectAttemptsRef.current = 0;
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setConnectionStatus("error");
            setError(new Error(`Subscription ${status.toLowerCase()}`));

            // Attempt reconnection
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptsRef.current++;
              retryTimeoutRef.current = setTimeout(() => {
                setupSubscription();
              }, RECONNECT_DELAY_MS * reconnectAttemptsRef.current);
            }
          }
        });

      channelRef.current = channel;
    };

    setupSubscription();
    refresh();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [supabase, agentId, type, enabled, refresh]);

  return {
    activities,
    connectionStatus,
    error,
    refresh,
  };
}

export default useRealtimeActivities;
