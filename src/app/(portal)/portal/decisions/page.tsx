'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { DashboardLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DecisionList } from '@/components/dashboard/decisions/DecisionList';
import { DecisionDetailPanel } from '@/components/dashboard/decisions/DecisionDetailPanel';
import { DecisionStats } from '@/components/dashboard/decisions/DecisionStats';
import { DecisionFilters, type ConfidenceLevel, type DecisionType } from '@/components/dashboard/decisions/DecisionFilters';
import { useDecisionsRealtime, useOverrideDecision, useExportDecisions } from '@/lib/hooks/useDecisions';
import { useAgentsRealtime } from '@/lib/hooks/useAgents';
import { useTenant } from '@/lib/hooks/useTenant';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import type { Decision, DecisionStatus } from '@/types';

const CONFIDENCE_THRESHOLDS: Record<ConfidenceLevel, number | undefined> = {
  all: undefined, high: 0.9, medium: 0.7, low: 0.5,
};

const TYPE_TO_STATUS: Record<DecisionType, DecisionStatus | undefined> = {
  all: undefined, 
  proposed: 'proposed', 
  approved: 'approved', 
  rejected: 'rejected', 
  overridden: 'overridden', 
  executed: 'executed',
};

function getDateRange(range: 'all' | 'today' | 'week' | 'month'): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  switch (range) {
    case 'today': return { from: new Date(now.setHours(0, 0, 0, 0)).toISOString(), to };
    case 'week': return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to };
    case 'month': return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to };
    default: return {};
  }
}

export default function DecisionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenant();

  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('all');
  const [typeFilter, setTypeFilter] = useState<DecisionType>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'confidence' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { agents, loading: agentsLoading } = useAgentsRealtime(tenantId);
  const dateRangeParams = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { decisions, loading: decisionsLoading, error, refetch, pagination } = useDecisionsRealtime({
    agentId: agentFilter !== 'all' ? agentFilter : undefined,
    status: TYPE_TO_STATUS[typeFilter],
    dateFrom: dateRangeParams.from,
    dateTo: dateRangeParams.to,
    confidenceMin: CONFIDENCE_THRESHOLDS[confidenceFilter],
    search: searchQuery || undefined,
    page,
    limit,
  });

  const { overrideDecision, loading: overrideLoading } = useOverrideDecision();
  const { exportDecisions } = useExportDecisions();

  const handleSelectDecision = useCallback((decision: Decision) => {
    setSelectedDecision(decision);
    setDetailOpen(true);
  }, []);

  const handleOverrideDecision = useCallback(async (decisionId: string, overrideData: { correctDecision: string; reason: string; sendFeedback: boolean }) => {
    try {
      await overrideDecision(decisionId, overrideData);
      toast({ title: 'Decision Overridden', description: 'The decision has been overridden.' });
      refetch();
      setDetailOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to override.', variant: 'destructive' });
    }
  }, [overrideDecision, refetch, toast]);

  const handleExport = useCallback((format: 'csv' | 'json') => {
    exportDecisions(decisions, format);
    toast({ title: 'Export Complete', description: `Decisions exported as ${format.toUpperCase()}.` });
  }, [decisions, exportDecisions, toast]);

  const handleViewTask = useCallback((taskId: string) => {
    router.push(`/portal/tasks?taskId=${taskId}`);
  }, [router]);

  const handleViewActivity = useCallback((_decisionId: string) => {
    router.push('/portal/activity');
  }, [router]);

  const handlePageChange = useCallback((newPage: number) => { setPage(newPage); }, []);

  const handleFilterChange = useCallback(<T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  }, []);

  const loading = decisionsLoading || agentsLoading || tenantLoading;

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader title="Decision Log" description={`Audit trail of all agent decisions. ${pagination?.total || 0} total decisions.`} />
        <DecisionStats decisions={decisions} className="mb-8" />
        <div className="mb-6">
          <DecisionFilters
            agents={agents}
            decisions={decisions}
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

        {(tenantError || error) && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              {tenantError ? `Tenant error: ${tenantError.message}` : `Failed to load decisions: ${error?.message}`}
            </p>
            <button onClick={refetch} className="mt-2 text-sm text-red-600 dark:text-red-400 underline">Retry</button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading decisions...</span>
          </div>
        )}

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

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} decisions
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-2">Page {pagination.page} of {pagination.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= pagination.totalPages}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

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
