'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Decision, DecisionStatus, RealtimeChangePayload } from '@/types';

const supabase = createClient();

interface DecisionsResponse {
  data: Decision[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseDecisionsOptions {
  agentId?: string;
  status?: DecisionStatus;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  confidenceMin?: number;
  search?: string;
  sort?: 'created_at' | 'proposed_at' | 'confidence' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useDecisionsRealtime(options: UseDecisionsOptions = {}) {
  const {
    agentId,
    status,
    category,
    dateFrom,
    dateTo,
    confidenceMin,
    search,
    sort = 'proposed_at',
    order = 'desc',
    page = 1,
    limit = 20,
  } = options;

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page,
    limit,
    total: 0,
    totalPages: 0,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchDecisions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams();
      if (agentId) params.set('agent_id', agentId);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (confidenceMin !== undefined) params.set('confidence_min', confidenceMin.toString());
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      if (order) params.set('order', order);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const response = await fetch(`/api/decisions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch decisions: ${response.status}`);
      }

      const result: DecisionsResponse = await response.json();
      setDecisions(result.data);
      setPagination(result.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch decisions'));
    } finally {
      setLoading(false);
    }
  }, [agentId, status, category, dateFrom, dateTo, confidenceMin, search, sort, order, page, limit]);

  useEffect(() => {
    fetchDecisions();

    const subscription = supabase
      .channel('decisions:changes')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        { event: '*', schema: 'public', table: 'decisions' },
        (payload: RealtimeChangePayload<Decision>) => {
          const currentOpts = optionsRef.current;
          if (currentOpts.page === 1 && !currentOpts.agentId && !currentOpts.status && !currentOpts.search) {
            fetchDecisions();
          } else {
            if (payload.eventType === 'INSERT') {
              setDecisions((prev) => [payload.new!, ...prev].slice(0, currentOpts.limit));
            } else if (payload.eventType === 'UPDATE') {
              setDecisions((prev) => prev.map((d) => (d.id === payload.new?.id ? { ...d, ...payload.new } : d)));
            } else if (payload.eventType === 'DELETE') {
              setDecisions((prev) => prev.filter((d) => d.id !== payload.old?.id));
            }
          }
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [fetchDecisions]);

  return { decisions, loading, error, refetch: fetchDecisions, pagination };
}

export function useDecisionDetail(decisionId: string | null) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDecision = useCallback(async () => {
    if (!decisionId) { setDecision(null); return; }
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/decisions/${decisionId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        if (response.status === 404) { setDecision(null); return; }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch decision: ${response.status}`);
      }
      const result = await response.json();
      setDecision(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch decision'));
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => { fetchDecision(); }, [fetchDecision]);
  return { decision, loading, error, refetch: fetchDecision };
}

export function useOverrideDecision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const overrideDecision = useCallback(async (decisionId: string, overrideData: { correctDecision: string; reason: string; sendFeedback: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/decisions/${decisionId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: overrideData.reason,
          correct_action: overrideData.correctDecision ? { decision: overrideData.correctDecision } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to override decision: ${response.status}`);
      }
      return (await response.json()).data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to override decision');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { overrideDecision, loading, error };
}

export function useUpdateDecision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateDecision = useCallback(async (decisionId: string, updateData: { status?: DecisionStatus; outcome?: Record<string, unknown>; executed_action?: Record<string, unknown> }) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/decisions/${decisionId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update decision: ${response.status}`);
      }
      return (await response.json()).data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update decision');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateDecision, loading, error };
}

export function useExportDecisions() {
  const exportDecisions = useCallback((decisions: Decision[], format: 'csv' | 'json') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(decisions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decisions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Timestamp', 'Agent', 'Title', 'Description', 'Confidence', 'Status', 'Reasoning'];
      const rows = decisions.map(d => [d.id, d.created_at, d.agent?.name || 'Unknown', d.title, d.description, d.confidence, d.status, d.reasoning || '']);
      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decisions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, []);
  return { exportDecisions };
}
