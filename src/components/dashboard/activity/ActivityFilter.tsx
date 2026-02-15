'use client';

import * as React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActivityCategoryBadge } from './ActivityIcon';
import type { ActivityFilter, ActivityFilterBarProps, ActivityFilterType } from './types';

// ============================================================================
// Filter Configuration
// ============================================================================

const filterTypes: { value: ActivityFilterType; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'decisions', label: 'Decisions' },
  { value: 'escalations', label: 'Escalations' },
  { value: 'agents', label: 'Agents' },
  { value: 'system', label: 'System' },
];

const timeRanges: { value: ActivityFilter['timeRange']; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

// ============================================================================
// Activity Filter Bar Component
// ============================================================================

export function ActivityFilterBar({
  filter,
  onFilterChange,
  agentOptions = [],
}: ActivityFilterBarProps) {
  const [searchValue, setSearchValue] = React.useState(filter.search || '');
  const [showFilters, setShowFilters] = React.useState(false);
  
  // Debounce search — normalize empty string to undefined so the comparison
  // doesn't treat '' and undefined as different (which would cause an
  // infinite re-render loop).
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const normalizedSearch = searchValue || undefined;
      if (normalizedSearch !== filter.search) {
        onFilterChange({ ...filter, search: normalizedSearch });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, filter, onFilterChange]);
  
  const handleTypeChange = (type: ActivityFilterType) => {
    onFilterChange({ ...filter, type });
  };
  
  const handleAgentChange = (agentId: string) => {
    onFilterChange({ 
      ...filter, 
      agentId: agentId === 'all' ? undefined : agentId 
    });
  };
  
  const handleTimeRangeChange = (value: string) => {
    onFilterChange({ ...filter, timeRange: value as ActivityFilter['timeRange'] });
  };
  
  const clearFilters = () => {
    setSearchValue('');
    onFilterChange({});
  };
  
  const hasActiveFilters = filter.type || filter.agentId || filter.timeRange || filter.search;
  
  return (
    <div className="space-y-3">
      {/* Main filter row */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Filter toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-muted')}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
        
        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
      
      {/* Type filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => handleTypeChange(type.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter.type === type.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
      
      {/* Advanced filters */}
      {showFilters && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 animate-slide-in">
          {/* Agent filter */}
          {agentOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Agent:</span>
              <Select
                value={filter.agentId || 'all'}
                onValueChange={handleAgentChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agentOptions.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Time range filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time:</span>
            <Select
              value={filter.timeRange || '24h'}
              onValueChange={handleTimeRangeChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Last 24 hours" />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value!}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {filter.type && filter.type !== 'all' && (
            <ActivityCategoryBadge category={filter.type as Exclude<ActivityFilterType, 'all'>} />
          )}
          
          {filter.agentId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
              Agent: {agentOptions.find(a => a.id === filter.agentId)?.name || filter.agentId}
              <button onClick={() => handleAgentChange('all')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filter.timeRange && filter.timeRange !== '24h' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
              {timeRanges.find(r => r.value === filter.timeRange)?.label}
              <button onClick={() => handleTimeRangeChange('24h')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
