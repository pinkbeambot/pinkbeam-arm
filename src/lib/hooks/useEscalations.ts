'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Escalation, EscalationUrgency, EscalationType } from '@/types';

// Mock data for escalations
const MOCK_ESCALATIONS: Escalation[] = [
  {
    id: 'esc-001',
    tenant_id: 'tenant-001',
    agent_id: 'agent-001',
    agent: {
      id: 'agent-001',
      name: 'Sales Rep Sarah',
      avatar_url: '',
      role: 'worker',
      status: 'active',
      tenant_id: 'tenant-001',
      depth: 1,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-10T08:00:00Z',
      updated_at: '2026-02-13T10:00:00Z',
    },
    task_id: 'task-001',
    type: 'approval',
    urgency: 'high',
    title: 'High-value discount approval needed',
    description: 'A prospect is requesting a 25% discount on the Enterprise plan. This exceeds my authority limit of 15%. The deal value is $48,000 ARR.',
    context: 'Prospect: Acme Corp\nCurrent plan: Growth ($2,000/mo)\nRequested: Enterprise with 25% discount ($4,000/mo → $3,000/mo)\nCompetition: Evaluating against Salesforce',
    agent_recommendation: 'Approve the discount to win the deal. The lifetime value still exceeds our CAC significantly.',
    agent_confidence: 0.72,
    status: 'open',
    created_at: '2026-02-13T14:30:00Z',
    updated_at: '2026-02-13T14:30:00Z',
    question: {
      title: 'Should I approve the 25% discount?',
      details: 'The prospect is ready to sign but wants a larger discount than I\'m authorized to give.',
      options: ['Approve 25% discount', 'Offer 20% discount instead', 'Reject discount request', 'Schedule call with prospect'],
    },
    agent_analysis: {
      what_i_know: 'Prospect has budget authority, timeline is Q1, evaluated 3 competitors',
      what_i_dont_know: 'Whether they\'d accept a smaller discount',
      what_i_tried: ['Offered standard 10% annual discount', 'Positioned value proposition', 'Extended trial period'],
      suggested_resolution: 'Approve the 25% discount - the unit economics still work',
    },
  },
  {
    id: 'esc-002',
    tenant_id: 'tenant-001',
    agent_id: 'agent-002',
    agent: {
      id: 'agent-002',
      name: 'Content Writer Alex',
      avatar_url: '',
      role: 'specialist',
      status: 'idle',
      tenant_id: 'tenant-001',
      depth: 1,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-11T08:00:00Z',
      updated_at: '2026-02-13T09:00:00Z',
    },
    task_id: 'task-002',
    type: 'clarification',
    urgency: 'normal',
    title: 'Clarification on brand voice for technical content',
    description: 'I\'m writing a blog post about our new API features. Should I maintain the formal technical tone or use the more conversational style we adopted in recent marketing materials?',
    context: 'Blog post: "Getting Started with ARM API"\nTarget audience: Technical founders and developers\nLength: ~2,000 words',
    agent_recommendation: 'Use conversational style - it performed better in recent A/B tests.',
    agent_confidence: 0.65,
    status: 'open',
    created_at: '2026-02-13T12:15:00Z',
    updated_at: '2026-02-13T12:15:00Z',
    question: {
      title: 'Which tone should I use for technical content?',
      details: 'Need to align with brand guidelines while keeping developer audience engaged.',
      options: ['Formal technical', 'Conversational', 'Mix both styles'],
    },
    agent_analysis: {
      what_i_know: 'Recent marketing emails with conversational tone had 23% higher engagement',
      what_i_dont_know: 'Whether developers prefer different tone than general audience',
      what_i_tried: ['Reviewed brand guidelines', 'Analyzed top-performing technical content'],
    },
  },
  {
    id: 'esc-003',
    tenant_id: 'tenant-001',
    agent_id: 'agent-003',
    agent: {
      id: 'agent-003',
      name: 'Support Bot Sam',
      avatar_url: '',
      role: 'worker',
      status: 'active',
      tenant_id: 'tenant-001',
      depth: 1,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-08T08:00:00Z',
      updated_at: '2026-02-13T08:00:00Z',
    },
    task_id: 'task-003',
    type: 'edge_case',
    urgency: 'critical',
    title: 'Refund request exceeding policy limits',
    description: 'Customer is requesting a full refund for annual subscription purchased 45 days ago. Our policy allows refunds only within 30 days. However, the customer claims they experienced critical service outages.',
    context: 'Customer: StartupXYZ (Annual Pro plan: $2,388)\nPurchase date: Dec 29, 2025\nRefund request date: Feb 13, 2026\nOutage reports: 3 incidents in January',
    agent_recommendation: 'Process the refund to maintain goodwill, but flag for engineering review.',
    agent_confidence: 0.45,
    status: 'open',
    created_at: '2026-02-13T08:45:00Z',
    updated_at: '2026-02-13T08:45:00Z',
    question: {
      title: 'Should we grant the exception refund?',
      details: 'Customer had documented service issues but is outside standard refund window.',
      options: ['Full refund', 'Prorated refund', 'Credit toward future billing', 'Deny refund but offer credit'],
    },
    agent_analysis: {
      what_i_know: 'Customer had 3 outages totaling 8 hours downtime, loyal customer for 2 years',
      what_i_dont_know: 'Customer\'s churn risk, whether outages were from our infrastructure',
      what_i_tried: ['Reviewed refund policy', 'Checked incident logs', 'Analyzed customer history'],
      suggested_resolution: 'Grant exception refund with note to engineering about reliability',
    },
  },
  {
    id: 'esc-004',
    tenant_id: 'tenant-001',
    agent_id: 'agent-004',
    agent: {
      id: 'agent-004',
      name: 'Data Analyst Dana',
      avatar_url: '',
      role: 'specialist',
      status: 'active',
      tenant_id: 'tenant-001',
      depth: 1,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-09T08:00:00Z',
      updated_at: '2026-02-12T16:00:00Z',
    },
    task_id: 'task-004',
    type: 'error',
    urgency: 'low',
    title: 'Data pipeline anomaly detection',
    description: 'I\'ve detected an anomaly in the daily metrics aggregation. The webhook events count dropped by 40% yesterday, but API usage remained normal. This might be a data quality issue or an actual problem.',
    context: 'Date: Feb 12, 2026\nWebhook events: 45,230 (down from 75,400)\nAPI calls: Normal\nError rate: Normal',
    agent_recommendation: 'Wait for today\'s data before alerting - could be delayed processing.',
    agent_confidence: 0.55,
    status: 'resolved',
    resolved_by: 'user-001',
    resolution: 'Approved: Wait for today\'s data. If anomaly persists, investigate pipeline.',
    created_at: '2026-02-12T16:00:00Z',
    resolved_at: '2026-02-13T09:00:00Z',
    updated_at: '2026-02-13T09:00:00Z',
    question: {
      title: 'Should we investigate the data anomaly immediately?',
      details: '40% drop in webhook events, but other metrics are normal.',
      options: ['Investigate immediately', 'Wait for more data', 'Alert engineering team', 'Check with infrastructure'],
    },
    agent_analysis: {
      what_i_know: 'API usage normal, no error spikes, single day anomaly',
      what_i_dont_know: 'Whether webhook processing was delayed or failed',
      what_i_tried: ['Checked API logs', 'Verified error rates', 'Compared to historical patterns'],
      suggested_resolution: 'Wait 24 hours before investigation - likely processing delay',
    },
  },
  {
    id: 'esc-005',
    tenant_id: 'tenant-001',
    agent_id: 'agent-001',
    agent: {
      id: 'agent-001',
      name: 'Sales Rep Sarah',
      avatar_url: '',
      role: 'worker',
      status: 'active',
      tenant_id: 'tenant-001',
      depth: 1,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-10T08:00:00Z',
      updated_at: '2026-02-11T10:00:00Z',
    },
    task_id: 'task-005',
    type: 'clarification',
    urgency: 'low',
    title: 'Clarification on lead scoring threshold',
    description: 'I\'m reviewing the lead scoring model and noticed some leads with scores of 75+ are not being marked as SQLs. Should I adjust the threshold or is this intentional?',
    context: 'Current SQL threshold: 80 points\nLeads 75-79 range: 23 leads this week\nHistorical conversion: 12% in this range',
    agent_recommendation: 'Lower threshold to 75 to capture more opportunities.',
    agent_confidence: 0.68,
    status: 'resolved',
    resolved_by: 'user-001',
    resolution: 'Rejected: Keep threshold at 80. Review quality of 75-79 range leads first.',
    created_at: '2026-02-11T10:30:00Z',
    resolved_at: '2026-02-11T14:00:00Z',
    updated_at: '2026-02-11T14:00:00Z',
    question: {
      title: 'Should we lower the SQL threshold to 75?',
      details: '23 leads this week scored 75-79, could increase pipeline volume.',
      options: ['Lower to 75', 'Keep at 80', 'Test with 10 leads first', 'Analyze historical data'],
    },
    agent_analysis: {
      what_i_know: '23 leads in range, 12% historical conversion vs 18% for 80+ leads',
      what_i_dont_know: 'Quality scores for these specific leads, budget authority',
      what_i_tried: ['Analyzed conversion rates', 'Reviewed lead demographics'],
      suggested_resolution: 'Lower threshold after reviewing sample of 5 leads manually',
    },
  },
];

