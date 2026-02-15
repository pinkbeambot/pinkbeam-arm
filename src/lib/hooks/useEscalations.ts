'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Escalation, EscalationUrgency, EscalationType, RealtimeChangePayload } from '@/types';

const supabase = createClient();

export interface UseEscalationsOptions {
  status?: 'open' | 'resolved' | 'all';
  urgency?: EscalationUrgency | 'all';
  type?: EscalationType | 'all';
  agentId?: string | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface EscalationsResponse {
  data: Escalation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useEscalations(options: UseEscalationsOptions = {}) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page: options.page || 1,
    limit: options.limit || 20,
    total: 0,
    totalPages: 0,
  });
  
  // Use a ref to track the latest options to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Build query params
      const params = new URLSearchParams();
      const currentOptions = optionsRef.current;
      
      if (currentOptions.status && currentOptions.status !== 'all') {
        params.set('status', currentOptions.status);
      }
      if (currentOptions.urgency && currentOptions.urgency !== 'all') {
        params.set('urgency', currentOptions.urgency);
      }
      if (currentOptions.type && currentOptions.type !== 'all') {
        params.set('type', currentOptions.type);
      }
      if (currentOptions.agentId && currentOptions.agentId !== 'all') {
        params.set('agent_id', currentOptions.agentId);
      }
      if (currentOptions.search) {
        params.set('search', currentOptions.search);
      }
      if (currentOptions.page) {
        params.set('page', String(currentOptions.page));
      }
      if (currentOptions.limit) {
        params.set('limit', String(currentOptions.limit));
      }

      const response = await fetch(`/api/escalations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch escalations: ${response.status}`);
      }

      const result: EscalationsResponse = await response.json();
      setEscalations(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch escalations'));
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps since we use ref for options

  // Initial fetch and when options change
  useEffect(() => {
    fetchEscalations();
  }, [
    options.status,
    options.urgency,
    options.type,
    options.agentId,
    options.search,
    options.page,
    options.limit,
    fetchEscalations,
  ]);

  // Subscribe to realtime changes
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user profile to filter by tenant
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', session.user.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const tenantId = userProfile.tenant_id;

      // Subscribe to escalations table changes for this tenant
      const subscription = supabase
        .channel(`escalations:${tenantId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'escalations',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload: RealtimeChangePayload<Escalation>) => {
            if (payload.eventType === 'INSERT') {
              // Only add if it matches current filters
              const newEscalation = payload.new;
              if (newEscalation && matchesFilters(newEscalation, optionsRef.current)) {
                setEscalations((prev) => {
                  // Check if already exists (avoid duplicates)
                  if (prev.find(e => e.id === newEscalation.id)) {
                    return prev;
                  }
                  return [newEscalation, ...prev];
                });
                setPagination(prev => ({ ...prev, total: prev.total + 1 }));
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedEscalation = payload.new;
              if (updatedEscalation) {
                setEscalations((prev) => {
                  const exists = prev.find(e => e.id === updatedEscalation.id);
                  if (exists) {
                    // Update existing
                    return prev.map((e) => (e.id === updatedEscalation.id ? updatedEscalation : e));
                  } else if (matchesFilters(updatedEscalation, optionsRef.current)) {
                    // Add if now matches filters
                    return [updatedEscalation, ...prev];
                  }
                  return prev;
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setEscalations((prev) => prev.filter((e) => e.id !== deletedId));
                setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
              }
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanup = setupRealtime();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, []);

  const updateEscalation = useCallback(async (id: string, updates: Partial<Escalation>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/escalations/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to update escalation: ${response.status}`);
    }

    const result = await response.json();
    
    // Update local state
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...result.data } : e))
    );
    
    return result.data;
  }, []);

  const resolveEscalation = useCallback(async (id: string, resolution: string, resolvedBy: string) => {
    await updateEscalation(id, {
      status: 'resolved',
      resolution,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    });
  }, [updateEscalation]);

  return {
    escalations,
    loading,
    error,
    pagination,
    refetch: fetchEscalations,
    updateEscalation,
    resolveEscalation,
  };
}

// Helper function to check if an escalation matches current filters
function matchesFilters(escalation: Escalation, options: UseEscalationsOptions): boolean {
  if (options.status && options.status !== 'all' && escalation.status !== options.status) {
    return false;
  }
  if (options.urgency && options.urgency !== 'all' && escalation.urgency !== options.urgency) {
    return false;
  }
  if (options.type && options.type !== 'all' && escalation.type !== options.type) {
    return false;
  }
  if (options.agentId && options.agentId !== 'all' && escalation.agent_id !== options.agentId) {
    return false;
  }
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    const titleMatch = escalation.title?.toLowerCase().includes(searchLower);
    const descMatch = escalation.description?.toLowerCase().includes(searchLower);
    if (!titleMatch && !descMatch) {
      return false;
    }
  }
  return true;
}

export interface EscalationStats {
  totalOpen: number;
  critical: number;
  high: number;
  normal: number;
  low: number;
  avgResolutionTime: number;
  byStatus?: Record<string, number>;
  byUrgency?: Record<string, number>;
  byType?: Record<string, number>;
  timeline?: Array<{ date: string; created: number; resolved: number }>;
}

export function useEscalationStats(days: number = 30) {
  const [stats, setStats] = useState<EscalationStats>({
    totalOpen: 0,
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
    avgResolutionTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/escalations/stats?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch stats: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data;

      // Calculate open counts by urgency
      const open = data.by_status?.open || 0;
      const inProgress = data.by_status?.in_progress || 0;
      
      setStats({
        totalOpen: open + inProgress,
        critical: data.by_urgency?.critical || 0,
        high: data.by_urgency?.high || 0,
        normal: data.by_urgency?.normal || 0,
        low: data.by_urgency?.low || 0,
        avgResolutionTime: data.avg_resolution_time_seconds 
          ? data.avg_resolution_time_seconds / 3600 // Convert to hours
          : 0,
        byStatus: data.by_status,
        byUrgency: data.by_urgency,
        byType: data.by_type,
        timeline: data.timeline,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Subscribe to realtime updates for stats
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', session.user.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const tenantId = userProfile.tenant_id;

      const subscription = supabase
        .channel(`escalations-stats:${tenantId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'escalations',
            filter: `tenant_id=eq.${tenantId}`,
          },
          () => {
            // Refetch stats when any escalation changes
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanup = setupRealtime();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

export function useCreateEscalation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createEscalation = useCallback(async (data: {
    agent_id: string;
    task_id?: string;
    type: EscalationType;
    urgency: EscalationUrgency;
    title: string;
    description: string;
    situation_context?: Record<string, unknown>;
    question?: { title?: string; details?: string; options?: string[] };
    agent_analysis?: { what_i_know?: string; what_i_dont_know?: string; what_i_tried?: string[]; suggested_resolution?: string };
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/escalations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create escalation: ${response.status}`);
      }

      const result = await response.json();
      return result.data as Escalation;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to create escalation');
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createEscalation, loading, error };
}
