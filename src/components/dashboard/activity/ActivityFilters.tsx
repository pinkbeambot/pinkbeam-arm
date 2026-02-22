/**
 * ActivityFilters Component
 * 
 * A comprehensive filter panel for the activity feed with:
 * - Entity type tabs (All, Tasks, Decisions, Escalations, Agents, System)
 * - Time range selector (1h, 24h, 7d, 30d, All)
 * - Agent selector dropdown
 * - Action type multi-select
 * - Clear filters button
 * 
 * Can be used as a sidebar or top bar depending on layout needs.
 */

import * as React from 'react';
import { X, Filter, Clock, Users, Zap, AlertCircle, Bot, FileText, Brain, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EntityType, TimeRange, ActionType } from '@/hooks/useActivities';

// ============================================================================
// Filter Configuration
// ============================================================================

const entityTypes: { value: EntityType; label: string; icon: typeof FileText; color: string }[] = [
  { value: 'all', label: 'All Activity', icon: Zap, color: 'text-foreground' },
  { value: 'tasks', label: 'Tasks', icon: FileText, color: 'text-blue-500' },
  { value: 'decisions', label: 'Decisions', icon: Brain, color: 'text-amber-500' },
  { value: 'escalations', label: 'Escalations', icon: AlertCircle, color: 'text-red-500' },
  { value: 'agents', label: 'Agents', icon: Bot, color: 'text-pink-500' },
  { value: 'system', label: 'System', icon: CheckCircle2, color: 'text-gray-500' },
];

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

const allActionTypes: { value: ActionType; label: string; category: EntityType }[] = [
  // Agent actions
  { value: 'agent.spawned', label: 'Agent Spawned', category: 'agents' },
  { value: 'agent.status_changed', label: 'Status Changed', category: 'agents' },
  { value: 'agent.terminated', label: 'Agent Terminated', category: 'agents' },
  // Task actions
  { value: 'task.created', label: 'Task Created', category: 'tasks' },
  { value: 'task.assigned', label: 'Task Assigned', category: 'tasks' },
  { value: 'task.started', label: 'Task Started', category: 'tasks' },
  { value: 'task.progress', label: 'Task Progress', category: 'tasks' },
  { value: 'task.completed', label: 'Task Completed', category: 'tasks' },
  { value: 'task.failed', label: 'Task Failed', category: 'tasks' },
  // Decision actions
  { value: 'decision.proposed', label: 'Decision Proposed', category: 'decisions' },
  { value: 'decision.made', label: 'Decision Made', category: 'decisions' },
  { value: 'decision.overridden', label: 'Decision Overridden', category: 'decisions' },
  // Escalation actions
  { value: 'escalation.created', label: 'Escalation Created', category: 'escalations' },
  { value: 'escalation.resolved', label: 'Escalation Resolved', category: 'escalations' },
  // Message actions
  { value: 'message.sent', label: 'Message Sent', category: 'system' },
  { value: 'message.received', label: 'Message Received', category: 'system' },
  // System actions
  { value: 'system.error', label: 'System Error', category: 'system' },
  { value: 'system.config_changed', label: 'Config Changed', category: 'system' },
];

// ============================================================================
// Props Interface
// ============================================================================

