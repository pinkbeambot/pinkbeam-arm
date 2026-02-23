'use client';

import { CheckCircle2, Clock, Copy, MoreHorizontal, Pause, Play, Settings, Trash2, ExternalLink, AlertCircle, Circle, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn, formatRelativeTime, getAgentStatusColor, getAgentStatusLabel, getRoleBadgeColor, getRoleLabel, getInitials, getAvatarColor } from '@/lib/utils';
import type { Agent, AgentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';

interface AgentTableViewProps {
  agents: Agent[];
  selectedAgentId?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (agentId: string) => void;
  onSelectAll?: () => void;
  onSelectAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onToggleStatus?: (agent: Agent) => void;
  onDeleteAgent?: (agent: Agent) => void;
  onCloneAgent: (agent: Agent) => void;
}

export function AgentTableView({
  agents,
  selectedAgentId,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onSelectAgent,
  onEditAgent,
  onToggleStatus,
  onDeleteAgent,
  onCloneAgent,
}: AgentTableViewProps) {
  const selectionEnabled = !!selectedIds && !!onToggleSelect;
  const allSelected = selectionEnabled && agents.length > 0 && agents.every(a => selectedIds!.has(a.id));
  const someSelected = selectionEnabled && agents.some(a => selectedIds!.has(a.id)) && !allSelected;

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {selectionEnabled && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={() => onSelectAll?.()}
                    aria-label="Select all agents"
                  />
                </th>
              )}
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
                {selectionEnabled && (
                  <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds!.has(agent.id)}
                      onCheckedChange={() => onToggleSelect!(agent.id)}
                      aria-label={`Select ${agent.name}`}
                    />
                  </td>
                )}
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
                      <DropdownMenuItem onClick={() => onCloneAgent(agent)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone Agent
                      </DropdownMenuItem>
                      {onToggleStatus && (
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
                      )}
                      {onDeleteAgent && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteAgent(agent)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Agent
                          </DropdownMenuItem>
                        </>
                      )}
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

function StatusBadge({ status }: { status: AgentStatus }) {
  const icons = {
    active: CheckCircle2,
    busy: Zap,
    idle: Clock,
    paused: Pause,
    initializing: Circle,
    blocked: AlertCircle,
    error: AlertCircle,
    offline: Circle,
    escaped: AlertCircle,
    terminated: Circle,
  };

  const colors = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    busy: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    idle: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    paused: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    initializing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    blocked: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
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
