'use client';

import { useState, useMemo } from 'react';
import { 
  Bot, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Settings, 
  Trash2,
  LayoutGrid,
  List,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatRelativeTime, getAgentStatusColor, getAgentStatusLabel, getRoleBadgeColor, getRoleLabel, getInitials, getAvatarColor } from '@/lib/utils';
import type { Agent, AgentStatus, AgentRole, ViewMode, SortField, SortOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  viewMode: ViewMode;
  selectedAgentId?: string;
  onSelectAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onToggleStatus: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
}

export function AgentList({
  agents,
  loading,
  viewMode,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onToggleStatus,
  onDeleteAgent,
}: AgentListProps) {
  if (loading) {
    return <AgentListSkeleton viewMode={viewMode} />;
  }

  if (agents.length === 0) {
    return <EmptyAgentState />;
  }

  return viewMode === 'grid' ? (
    <AgentGridView
      agents={agents}
      selectedAgentId={selectedAgentId}
      onSelectAgent={onSelectAgent}
      onEditAgent={onEditAgent}
      onToggleStatus={onToggleStatus}
      onDeleteAgent={onDeleteAgent}
    />
  ) : (
    <AgentTableView
      agents={agents}
      selectedAgentId={selectedAgentId}
      onSelectAgent={onSelectAgent}
      onEditAgent={onEditAgent}
      onToggleStatus={onToggleStatus}
      onDeleteAgent={onDeleteAgent}
    />
  );
}

function AgentGridView({
  agents,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onToggleStatus,
  onDeleteAgent,
}: Omit<AgentListProps, 'loading' | 'viewMode'>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          onClick={() => onSelectAgent(agent)}
          onEdit={() => onEditAgent(agent)}
          onToggleStatus={() => onToggleStatus(agent)}
          onDelete={() => onDeleteAgent(agent)}
        />
      ))}
    </div>
  );
}

function AgentTableView({
  agents,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onToggleStatus,
  onDeleteAgent,
}: Omit<AgentListProps, 'loading' | 'viewMode'>) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Agent</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Current Task</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Last Active</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map((agent) => (
              <tr
                key={agent.id}
                className={cn(
                  'hover:bg-muted/50 cursor-pointer transition-colors',
                  agent.id === selectedAgentId && 'bg-accent'
                )}
                onClick={() => onSelectAgent(agent)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={agent.avatar_url} />
                        <AvatarFallback className={cn('text-white text-sm', getAvatarColor(agent.name))}>
                          {getInitials(agent.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                        getAgentStatusColor(agent.status)
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{getRoleLabel(agent.role)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className={cn('text-xs', getRoleBadgeColor(agent.role))}>
                    {getRoleLabel(agent.role)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={agent.status} />
                </td>
                <td className="px-4 py-3">
                  {agent.current_task ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-foreground truncate max-w-[200px]">
                        {agent.current_task.title}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No active task</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {agent.last_active_at ? formatRelativeTime(agent.last_active_at) : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditAgent(agent)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/agents/${agent.id}/configure`} className="cursor-pointer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Configure
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(agent)}>
                        {agent.status === 'paused' ? (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Resume Agent
                          </>
                        ) : (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause Agent
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteAgent(agent)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function AgentCard({ agent, isSelected, onClick, onEdit, onToggleStatus, onDelete }: AgentCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={agent.avatar_url} />
                <AvatarFallback className={cn('text-white', getAvatarColor(agent.name))}>
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background',
                      getAgentStatusColor(agent.status)
                    )} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getAgentStatusLabel(agent.status)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{agent.name}</h3>
              <Badge variant="secondary" className={cn('text-xs mt-1', getRoleBadgeColor(agent.role))}>
                {getRoleLabel(agent.role)}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/agents/${agent.id}/configure`} className="cursor-pointer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Configure
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStatus}>
                {agent.status === 'paused' ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={agent.status} />
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Task</span>
            {agent.current_task ? (
              <span className="text-foreground truncate max-w-[140px]" title={agent.current_task.title}>
                {agent.current_task.title}
              </span>
            ) : (
              <span className="text-muted-foreground italic">Idle</span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Active</span>
            <span className="text-foreground">
              {agent.last_active_at ? formatRelativeTime(agent.last_active_at) : 'Never'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const icons = {
    active: CheckCircle2,
    idle: Clock,
    paused: Pause,
    initializing: Circle,
    blocked: AlertCircle,
    error: AlertCircle,
    escaped: AlertCircle,
    terminated: Circle,
  };

  const colors = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    idle: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    paused: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    initializing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    blocked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    escaped: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  const Icon = icons[status] || Circle;

  return (
    <Badge variant="secondary" className={cn('text-xs gap-1', colors[status])}>
      <Icon className="h-3 w-3" />
      {getAgentStatusLabel(status)}
    </Badge>
  );
}

function AgentListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <div className="p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyAgentState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <Bot className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No agents yet
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Create your first AI agent to start building your workforce. 
        Agents can handle tasks, make decisions, and collaborate autonomously.
      </p>
    </div>
  );
}

interface AgentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: AgentStatus | 'all';
  onStatusFilterChange: (status: AgentStatus | 'all') => void;
  roleFilter: AgentRole | 'all';
  onRoleFilterChange: (role: AgentRole | 'all') => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
}

export function AgentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  viewMode,
  onViewModeChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
}: AgentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-1 flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as AgentStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={(v) => onRoleFilterChange(v as AgentRole | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="worker">Worker</SelectItem>
            <SelectItem value="specialist">Specialist</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
          <SelectTrigger className="w-[140px]">
            <span className="text-muted-foreground mr-2">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="last_active">Last Active</SelectItem>
            <SelectItem value="tasks_completed">Tasks</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', sortOrder === 'asc' && 'rotate-180')} />
        </Button>
      </div>

      <div className="flex items-center gap-2 border rounded-lg p-1">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('grid')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function filterAndSortAgents(
  agents: Agent[],
  searchQuery: string,
  statusFilter: AgentStatus | 'all',
  roleFilter: AgentRole | 'all',
  sortField: SortField,
  sortOrder: SortOrder
): Agent[] {
  return agents
    .filter((agent) => {
      const matchesSearch = 
        !searchQuery ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      const matchesRole = roleFilter === 'all' || agent.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'last_active':
          comparison = (a.last_active_at || '').localeCompare(b.last_active_at || '');
          break;
        case 'tasks_completed':
          comparison = ((a.metadata?.tasks_completed as number) || 0) - ((b.metadata?.tasks_completed as number) || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
}
