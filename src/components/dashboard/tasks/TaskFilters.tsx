'use client';

import { useState, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority, Agent } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TaskFiltersProps {
  agents: Agent[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  priorityFilter: TaskPriority | 'all';
  onPriorityFilterChange: (priority: TaskPriority | 'all') => void;
  assigneeFilter: string | 'all';
  onAssigneeFilterChange: (assignee: string | 'all') => void;
  sortField: 'created_at' | 'updated_at' | 'due_date' | 'priority';
  onSortFieldChange: (field: 'created_at' | 'updated_at' | 'due_date' | 'priority') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  totalCount: number;
  filteredCount: number;
}

const STATUS_OPTIONS: { value: TaskStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Statuses', color: 'bg-gray-500' },
  { value: 'queued', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
];

const PRIORITY_OPTIONS: { value: TaskPriority | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Priorities', color: 'bg-gray-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
];

const SORT_OPTIONS: { value: 'created_at' | 'updated_at' | 'due_date' | 'priority'; label: string }[] = [
  { value: 'created_at', label: 'Created Date' },
  { value: 'updated_at', label: 'Updated Date' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
];

export function TaskFilters({
  agents,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  totalCount,
  filteredCount,
}: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFiltersCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    assigneeFilter !== 'all',
    searchQuery.length > 0,
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    onSearchChange('');
    onStatusFilterChange('all');
    onPriorityFilterChange('all');
    onAssigneeFilterChange('all');
  }, [onSearchChange, onStatusFilterChange, onPriorityFilterChange, onAssigneeFilterChange]);

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="space-y-3">
      {/* Main Filter Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
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

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span>Status</span>
              {statusFilter !== 'all' && (
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
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={statusFilter === option.value}
                onCheckedChange={() => onStatusFilterChange(option.value)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  {option.label}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span>Priority</span>
              {priorityFilter !== 'all' && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRIORITY_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={priorityFilter === option.value}
                onCheckedChange={() => onPriorityFilterChange(option.value)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  {option.label}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span>Assignee</span>
              {assigneeFilter !== 'all' && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by Assignee</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={assigneeFilter === 'all'}
              onCheckedChange={() => onAssigneeFilterChange('all')}
            >
              All Assignees
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={assigneeFilter === 'unassigned'}
              onCheckedChange={() => onAssigneeFilterChange('unassigned')}
            >
              Unassigned
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {agents.map((agent) => (
              <DropdownMenuCheckboxItem
                key={agent.id}
                checked={assigneeFilter === agent.id}
                onCheckedChange={() => onAssigneeFilterChange(agent.id)}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={agent.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {agent.name}
                </div>
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
              Search: "{searchQuery}"
              <button onClick={() => onSearchChange('')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Status: {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
              <button onClick={() => onStatusFilterChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {priorityFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Priority: {PRIORITY_OPTIONS.find(p => p.value === priorityFilter)?.label}
              <button onClick={() => onPriorityFilterChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {assigneeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Assignee: {assigneeFilter === 'unassigned' 
                ? 'Unassigned' 
                : agents.find(a => a.id === assigneeFilter)?.name || 'Unknown'}
              <button onClick={() => onAssigneeFilterChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCount} of {totalCount} tasks
      </div>
    </div>
  );
}
