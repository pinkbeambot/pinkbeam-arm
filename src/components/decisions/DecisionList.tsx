'use client';

/**
 * DecisionList Component
 * 
 * List view of decisions with filtering capabilities.
 * Features:
 * - List of DecisionCard components
 * - Empty state handling
 * - Loading skeleton
 * - Filtering support
 * - Selection management
 */

import * as React from 'react';
import { Brain, Filter, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Decision, Agent } from '@/types';
import { DecisionCard } from './DecisionCard';
import { DecisionFilters, filterDecisions, sortDecisions } from './DecisionFilters';
import type { StatusFilter, PriorityFilter, DateRangeFilter, SortField, SortOrder } from './DecisionFilters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ============================================================================
// Props Interface
// ============================================================================

export interface DecisionListProps {
  /** Array of decisions to display */
  decisions: Decision[];
  /** Array of available agents for filtering */
  agents: Agent[];
  /** Loading state */
  loading?: boolean;
  /** ID of currently selected decision */
  selectedDecisionId?: string;
  /** Callback when a decision is selected */
  onSelectDecision?: (decision: Decision) => void;
  /** Callback to view decision details */
  onViewDetails?: (decision: Decision) => void;
  /** Callback when decision is approved */
  onApprove?: (decisionId: string, notes?: string) => Promise<void> | void;
  /** Callback when decision is rejected */
  onReject?: (decisionId: string, reason: string) => Promise<void> | void;
  /** Callback for export action */
  onExport?: (format: 'csv' | 'json') => void;
  /** Enable filtering UI */
  showFilters?: boolean;
  /** Enable search */
  enableSearch?: boolean;
  /** Initial search query */
  initialSearchQuery?: string;
  /** Initial status filter */
  initialStatusFilter?: StatusFilter;
  /** Initial agent filter */
  initialAgentFilter?: string | 'all';
  /** Initial priority filter */
  initialPriorityFilter?: PriorityFilter;
  /** Initial date range filter */
  initialDateRange?: DateRangeFilter;
  /** Initial sort field */
  initialSortField?: SortField;
  /** Initial sort order */
  initialSortOrder?: SortOrder;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Skeleton Component
// ============================================================================

function DecisionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyDecisionState({ 
  hasFilters, 
  message,
  onClearFilters 
}: { 
  hasFilters: boolean; 
  message?: string;
  onClearFilters?: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Brain className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">
          {hasFilters ? 'No decisions match your filters' : (message || 'No decisions yet')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {hasFilters
            ? 'Try adjusting your filters to see more decisions.'
            : 'Decisions appear when agents make choices during task execution. Start by creating tasks and letting agents work on them.'}
        </p>
        {hasFilters && onClearFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="mt-4"
          >
            Clear Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DecisionList({
  decisions,
  agents,
  loading = false,
  selectedDecisionId,
  onSelectDecision,
  onViewDetails,
  onApprove,
  onReject,
  onExport,
  showFilters = true,
  enableSearch = true,
  initialSearchQuery = '',
  initialStatusFilter = 'all',
  initialAgentFilter = 'all',
  initialPriorityFilter = 'all',
  initialDateRange = 'all',
  initialSortField = 'created_at',
  initialSortOrder = 'desc',
  emptyMessage,
  className,
}: DecisionListProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(initialStatusFilter);
  const [agentFilter, setAgentFilter] = React.useState<string | 'all'>(initialAgentFilter);
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>(initialPriorityFilter);
  const [dateRange, setDateRange] = React.useState<DateRangeFilter>(initialDateRange);
  const [sortField, setSortField] = React.useState<SortField>(initialSortField);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(initialSortOrder);

  // Filter and sort decisions
  const filteredDecisions = React.useMemo(() => {
    let result = filterDecisions(
      decisions,
      searchQuery,
      statusFilter,
      agentFilter,
      priorityFilter,
      dateRange
    );
    result = sortDecisions(result, sortField, sortOrder);
    return result;
  }, [decisions, searchQuery, statusFilter, agentFilter, priorityFilter, dateRange, sortField, sortOrder]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    agentFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateRange !== 'all';

  // Clear all filters
  const handleClearFilters = React.useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setAgentFilter('all');
    setPriorityFilter('all');
    setDateRange('all');
  }, []);

  // Handle decision click
  const handleDecisionClick = React.useCallback((decision: Decision) => {
    onSelectDecision?.(decision);
  }, [onSelectDecision]);

  // Handle view details
  const handleViewDetails = React.useCallback((decision: Decision) => {
    onViewDetails?.(decision);
  }, [onViewDetails]);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {showFilters && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        )}
        <DecisionListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      {showFilters && (
        <DecisionFilters
          agents={agents}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          agentFilter={agentFilter}
          onAgentFilterChange={setAgentFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          sortField={sortField}
          onSortFieldChange={setSortField}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          totalCount={decisions.length}
          filteredCount={filteredDecisions.length}
          onExport={onExport}
        />
      )}

      {/* Decision Cards */}
      {filteredDecisions.length === 0 ? (
        <EmptyDecisionState 
          hasFilters={hasActiveFilters}
          message={emptyMessage}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <div className="space-y-3">
          {filteredDecisions.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              isSelected={decision.id === selectedDecisionId}
              onClick={() => handleDecisionClick(decision)}
              onViewDetails={onViewDetails ? () => handleViewDetails(decision) : undefined}
            />
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {filteredDecisions.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Showing {filteredDecisions.length} decision{filteredDecisions.length !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <span>
              {decisions.length - filteredDecisions.length} filtered out
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default DecisionList;