export interface UseEscalationsOptions {
  status?: 'open' | 'resolved' | 'all';
  urgency?: EscalationUrgency | 'all';
  type?: EscalationType | 'all';
  agentId?: string | 'all';
}

export function useEscalations(options: UseEscalationsOptions = {}) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter mock data
      let filtered = [...MOCK_ESCALATIONS];
      
      if (options.status && options.status !== 'all') {
        filtered = filtered.filter(e => e.status === options.status);
      }
      
      if (options.urgency && options.urgency !== 'all') {
        filtered = filtered.filter(e => e.urgency === options.urgency);
      }
      
      if (options.type && options.type !== 'all') {
        filtered = filtered.filter(e => e.type === options.type);
      }
      
      if (options.agentId && options.agentId !== 'all') {
        filtered = filtered.filter(e => e.agent_id === options.agentId);
      }
      
      // Sort by urgency (high first) then by created_at (newest first)
      const urgencyOrder: Record<EscalationUrgency, number> = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3,
      };
      
      filtered.sort((a, b) => {
        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setEscalations(filtered);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch escalations'));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.urgency, options.type, options.agentId]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const updateEscalation = useCallback(async (id: string, updates: Partial<Escalation>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setEscalations(prev => 
        prev.map(e => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)
      );
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update escalation');
    }
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
    refetch: fetchEscalations,
    updateEscalation,
    resolveEscalation,
  };
}

export function useEscalationStats() {
  const [stats, setStats] = useState({
    totalOpen: 0,
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
    avgResolutionTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateStats = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const open = MOCK_ESCALATIONS.filter(e => e.status === 'open');
      const resolved = MOCK_ESCALATIONS.filter(e => e.status === 'resolved');
      
      setStats({
        totalOpen: open.length,
        critical: open.filter(e => e.urgency === 'critical').length,
        high: open.filter(e => e.urgency === 'high').length,
        normal: open.filter(e => e.urgency === 'normal').length,
        low: open.filter(e => e.urgency === 'low').length,
        avgResolutionTime: resolved.length > 0 
          ? resolved.reduce((sum, e) => {
              if (e.resolved_at && e.created_at) {
                return sum + (new Date(e.resolved_at).getTime() - new Date(e.created_at).getTime());
              }
              return sum;
            }, 0) / resolved.length / (1000 * 60 * 60) // Convert to hours
          : 0,
      });
      setLoading(false);
    };
    
    calculateStats();
  }, []);

  return { stats, loading };
}
