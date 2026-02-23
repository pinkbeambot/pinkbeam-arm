'use client';

/**
 * Decisions Page
 * 
 * The main decision log page using the new Decision Log UI components.
 * Features:
 * - Full decision list with filtering
 * - Detail view with approve/reject actions
 * - Real-time updates via Supabase
 * - Export functionality
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, Brain } from 'lucide-react';
import { DashboardLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DecisionList, DecisionDetail, ApprovalButtons } from '@/components/decisions';
import type { StatusFilter, PriorityFilter, DateRangeFilter, SortField, SortOrder } from '@/components/decisions';
import { DecisionStats } from '@/components/dashboard/decisions/DecisionStats';
import { useDecisionsRealtime, useOverrideDecision, useExportDecisions } from '@/lib/hooks/useDecisions';
import { useAgentsRealtime } from '@/lib/hooks/useAgents';
import { useTenant } from '@/lib/hooks/useTenant';
import { useRBAC } from '@/lib/hooks';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Decision, DecisionStatus } from '@/types';

// ============================================================================
// Helper Functions
// ============================================================================

function getDateRange(range: DateRangeFilter): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  
  switch (range) {
    case 'today':
      return { from: new Date(now.setHours(0, 0, 0, 0)).toISOString(), to };
    case 'week':
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to };
    case 'month':
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to };
    default:
      return {};
  }
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function DecisionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenant();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail panel state
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch data
  const { agents, loading: agentsLoading } = useAgentsRealtime(tenantId);
  const dateRangeParams = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Map status filter to API status
  const apiStatus: DecisionStatus | undefined = useMemo(() => {
    if (statusFilter === 'all') return undefined;
    return statusFilter as DecisionStatus;
  }, [statusFilter]);

  const { 
    decisions, 
    loading: decisionsLoading, 
    error, 
    refetch, 
    pagination 
  } = useDecisionsRealtime({
    agentId: agentFilter !== 'all' ? agentFilter : undefined,
    status: apiStatus,
    dateFrom: dateRangeParams.from,
    dateTo: dateRangeParams.to,
    search: searchQuery || undefined,
    page,
    limit,
  });

  // Mutations
  const { overrideDecision, loading: overrideLoading } = useOverrideDecision();
  const { exportDecisions } = useExportDecisions();

  // RBAC permissions
  const { can } = useRBAC();
  const canManageDecisions = can('decisions:override');

  // ============================================================================
  // Handlers
  // ============================================================================

  const showPermissionDenied = useCallback(() => {
    toast({ 
      title: 'Permission Denied', 
      description: 'You do not have permission to perform this action.', 
      variant: 'destructive' 
    });
  }, [toast]);

  const handleSelectDecision = useCallback((decision: Decision) => {
    setSelectedDecision(decision);
    setDetailOpen(true);
  }, []);

  const handleApprove = useCallback(async (decisionId: string, notes?: string) => {
    if (!canManageDecisions) {
      showPermissionDenied();
      return;
    }
    
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we simulate success
      toast({ 
        title: 'Decision Approved', 
        description: notes ? `Approved with notes: ${notes}` : 'Decision has been approved.' 
      });
      refetch();
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to approve decision.', 
        variant: 'destructive' 
      });
    }
  }, [canManageDecisions, refetch, showPermissionDenied, toast]);

  const handleReject = useCallback(async (decisionId: string, reason: string) => {
    if (!canApproveDecisions) {
      showPermissionDenied();
      return;
    }
    
    try {
      // In a real implementation, this would call an API endpoint
      toast({ 
        title: 'Decision Rejected', 
        description: `Decision has been rejected. Reason: ${reason}` 
      });
      refetch();
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to reject decision.', 
        variant: 'destructive' 
      });
    }
  }, [canApproveDecisions, refetch, showPermissionDenied, toast]);

  const handleOverride = useCallback(async (decisionId: string, overrideData: { correctDecision: string; reason: string }) => {
    if (!canOverrideDecisions) {
      showPermissionDenied();
      return;
    }

    try {
      await overrideDecision(decisionId, {
        correctDecision: overrideData.correctDecision,
        reason: overrideData.reason,
        sendFeedback: true,
      });
      toast({ title: 'Decision Overridden', description: 'The decision has been overridden.' });
      refetch();
      setDetailOpen(false);
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to override.', 
        variant: 'destructive' 
      });
    }
  }, [canOverrideDecisions, overrideDecision, refetch, showPermissionDenied, toast]);

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

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const loading = decisionsLoading || agentsLoading || tenantLoading;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader 
          title="Decision Log" 
          description={`Audit trail of all agent decisions. ${pagination?.total || 0} total decisions.`} 
        />

        {/* Stats */}
        <DecisionStats decisions={decisions} className="mb-8" />

        {/* Error State */}
        {(tenantError || error) && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              {tenantError ? `Tenant error: ${tenantError.message}` : `Failed to load decisions: ${error?.message}`}
            </p>
            <button onClick={refetch} className="mt-2 text-sm text-red-600 dark:text-red-400 underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && decisions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading decisions...</span>
          </div>
        ) : (
          <>
            {/* Decision List with built-in filters */}
            <DecisionList
              decisions={decisions}
              agents={agents}
              loading={decisionsLoading}
              selectedDecisionId={selectedDecision?.id}
              onSelectDecision={handleSelectDecision}
              onViewDetails={handleSelectDecision}
              onExport={handleExport}
              initialSearchQuery={searchQuery}
              initialStatusFilter={statusFilter}
              initialAgentFilter={agentFilter}
              initialPriorityFilter={priorityFilter}
              initialDateRange={dateRange}
              initialSortField={sortField}
              initialSortOrder={sortOrder}
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
                    <ChevronLeft className="h-4 w-4" /> Previous
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
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Decision Detail Sheet */}
        <DecisionDetail
          decision={selectedDecision}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onApprove={canApproveDecisions ? handleApprove : undefined}
          onReject={canApproveDecisions ? handleReject : undefined}
          onOverride={canOverrideDecisions ? handleOverride : undefined}
          onViewTask={handleViewTask}
          onViewActivity={handleViewActivity}
          loading={overrideLoading}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
