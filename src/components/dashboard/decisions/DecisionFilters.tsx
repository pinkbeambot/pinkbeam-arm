'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  Brain, 
  Search, 
  Filter, 
  X, 
  ChevronDown,
  ArrowUpDown,
  Download,
  FileJson,
  FileSpreadsheet,
  Calendar,
  User,
  Gauge,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Pencil,
  History
} from 'lucide-react';
import { cn, formatRelativeTime, formatDateTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Decision, Agent, DecisionStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ConfidenceLevel = 'all' | 'high' | 'medium' | 'low';
export type DecisionType = 'all' | 'proposed' | 'approved' | 'rejected' | 'overridden' | 'executed';

interface DecisionFiltersProps {
  agents: Agent[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  agentFilter: string | 'all';
  onAgentFilterChange: (agent: string | 'all') => void;
  confidenceFilter: ConfidenceLevel;
  onConfidenceFilterChange: (level: ConfidenceLevel) => void;
  typeFilter: DecisionType;
  onTypeFilterChange: (type: DecisionType) => void;
  dateRange: 'all' | 'today' | 'week' | 'month';
  onDateRangeChange: (range: 'all' | 'today' | 'week' | 'month') => void;
  sortField: 'created_at' | 'confidence' | 'title';
  onSortFieldChange: (field: 'created_at' | 'confidence' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  totalCount: number;
  filteredCount: number;
  onExport: (format: 'csv' | 'json') => void;
}

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string; color: string; min: number; max: number }[] = [
  { value: 'all', label: 'All Levels', color: 'bg-gray-500', min: 0, max: 100 },
  { value: 'high', label: 'High (>80%)', color: 'bg-green-500', min: 80, max: 100 },
  { value: 'medium', label: 'Medium (50-80%)', color: 'bg-amber-500', min: 50, max: 80 },
  { value: 'low', label: 'Low (<50%)', color: 'bg-red-500', min: 0, max: 50 },
];

const TYPE_OPTIONS: { value: DecisionType; label: string; color: string }[] = [
  { value: 'all', label: 'All Types', color: 'bg-gray-500' },
  { value: 'proposed', label: 'Proposed', color: 'bg-blue-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'overridden', label: 'Overridden', color: 'bg-orange-500' },
  { value: 'executed', label: 'Executed', color: 'bg-pink-500' },
];

const DATE_RANGE_OPTIONS: { value: 'all' | 'today' | 'week' | 'month'; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

const SORT_OPTIONS: { value: 'created_at' | 'confidence' | 'title'; label: string }[] = [
  { value: 'created_at', label: 'Decision Date' },
  { value: 'confidence', label: 'Confidence Score' },
  { value: 'title', label: 'Title' },
];

export function DecisionFilters({
  agents,
  searchQuery,
  onSearchChange,
  agentFilter,
  onAgentFilterChange,
  confidenceFilter,
  onConfidenceFilterChange,
  typeFilter,
  onTypeFilterChange,
  dateRange,
  onDateRangeChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  totalCount,
  filteredCount,
  onExport,
}: DecisionFiltersProps) {
  const activeFiltersCount = [
    agentFilter !== 'all',
    confidenceFilter !== 'all',
    typeFilter !== 'all',
    dateRange !== 'all',
    searchQuery.length > 0,
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    onSearchChange('');
    onAgentFilterChange('all');
    onConfidenceFilterChange('all');
    onTypeFilterChange('all');
    onDateRangeChange('all');
  }, [onSearchChange, onAgentFilterChange, onConfidenceFilterChange, onTypeFilterChange, onDateRangeChange]);

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="space-y-3">
      {/* Main Filter Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
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

        {/* Agent Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <User className="h-4 w-4" />
              <span>Agent</span>
              {agentFilter !== 'all' && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by Agent</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={agentFilter === 'all'}
              onCheckedChange={() => onAgentFilterChange('all')}
            >
              All Agents
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {agents.map((agent) => (
              <DropdownMenuCheckboxItem
                key={agent.id}
                checked={agentFilter === agent.id}
                onCheckedChange={() => onAgentFilterChange(agent.id)}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={agent.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>
                  {agent.name}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Confidence Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Gauge className="h-4 w-4" />
              <span>Confidence</span>
              {confidenceFilter !== 'all' && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Confidence</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CONFIDENCE_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={confidenceFilter === option.value}
                onCheckedChange={() => onConfidenceFilterChange(option.value)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  {option.label}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span>Type</span>
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TYPE_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={typeFilter === option.value}
                onCheckedChange={() => onTypeFilterChange(option.value)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  {option.label}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span>Date</span>
              {dateRange !== 'all' && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DATE_RANGE_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={dateRange === option.value}
                onCheckedChange={() => onDateRangeChange(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <span>Sort</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={sortField === option.value}
                onCheckedChange={() => onSortFieldChange(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortOrder === 'asc'}
              onCheckedChange={() => onSortOrderChange('asc')}
            >
              Ascending
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortOrder === 'desc'}
              onCheckedChange={() => onSortOrderChange('desc')}
            >
              Descending
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel>Export Decisions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport('csv')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Search: &quot;{searchQuery}&quot;
              <button onClick={() => onSearchChange('')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {agentFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Agent: {agents.find(a => a.id === agentFilter)?.name || 'Unknown'}
              <button onClick={() => onAgentFilterChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {confidenceFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Confidence: {CONFIDENCE_OPTIONS.find(c => c.value === confidenceFilter)?.label}
              <button onClick={() => onConfidenceFilterChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {typeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Type: {TYPE_OPTIONS.find(t => t.value === typeFilter)?.label}
              <button onClick={() => onTypeFilterChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {dateRange !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Date: {DATE_RANGE_OPTIONS.find(d => d.value === dateRange)?.label}
              <button onClick={() => onDateRangeChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCount} of {totalCount} decisions
      </div>
    </div>
  );
}

// Helper function to get confidence color
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-green-500 text-green-700';
  if (confidence >= 50) return 'bg-amber-500 text-amber-700';
  return 'bg-red-500 text-red-700';
}

export function getConfidenceBadgeVariant(confidence: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (confidence >= 80) return 'default';
  if (confidence >= 50) return 'secondary';
  return 'destructive';
}

export function getDecisionStatusIcon(status: DecisionStatus) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'overridden':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'executed':
      return <CheckCircle2 className="h-4 w-4 text-pink-500" />;
    case 'proposed':
    default:
      return <Brain className="h-4 w-4 text-blue-500" />;
  }
}

export function getDecisionStatusColor(status: DecisionStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'overridden':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'executed':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
    case 'proposed':
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
}

export function getDecisionStatusLabel(status: DecisionStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Filter and sort decisions helper
export function filterAndSortDecisions(
  decisions: Decision[],
  searchQuery: string,
  agentFilter: string | 'all',
  confidenceFilter: ConfidenceLevel,
  typeFilter: DecisionType,
  dateRange: 'all' | 'today' | 'week' | 'month',
  sortField: 'created_at' | 'confidence' | 'title',
  sortOrder: 'asc' | 'desc'
): Decision[] {
  let filtered = [...decisions];

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query) ||
        d.reasoning?.toLowerCase().includes(query) ||
        d.agent?.name.toLowerCase().includes(query)
    );
  }

  // Agent filter
  if (agentFilter !== 'all') {
    filtered = filtered.filter((d) => d.agent_id === agentFilter);
  }

  // Confidence filter
  if (confidenceFilter !== 'all') {
    const option = CONFIDENCE_OPTIONS.find((c) => c.value === confidenceFilter);
    if (option) {
      filtered = filtered.filter(
        (d) => d.confidence >= option.min && d.confidence <= option.max
      );
    }
  }

  // Type filter
  if (typeFilter !== 'all') {
    filtered = filtered.filter((d) => d.status === typeFilter);
  }

  // Date range filter
  if (dateRange !== 'all') {
    const now = new Date();
    const cutoff = new Date();
    switch (dateRange) {
      case 'today':
        cutoff.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setDate(now.getDate() - 30);
        break;
    }
    filtered = filtered.filter((d) => new Date(d.created_at) >= cutoff);
  }

  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'confidence':
        comparison = a.confidence - b.confidence;
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
}
