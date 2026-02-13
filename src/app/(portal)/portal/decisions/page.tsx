'use client';

import { useState, useCallback } from 'react';
import { Brain, Download } from 'lucide-react';
import { DashboardLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DecisionList } from '@/components/dashboard/decisions/DecisionList';
import { DecisionDetailPanel } from '@/components/dashboard/decisions/DecisionDetailPanel';
import { DecisionStats } from '@/components/dashboard/decisions/DecisionStats';
import { 
  DecisionFilters, 
  type ConfidenceLevel, 
  type DecisionType 
} from '@/components/dashboard/decisions/DecisionFilters';
import { useDecisionsRealtime, useOverrideDecision, useExportDecisions } from '@/lib/hooks/useDecisions';
import { useToast } from '@/components/ui/use-toast';
import type { Decision, Agent } from '@/types';

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Mock agents for filters
const MOCK_AGENTS: Agent[] = [
  { id: 'agent-1', tenant_id: DEMO_TENANT_ID, parent_id: null, root_id: DEMO_TENANT_ID, name: 'Sales Strategist', role: 'specialist', status: 'active', depth: 0, capabilities: ['decide'], avatar_url: undefined, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-13T00:00:00Z' },
  { id: 'agent-2', tenant_id: DEMO_TENANT_ID, parent_id: null, root_id: DEMO_TENANT_ID, name: 'Content Writer', role: 'specialist', status: 'active', depth: 0, capabilities: ['decide'], avatar_url: undefined, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-13T00:00:00Z' },
  { id: 'agent-3', tenant_id: DEMO_TENANT_ID, parent_id: null, root_id: DEMO_TENANT_ID, name: 'Pricing Optimizer', role: 'specialist', status: 'active', depth: 0, capabilities: ['decide'], avatar_url: undefined, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-13T00:00:00Z' },
  { id: 'agent-4', tenant_id: DEMO_TENANT_ID, parent_id: null, root_id: DEMO_TENANT_ID, name: 'Support Router', role: 'specialist', status: 'active', depth: 0, capabilities: ['decide'], avatar_url: undefined, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-13T00:00:00Z' },
  { id: 'agent-5', tenant_id: DEMO_TENANT_ID, parent_id: null, root_id: DEMO_TENANT_ID, name: 'Marketing Allocator', role: 'specialist', status: 'active', depth: 0, capabilities: ['decide'], avatar_url: undefined, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-13T00:00:00Z' },
  { id: 'agent-6', tenant_id: DEMO_TENANT_ID, parent_id: null, root_id: DEMO_TENANT_ID, name: 'Onboarding Optimizer', role: 'specialist', status: 'active', depth: 0, capabilities: ['decide'], avatar_url: undefined, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-13T00:00:00Z' },
];

export default function DecisionsPage() {
  const { toast } = useToast();
  const { decisions, loading, error, refetch } = useDecisionsRealtime(DEMO_TENANT_ID);
  const { overrideDecision, loading: overrideLoading } = useOverrideDecision();
  const { exportDecisions } = useExportDecisions();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('all');
  const [typeFilter, setTypeFilter] = useState<DecisionType>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'confidence' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Handlers
  const handleSelectDecision = useCallback((decision: Decision) => {
    setSelectedDecision(decision);
    setDetailOpen(true);
  }, []);

  const handleOverrideDecision = useCallback(async (
    decisionId: string, 
    overrideData: { correctDecision: string; reason: string; sendFeedback: boolean }
  ) => {
    try {
      await overrideDecision(decisionId, overrideData);
      toast({
        title: 'Decision Overridden',
        description: 'The decision has been overridden and the agent has been notified.',
      });
      refetch();
      setDetailOpen(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to override decision.',
        variant: 'destructive',
      });
    }
  }, [overrideDecision, refetch, toast]);

  const handleExport = useCallback((format: 'csv' | 'json') => {
    exportDecisions(decisions, format);
    toast({
      title: 'Export Complete',
      description: `Decisions exported as ${format.toUpperCase()}.`,
    });
  }, [decisions, exportDecisions, toast]);

  const handleViewTask = useCallback((taskId: string) => {
    toast({
      title: 'Navigate to Task',
      description: `Opening task ${taskId}...`,
    });
    // In production, this would navigate to the task page
    // router.push(`/dashboard/tasks?task=${taskId}`);
  }, [toast]);

  const handleViewActivity = useCallback((decisionId: string) => {
    toast({
      title: 'View in Activity',
      description: 'Opening activity feed...',
    });
    // In production, this would navigate to activity with filter
    // router.push(`/dashboard/activity?decision=${decisionId}`);
  }, [toast]);

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Decision Log"
          description={`Audit trail of all agent decisions with reasoning and alternatives. ${decisions.length} total decisions.`}
        />

        {/* Stats */}
        <DecisionStats decisions={decisions} className="mb-8" />

        {/* Filters */}
        <div className="mb-6">
          <DecisionFilters
            agents={MOCK_AGENTS}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
            confidenceFilter={confidenceFilter}
            onConfidenceFilterChange={setConfidenceFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            sortField={sortField}
            onSortFieldChange={setSortField}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            totalCount={decisions.length}
            filteredCount={decisions.length} // Will be calculated by DecisionList
            onExport={handleExport}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              Failed to load decisions: {error.message}
            </p>
            <button 
              onClick={refetch}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Decision List */}
        <DecisionList
          decisions={decisions}
          agents={MOCK_AGENTS}
          loading={loading}
          selectedDecisionId={selectedDecision?.id}
          onSelectDecision={handleSelectDecision}
          onOverrideDecision={(decision) => handleSelectDecision(decision)}
          onViewTask={handleViewTask}
          searchQuery={searchQuery}
          agentFilter={agentFilter}
          confidenceFilter={confidenceFilter}
          typeFilter={typeFilter}
          dateRange={dateRange}
          sortField={sortField}
          sortOrder={sortOrder}
        />

        {/* Detail Panel */}
        <DecisionDetailPanel
          decision={selectedDecision}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onOverride={handleOverrideDecision}
          onViewTask={handleViewTask}
          onViewActivity={handleViewActivity}
          loading={overrideLoading}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
