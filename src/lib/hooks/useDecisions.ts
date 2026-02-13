'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Decision, RealtimeChangePayload } from '@/types';

const supabase = createClient();

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Mock data for development
const MOCK_DECISIONS: Decision[] = [
  {
    id: '1',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-1',
    agent: {
      id: 'agent-1',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Sales Strategist',
      role: 'specialist',
      status: 'active',
      avatar_url: undefined,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    task_id: 'task-1',
    status: 'executed',
    title: 'Prioritize Enterprise Leads',
    description: 'Decided to prioritize leads from enterprise companies (>500 employees) over SMB leads based on higher conversion rates and deal sizes.',
    reasoning: 'Analysis of Q4 2025 data shows enterprise leads have 3.2x higher conversion rate and 8x average deal size. Current pipeline is 40% enterprise, 60% SMB. Reallocating 20% of SMB focus to enterprise could increase revenue by 25%.',
    alternatives_considered: [
      'Continue balanced approach between enterprise and SMB',
      'Focus exclusively on enterprise (rejected: too risky to abandon SMB entirely)',
      'Create separate teams for each segment (rejected: resource constraints)'
    ],
    confidence: 87,
    proposed_action: {
      type: 'reallocate_resources',
      from: 'smb_outreach',
      to: 'enterprise_outreach',
      percentage: 20
    },
    executed_at: '2026-02-13T10:30:00Z',
    created_at: '2026-02-13T10:25:00Z',
  },
  {
    id: '2',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-2',
    agent: {
      id: 'agent-2',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Content Writer',
      role: 'worker',
      status: 'active',
      avatar_url: undefined,
      capabilities: ['decide'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    task_id: 'task-2',
    status: 'approved',
    title: 'Blog Post Topic Selection',
    description: 'Selected "AI Agent Management Best Practices" as the next blog post topic based on trending keywords and competitor gap analysis.',
    reasoning: 'Keyword research shows 2,400 monthly searches for "AI agent management" with low competition (KD 28). Competitor analysis reveals no comprehensive guides exist. Our unique perspective on ARM positions us well to rank.',
    alternatives_considered: [
      '"Benefits of AI Agents" - too generic, high competition',
      '"AI Agent Implementation Guide" - good but narrower audience',
      '"Future of AI Agents" - timely but less actionable'
    ],
    confidence: 92,
    proposed_action: {
      type: 'create_content',
      content_type: 'blog_post',
      title: 'AI Agent Management Best Practices: A Complete Guide',
      target_keywords: ['AI agent management', 'manage AI agents', 'AI workforce']
    },
    created_at: '2026-02-13T09:15:00Z',
  },
  {
    id: '3',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-3',
    agent: {
      id: 'agent-3',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Pricing Optimizer',
      role: 'specialist',
      status: 'active',
      avatar_url: undefined,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    status: 'overridden',
    title: 'Increase Pro Tier Price by 25%',
    description: 'Recommended increasing Pro tier from $199 to $249 based on value-based pricing analysis and competitor benchmarking.',
    reasoning: 'Value analysis shows Pro tier delivers $850/month in value (time saved × billable rate). Current price captures only 23% of value. Competitor analysis shows similar tools priced $250-400. 25% increase positions us competitively while improving margins.',
    alternatives_considered: [
      'Maintain current pricing (rejected: leaving money on table)',
      'Increase by 50% (rejected: too aggressive, risk of churn)',
      'Add new tier between Pro and Business (rejected: complexity)'
    ],
    confidence: 76,
    proposed_action: {
      type: 'update_pricing',
      tier: 'pro',
      old_price: 199,
      new_price: 249,
      effective_date: '2026-03-01'
    },
    overridden_by: 'CEO',
    override_reason: 'Timing not right - want to establish stronger product-market fit before price increases. Revisit in Q2.',
    created_at: '2026-02-12T16:45:00Z',
  },
  {
    id: '4',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-1',
    agent: {
      id: 'agent-1',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Sales Strategist',
      role: 'specialist',
      status: 'active',
      avatar_url: undefined,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    task_id: 'task-3',
    status: 'proposed',
    title: 'Outreach Sequence: Follow-up Timing',
    description: 'Proposing to extend follow-up sequence from 5 to 7 touches over 21 days instead of 14 days.',
    reasoning: 'Current 5-touch sequence converts at 12%. Data shows prospects who engage after touch 6+ have 35% higher LTV. Extending sequence could capture 8% more qualified opportunities. Risk of spam complaints is low (current rate 0.3%).',
    alternatives_considered: [
      'Keep 5-touch sequence (rejected: missing opportunities)',
      'Extend to 10 touches (rejected: diminishing returns after 7)',
      'Add SMS touches (rejected: compliance complexity)'
    ],
    confidence: 68,
    proposed_action: {
      type: 'update_sequence',
      sequence_name: 'enterprise_outreach',
      touches: 7,
      duration_days: 21,
      channels: ['email', 'linkedin']
    },
    created_at: '2026-02-12T14:20:00Z',
  },
  {
    id: '5',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-4',
    agent: {
      id: 'agent-4',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Support Router',
      role: 'worker',
      status: 'idle',
      avatar_url: undefined,
      capabilities: ['decide'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    task_id: 'task-4',
    status: 'executed',
    title: 'Escalate High-Priority Ticket to Engineering',
    description: 'Routed critical API timeout issue to engineering team based on error patterns and customer impact.',
    reasoning: 'Ticket shows pattern of API timeouts affecting 12+ customers in past hour. Error logs indicate database connection pool exhaustion. Customer is on Business tier ($499/mo) with SLA requiring 4-hour resolution. Engineering has relevant expertise.',
    alternatives_considered: [
      'Handle via standard support queue (rejected: SLA risk)',
      'Route to DevOps first (rejected: DB issue needs app team)',
      'Request more diagnostics first (rejected: time critical)'
    ],
    confidence: 95,
    proposed_action: {
      type: 'escalate_ticket',
      ticket_id: 'SUP-2026-0212-001',
      to_team: 'engineering',
      priority: 'critical',
      sla_deadline: '2026-02-12T20:00:00Z'
    },
    executed_at: '2026-02-12T12:15:00Z',
    created_at: '2026-02-12T12:10:00Z',
  },
  {
    id: '6',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-5',
    agent: {
      id: 'agent-5',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Marketing Allocator',
      role: 'specialist',
      status: 'active',
      avatar_url: undefined,
      capabilities: ['decide'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    status: 'rejected',
    title: 'Pause LinkedIn Ad Campaign',
    description: 'Recommended pausing LinkedIn campaign due to rising CPA ($85 vs $45 target).',
    reasoning: 'LinkedIn CPA has increased 89% in past 2 weeks. Current CPA $85 vs target $45. ROI dropped to 0.8x. Audience saturation likely. Budget reallocation to Twitter/X shows promise (CPA $32, ROI 2.1x).',
    alternatives_considered: [
      'Reduce budget by 50% (rejected: still unprofitable)',
      'Refresh ad creative (rejected: tested 3 variations, no improvement)',
      'Expand audience targeting (rejected: broader = higher CPA on LinkedIn)'
    ],
    confidence: 82,
    proposed_action: {
      type: 'pause_campaign',
      platform: 'linkedin',
      campaign_id: 'LI-2026-LEAD-GEN-01',
      reallocate_budget_to: 'twitter'
    },
    created_at: '2026-02-11T09:30:00Z',
  },
  {
    id: '7',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-2',
    agent: {
      id: 'agent-2',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Content Writer',
      role: 'worker',
      status: 'active',
      avatar_url: undefined,
      capabilities: ['decide'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    task_id: 'task-5',
    status: 'executed',
    title: 'Case Study Format: Video vs Written',
    description: 'Decided to create both video and written versions of case studies to maximize reach and engagement.',
    reasoning: 'Analytics show written case studies perform well for SEO (avg 450 views/month) while video versions have 3x higher engagement on social. Creating both formats requires only 40% more effort but yields 180% more value.',
    alternatives_considered: [
      'Written only (rejected: missing social engagement)',
      'Video only (rejected: poor SEO performance)',
      'Interactive format (rejected: high effort, unproven)'
    ],
    confidence: 91,
    proposed_action: {
      type: 'create_content',
      content_types: ['written', 'video'],
      series: 'customer_case_studies',
      target: '2 per month'
    },
    executed_at: '2026-02-10T15:00:00Z',
    created_at: '2026-02-10T14:45:00Z',
  },
  {
    id: '8',
    tenant_id: DEMO_TENANT_ID,
    agent_id: 'agent-6',
    agent: {
      id: 'agent-6',
      tenant_id: DEMO_TENANT_ID,
      parent_id: null,
      root_id: DEMO_TENANT_ID,
      depth: 0,
      name: 'Onboarding Optimizer',
      role: 'specialist',
      status: 'active',
      avatar_url: undefined,
      capabilities: ['decide', 'escalate'],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-13T00:00:00Z',
    },
    task_id: 'task-6',
    status: 'approved',
    title: 'Add Interactive Product Tour',
    description: 'Proposed adding interactive product tour to onboarding flow to reduce time-to-first-value.',
    reasoning: 'Drop-off analysis shows 40% of users abandon during setup. Users who complete setup have 85% retention at 30 days vs 25% for non-completers. Interactive tour could increase completion rate by 35%. Tooling cost ($200/mo) justified by LTV improvement.',
    alternatives_considered: [
      'Improve documentation (rejected: passive, lower impact)',
      'Add more onboarding emails (rejected: email fatigue)',
      'Live onboarding calls (rejected: not scalable)'
    ],
    confidence: 78,
    proposed_action: {
      type: 'implement_feature',
      feature: 'interactive_product_tour',
      tool: 'userflow',
      estimated_completion: '2 weeks'
    },
    created_at: '2026-02-09T11:20:00Z',
  },
];

export function useDecisionsRealtime(tenantId: string = DEMO_TENANT_ID) {
  const [decisions, setDecisions] = useState<Decision[]>(MOCK_DECISIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDecisions = useCallback(async () => {
    try {
      setLoading(true);
      // For now, use mock data
      // In production, this would fetch from Supabase
      // const { data, error } = await supabase
      //   .from('decisions')
      //   .select('*, agent:agents(*)')
      //   .eq('tenant_id', tenantId)
      //   .order('created_at', { ascending: false });
      
      // if (error) throw error;
      // setDecisions(data || []);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setDecisions(MOCK_DECISIONS);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch decisions'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDecisions();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel(`decisions:${tenantId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'decisions',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: RealtimeChangePayload<Decision>) => {
          if (payload.eventType === 'INSERT') {
            setDecisions((prev) => [payload.new!, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDecisions((prev) =>
              prev.map((d) => (d.id === payload.new?.id ? payload.new! : d))
            );
          } else if (payload.eventType === 'DELETE') {
            setDecisions((prev) =>
              prev.filter((d) => d.id !== payload.old?.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId, fetchDecisions]);

  return { decisions, loading, error, refetch: fetchDecisions };
}

export function useOverrideDecision() {
  const [loading, setLoading] = useState(false);

  const overrideDecision = useCallback(async (
    decisionId: string,
    overrideData: { correctDecision: string; reason: string; sendFeedback: boolean }
  ) => {
    setLoading(true);
    try {
      // In production, this would update Supabase
      // const { error } = await supabase
      //   .from('decisions')
      //   .update({
      //     status: 'overridden',
      //     overridden_by: 'CEO',
      //     override_reason: overrideData.reason,
      //   })
      //   .eq('id', decisionId);
      
      // if (error) throw error;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, []);

  return { overrideDecision, loading };
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
      // CSV export
      const headers = ['ID', 'Timestamp', 'Agent', 'Title', 'Description', 'Confidence', 'Status', 'Reasoning'];
      const rows = decisions.map(d => [
        d.id,
        d.created_at,
        d.agent?.name || 'Unknown',
        d.title,
        d.description,
        d.confidence,
        d.status,
        d.reasoning || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
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