export interface ActivityFiltersProps {
  /** Current entity type filter */
  entityType?: EntityType;
  /** Current time range filter */
  timeRange?: TimeRange;
  /** Current agent ID filter */
  agentId?: string;
  /** Current selected action types */
  actionTypes?: ActionType[];
  /** Search query */
  search?: string;
  /** List of available agents for dropdown */
  agents?: { id: string; name: string; avatar_url?: string }[];
  /** Whether agents are loading */
  isLoadingAgents?: boolean;
  /** Callback when filters change */
  onFiltersChange: (filters: {
    entityType?: EntityType;
    timeRange?: TimeRange;
    agentId?: string;
    actionTypes?: ActionType[];
    search?: string;
  }) => void;
  /** Callback to clear all filters */
  onClearFilters?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Layout variant */
  variant?: 'sidebar' | 'horizontal' | 'compact';
  /** Show search input */
  showSearch?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActiveFilterCount(
  entityType: EntityType,
  timeRange: TimeRange,
  agentId?: string,
  actionTypes?: ActionType[],
  search?: string
): number {
  let count = 0;
  if (entityType !== 'all') count++;
  if (timeRange !== '24h') count++;
  if (agentId) count++;
  if (actionTypes && actionTypes.length > 0) count++;
  if (search) count++;
  return count;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Entity Type Tabs
 */
function EntityTypeTabs({
  value,
  onChange,
}: {
  value: EntityType;
  onChange: (value: EntityType) => void;
}) {
  return (
    <div className="space-y-1">
      {entityTypes.map((type) => {
        const Icon = type.icon;
        const isActive = value === type.value;

        return (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className={cn('w-4 h-4', !isActive && type.color)} />
            <span className="flex-1 text-left">{type.label}</span>
            {isActive && <CheckCircle2 className="w-4 h-4" />}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Action Type Multi-Select
 */
function ActionTypeSelector({
  selected,
  onChange,
  entityType,
}: {
  selected: ActionType[];
  onChange: (types: ActionType[]) => void;
  entityType: EntityType;
}) {
  const filteredTypes =
    entityType === 'all'
      ? allActionTypes
      : allActionTypes.filter((t) => t.category === entityType);

  const toggleAction = (value: ActionType) => {
    if (selected.includes(value)) {
      onChange(selected.filter((t) => t !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {selected.length === 0
              ? 'All actions'
              : `${selected.length} action${selected.length > 1 ? 's' : ''} selected`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Filter by action type</p>
        </div>
        <ScrollArea className="h-64">
          <div className="p-3 space-y-2">
            {filteredTypes.map((action) => (
              <label
                key={action.value}
                className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(action.value)}
                  onCheckedChange={() => toggleAction(action.value)}
                />
                <span className="text-sm">{action.label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Time Range Selector
 */
function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Time Range
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={cn(
              'px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
              value === range.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Agent Selector
 */
function AgentSelector({
  value,
  onChange,
  agents,
  isLoading,
}: {
  value?: string;
  onChange: (value?: string) => void;
  agents?: { id: string; name: string; avatar_url?: string }[];
  isLoading?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Users className="w-4 h-4" />
        Agent
      </label>
      <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? undefined : v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? 'Loading agents...' : 'All agents'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All agents</SelectItem>
          {agents?.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                {agent.avatar_url ? (
                  <img
                    src={agent.avatar_url}
                    alt={agent.name}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-3 h-3" />
                  </div>
                )}
                <span>{agent.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ActivityFilters({
  entityType = 'all',
  timeRange = '24h',
  agentId,
  actionTypes = [],
  search = '',
  agents = [],
  isLoadingAgents = false,
  onFiltersChange,
  onClearFilters,
  className,
  variant = 'sidebar',
  showSearch = true,
}: ActivityFiltersProps) {
  const [localSearch, setLocalSearch] = React.useState(search);
  const activeFilterCount = getActiveFilterCount(
    entityType,
    timeRange,
    agentId,
    actionTypes,
    localSearch
  );

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onFiltersChange({
          entityType,
          timeRange,
          agentId,
          actionTypes,
          search: localSearch || undefined,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, search, entityType, timeRange, agentId, actionTypes, onFiltersChange]);

  const handleEntityTypeChange = (value: EntityType) => {
    // Clear action types when changing entity type to avoid conflicts
    const newActionTypes = actionTypes.filter((t) => {
      const actionInfo = allActionTypes.find((a) => a.value === t);
      return actionInfo?.category === value || value === 'all';
    });

    onFiltersChange({
      entityType: value,
      timeRange,
      agentId,
      actionTypes: newActionTypes.length > 0 ? newActionTypes : undefined,
      search: localSearch || undefined,
    });
  };

  const handleClearFilters = () => {
    setLocalSearch('');
    onFiltersChange({
      entityType: 'all',
      timeRange: '24h',
      agentId: undefined,
      actionTypes: undefined,
      search: undefined,
    });
    onClearFilters?.();
  };

  // Compact variant (horizontal pills)
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {entityTypes.map((type) => {
          const Icon = type.icon;
          const isActive = entityType === type.value;

          return (
            <button
              key={type.value}
              onClick={() => handleEntityTypeChange(type.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', !isActive && type.color)} />
              {type.label}
            </button>
          );
        })}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleClearFilters}
          >
            <X className="w-3 h-3 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    );
  }

  // Horizontal variant (top bar style)
  if (variant === 'horizontal') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Entity Type Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {entityTypes.map((type) => {
            const Icon = type.icon;
            const isActive = entityType === type.value;

            return (
              <button
                key={type.value}
                onClick={() => handleEntityTypeChange(type.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', !isActive && type.color)} />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Secondary filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          {showSearch && (
            <div className="relative flex-1 max-w-xs">
              <Input
                placeholder="Search activities..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="h-9"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <Select
            value={timeRange}
            onValueChange={(v) =>
              onFiltersChange({
                entityType,
                timeRange: v as TimeRange,
                agentId,
                actionTypes,
                search: localSearch || undefined,
              })
            }
          >
            <SelectTrigger className="w-36 h-9">
              <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={agentId || 'all'}
            onValueChange={(v) =>
              onFiltersChange({
                entityType,
                timeRange,
                agentId: v === 'all' ? undefined : v,
                actionTypes,
                search: localSearch || undefined,
              })
            }
          >
            <SelectTrigger className="w-40 h-9">
              <Users className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agents?.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ActionTypeSelector
            selected={actionTypes}
            onChange={(types) =>
              onFiltersChange({
                entityType,
                timeRange,
                agentId,
                actionTypes: types.length > 0 ? types : undefined,
                search: localSearch || undefined,
              })
            }
            entityType={entityType}
          />

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={handleClearFilters}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Sidebar variant (default)
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleClearFilters}
          >
            <X className="w-3 h-3 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="space-y-2">
          <div className="relative">
            <Input
              placeholder="Search activities..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pr-8"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Entity Type */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          Activity Type
        </label>
        <EntityTypeTabs value={entityType} onChange={handleEntityTypeChange} />
      </div>

      <Separator />

      {/* Time Range */}
      <TimeRangeSelector
        value={timeRange}
        onChange={(value) =>
          onFiltersChange({
            entityType,
            timeRange: value,
            agentId,
            actionTypes,
            search: localSearch || undefined,
          })
        }
      />

      <Separator />

      {/* Agent Selector */}
      <AgentSelector
        value={agentId}
        onChange={(value) =>
          onFiltersChange({
            entityType,
            timeRange,
            agentId: value,
            actionTypes,
            search: localSearch || undefined,
          })
        }
        agents={agents}
        isLoading={isLoadingAgents}
      />

      {/* Action Types */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Action Type
        </label>
        <ActionTypeSelector
          selected={actionTypes}
          onChange={(types) =>
            onFiltersChange({
              entityType,
              timeRange,
              agentId,
              actionTypes: types.length > 0 ? types : undefined,
              search: localSearch || undefined,
            })
          }
          entityType={entityType}
        />
      </div>

      {/* Active Filter Summary */}
      {activeFilterCount > 0 && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-1.5">
            {entityType !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {entityTypes.find((t) => t.value === entityType)?.label}
                <button
                  onClick={() => handleEntityTypeChange('all')}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {timeRange !== '24h' && (
              <Badge variant="secondary" className="text-xs">
                {timeRanges.find((r) => r.value === timeRange)?.label}
                <button
                  onClick={() =>
                    onFiltersChange({
                      entityType,
                      timeRange: '24h',
                      agentId,
                      actionTypes,
                      search: localSearch || undefined,
                    })
                  }
                  className="ml-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {agentId && (
              <Badge variant="secondary" className="text-xs">
                {agents.find((a) => a.id === agentId)?.name || 'Agent'}
                <button
                  onClick={() =>
                    onFiltersChange({
                      entityType,
                      timeRange,
                      agentId: undefined,
                      actionTypes,
                      search: localSearch || undefined,
                    })
                  }
                  className="ml-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {actionTypes.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {allActionTypes.find((a) => a.value === type)?.label}
                <button
                  onClick={() =>
                    onFiltersChange({
                      entityType,
                      timeRange,
                      agentId,
                      actionTypes: actionTypes.filter((t) => t !== type),
                      search: localSearch || undefined,
                    })
                  }
                  className="ml-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ActivityFilters;
