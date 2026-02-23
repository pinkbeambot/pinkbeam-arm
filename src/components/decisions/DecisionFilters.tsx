'use client';

/**
 * DecisionFilters Component
 * 
 * Filter controls for the decision log.
 * Features:
 * - Filter by status (proposed, approved, rejected, overridden, executed)
 * - Filter by agent
 * - Filter by priority (low, normal, high, urgent)
 * - Filter by date range
 * - Search by text
 * - Sort by date or priority
 */

import * as React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Decision, DecisionStatus, DecisionPriority, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Types
// ============================================================================

export type StatusFilter = DecisionStatus | 'all';
export type PriorityFilter = DecisionPriority | 'all';
export type DateRangeFilter = 'all' | 'today' | 'week' | 'month';
export type SortField = 'created_at' | 'updated_at' | 'priority' | 'confidence';
export type SortOrder = 'asc' | 'desc';

// ============================================================================
// Props Interface
// ============================================================================

export interface DecisionFiltersProps {
  /** Available agents for filter dropdown */
  agents: Agent[];
  /** Current search query */
  searchQuery: string;
  /** Callback when search changes */
  onSearchChange: (query: string) => void;
  /** Current status filter */
  statusFilter: StatusFilter;
  /** Callback when status filter changes */
  onStatusFilterChange: (status: StatusFilter) => void;
  /** Current agent filter */
  agentFilter: string | 'all';
  /** Callback when agent filter changes */
  onAgentFilterChange: (agentId: string | 'all') => void;
  /** Current priority filter */
  priorityFilter: PriorityFilter;
  /** Callback when priority filter changes */
  onPriorityFilterChange: (priority: PriorityFilter) => void;
  /** Current date range filter */
  dateRange: DateRangeFilter;
  /** Callback when date range changes */
  onDateRangeChange: (range: DateRangeFilter) => void;
  /** Current sort field */
  sortField: SortField;
  /** Callback when sort field changes */
  onSortFieldChange: (field: SortField) => void;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Callback when sort order changes */
  onSortOrderChange: (order: SortOrder) => void;
  /** Total count of decisions */
  totalCount: number;
  /** Filtered count of decisions */
  filteredCount: number;
  /** Callback for export action */
  onExport?: (format: 'csv' | 'json') => void;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Filter Configurations
// ============================================================================

const statusOptions: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Status', color: '#6b7280' },
  { value: 'proposed', label: 'Proposed', color: '#eab308' },
  { value: 'approved', label: 'Approved', color: '#22c55e' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
  { value: 'overridden', label: 'Overridden', color: '#f97316' },
  { value: 'executed', label: 'Executed', color: '#3b82f6' },
];

const priorityOptions: { value: PriorityFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Priorities', color: '#6b7280' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'normal', label: 'Normal', color: '#3b82f6' },
  { value: 'low', label: 'Low', color: '#6b7280' },
];

const dateRangeOptions: { value: DateRangeFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

const sortFieldOptions: { value: SortField; label: string }[] = [
  { value: 'created_at', label: 'Created Date' },
  { value: 'updated_at', label: 'Updated Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'confidence', label: 'Confidence' },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function filterDecisions(
  decisions: Decision[],
  searchQuery: string,
  statusFilter: StatusFilter,
  agentFilter: string | 'all',
  priorityFilter: PriorityFilter,
  dateRange: DateRangeFilter
): Decision[] {
  return decisions.filter((decision) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        decision.title.toLowerCase().includes(query) ||
        decision.description.toLowerCase().includes(query) ||
        decision.agent?.name.toLowerCase().includes(query) ||
        false;
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && decision.status !== statusFilter) {
      return false;
    }

    // Agent filter
    if (agentFilter !== 'all' && decision.agent_id !== agentFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && decision.priority !== priorityFilter) {
      return false;
    }

    // Date range filter
    if (dateRange !== 'all') {
      const decisionDate = new Date(decision.created_at);
      const now = new Date();
      let cutoffDate: Date;

      switch (dateRange) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      if (decisionDate < cutoffDate) return false;
    }

    return true;
  });
}

export function sortDecisions(
  decisions: Decision[],
  sortField: SortField,
  sortOrder: SortOrder
): Decision[] {
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

  return [...decisions].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'updated_at':
        const aUpdated = a.updated_at || a.created_at;
        const bUpdated = b.updated_at || b.created_at;
        comparison = new Date(aUpdated).getTime() - new Date(bUpdated).getTime();
        break;
      case 'priority':
        const aPriority = priorityOrder[a.priority || 'normal'] || 2;
        const bPriority = priorityOrder[b.priority || 'normal'] || 2;
        comparison = aPriority - bPriority;
        break;
      case 'confidence':
        comparison = a.confidence - b.confidence;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

// ============================================================================
// Component
// ============================================================================

export function DecisionFilters({
  agents,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  agentFilter,
  onAgentFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dateRange,
  onDateRangeChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  totalCount,
  filteredCount,
  onExport,
  className,
}: DecisionFiltersProps) {
  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    agentFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateRange !== 'all';

  const handleClearFilters = React.useCallback(() => {
    onSearchChange('');
    onStatusFilterChange('all');
    onAgentFilterChange('all');
    onPriorityFilterChange('all');
    onDateRangeChange('all');
  }, [onSearchChange, onStatusFilterChange, onAgentFilterChange, onPriorityFilterChange, onDateRangeChange]);

  const toggleSortOrder = React.useCallback(() => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortOrder, onSortOrderChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top Row: Search and Main Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortFieldOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortOrder}
            className="shrink-0"
            aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>

          {/* Export Menu */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('json')}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Agent Filter */}
        <Select value={agentFilter} onValueChange={(v) => onAgentFilterChange(v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id} className="text-xs">
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={priorityFilter} onValueChange={(v) => onPriorityFilterChange(v as PriorityFilter)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangeFilter)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Count Display */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredCount} of {totalCount} decisions
        </span>
        {hasActiveFilters && (
          <Badge variant="secondary" className="text-xs">
            Filtered
          </Badge>
        )}
      </div>
    </div>
  );
}

export default DecisionFilters;
