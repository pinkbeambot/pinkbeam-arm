'use client';

import * as React from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
// Mobile Filter Sheet
// ============================================================================

interface MobileFilterSheetProps {
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  agentOptions: { id: string; name: string }[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

function MobileFilterSheet({ 
  filter, 
  onFilterChange, 
  agentOptions, 
  hasActiveFilters,
  clearFilters 
}: MobileFilterSheetProps) {
  const [open, setOpen] = React.useState(false);

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'sm:hidden relative',
            hasActiveFilters && 'border-primary'
          )}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Filter Activities</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Type Filter */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Activity Type</h4>
            <div className="grid grid-cols-2 gap-2">
              {filterTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    filter.type === type.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Filter */}
          {agentOptions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Agent</h4>
              <Select
                value={filter.agentId || 'all'}
                onValueChange={handleAgentChange}
              >
                <SelectTrigger className="w-full">
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

          {/* Time Range Filter */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Time Range</h4>
            <div className="grid grid-cols-2 gap-2">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleTimeRangeChange(range.value!)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    filter.timeRange === range.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t space-y-3">
            <Button 
              className="w-full" 
              onClick={() => setOpen(false)}
            >
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  clearFilters();
                  setOpen(false);
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
            className="pl-9 h-10"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Mobile Filter Button */}
        <MobileFilterSheet
          filter={filter}
          onFilterChange={onFilterChange}
          agentOptions={agentOptions}
          hasActiveFilters={!!hasActiveFilters}
          clearFilters={clearFilters}
        />
        
        {/* Desktop Filter toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn('hidden sm:flex', showFilters && 'bg-muted')}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
        
        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="hidden sm:flex text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>
      
      {/* Type filter pills - Desktop */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
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

      {/* Mobile Type Filter Pills - Horizontal Scroll */}
      <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {filterTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => handleTypeChange(type.value)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
              filter.type === type.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
      
      {/* Advanced filters - Desktop */}
      {showFilters && (
        <div className="hidden sm:flex items-center gap-4 p-3 rounded-lg bg-muted/50 animate-slide-in">
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
          <span className="text-xs sm:text-sm text-muted-foreground">Active:</span>
          
          {filter.type && filter.type !== 'all' && (
            <ActivityCategoryBadge 
              category={filter.type as Exclude<ActivityFilterType, 'all'>} 
              className="text-[10px] sm:text-xs"
            />
          )}
          
          {filter.agentId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-secondary text-secondary-foreground">
              <span className="hidden sm:inline">Agent: </span>
              {agentOptions.find(a => a.id === filter.agentId)?.name || filter.agentId}
              <button 
                onClick={() => handleAgentChange('all')}
                className="min-h-[16px] min-w-[16px] flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filter.timeRange && filter.timeRange !== '24h' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-secondary text-secondary-foreground">
              {timeRanges.find(r => r.value === filter.timeRange)?.label}
              <button 
                onClick={() => handleTimeRangeChange('24h')}
                className="min-h-[16px] min-w-[16px] flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Mobile clear all */}
          <button
            onClick={clearFilters}
            className="sm:hidden text-[10px] text-primary font-medium ml-auto"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
