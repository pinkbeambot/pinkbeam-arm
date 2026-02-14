'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
import { useAgents } from '@/lib/hooks/useAgents';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import type { Decision, DecisionStatus } from '@/types';

// Map UI confidence filter to numeric threshold
const CONFIDENCE_THRESHOLDS: Record<ConfidenceLevel, number | undefined> = {
  all: undefined,
  high: 0.9,
  medium: 0.7,
  low: 0.5,
};

// Map UI type filter to API category
const TYPE_TO_CATEGORY: Record<DecisionType, string | undefined> = {
  all: undefined,
  strategic: 'strategy',
  tactical: 'action',
  operational: 'system',
  emergency: 'escalation',
};

// Map UI date range to ISO dates
function getDateRange(range: 'all' | 'today' | 'week' | 'month'): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  
  switch (range) {
    case 'today': {
      const from = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      return { from, to };
    }
    case 'week': {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { from, to };
    }
    case 'month': {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { from, to };
    }
    default:
      return {};
  }
}

export default function DecisionsPage() {
  const { toast } = useToast();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('all');
  const [typeFilter, setTypeFilter] = useState<DecisionType>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'confidence' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Modal State
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch agents for filter dropdown
  const { agents, loading: agentsLoading } = useAgents();

  // Calculate API parameters
  const dateRangeParams = useMemo(() => getDateRange(dateRange), [dateRange]);
  
  // Fetch decisions with filters
  const { 
    decisions, 
    loading: decisionsLoading, 
    error, 
    refetch,
    pagination 
  } = useDecisionsRealtime({
    agentId: agentFilter !== 'all' ? agentFilter : undefined,
    status: undefined, // Will be filtered client-side for now
    category: TYPE_TO_CATEGORY[typeFilter],
    dateFrom: dateRangeParams.from,
    dateTo: dateRangeParams.to,
    confidenceMin: CONFIDENCE_THRESHOLDS[confidenceFilter],
    search: searchQuery || undefined,
    page,
    limit,
  });

  const { overrideDecision, loading: overrideLoading } = useOverrideDecision();
  const { exportDecisions } = useExportDecisions();

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
        description: err instanceof Error ? err.message : 'Failed to override decision.',
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
    // router.push(`/portal/tasks?task=${taskId}`);
  }, [toast]);

  const handleViewActivity = useCallback((decisionId: string) => {
    toast({
      title: 'View in Activity',
      description: 'Opening activity feed...',
    });
    // In production, this would navigate to activity with filter
    // router.push(`/portal/activity?decision=${decisionId}`);
  }, [toast]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Reset page when filters change
  const handleFilterChange = useCallback((setter: (value: any) => void) => (value: any) => {
    setter(value);
    setPage(1);
  }, []);

  const loading = decisionsLoading || agentsLoading;

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Decision Log"
          description={`Audit trail of all agent decisions with reasoning and alternatives. ${pagination?.total || 0} total decisions.`}
        />

        {/* Stats */}
        <DecisionStats decisions={decisions} className="mb-8" />

        {/* Filters */}
        <div className="mb-6">
          <DecisionFilters
            agents={agents}
            searchQuery={searchQuery}
            onSearchChange={handleFilterChange(setSearchQuery)}
            agentFilter={agentFilter}
            onAgentFilterChange={handleFilterChange(setAgentFilter)}
            confidenceFilter={confidenceFilter}
            onConfidenceFilterChange={handleFilterChange(setConfidenceFilter)}
            typeFilter={typeFilter}
            onTypeFilterChange={handleFilterChange(setTypeFilter)}
            dateRange={dateRange}
            onDateRangeChange={handleFilterChange(setDateRange)}
            sortField={sortField}
            onSortFieldChange={setSortField}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            totalCount={pagination?.total || 0}
            filteredCount={decisions.length}
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading decisions...</span>
          </div>
        )}

        {/* Decision List */}
        {!loading && (
          <>
            <DecisionList
              decisions={decisions}
              agents={agents}
              loading={false}
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

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} decisions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

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
