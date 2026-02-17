'use client';

import { CheckCircle2, Clock, Copy, MoreHorizontal, Pause, Play, Settings, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn, formatRelativeTime, getAgentStatusColor, getAgentStatusLabel, getRoleBadgeColor, getRoleLabel, getInitials, getAvatarColor } from '@/lib/utils';
import type { Agent, AgentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgentGridViewProps {
  agents: Agent[];
  selectedAgentId?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (agentId: string) => void;
  onSelectAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onToggleStatus?: (agent: Agent) => void;
  onDeleteAgent?: (agent: Agent) => void;
  onCloneAgent: (agent: Agent) => void;
}

export function AgentGridView({
  agents,
  selectedAgentId,
  selectedIds,
  onToggleSelect,
  onSelectAgent,
  onEditAgent,
  onToggleStatus,
  onDeleteAgent,
  onCloneAgent,
}: AgentGridViewProps) {
  const selectionEnabled = !!selectedIds && !!onToggleSelect;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          isChecked={selectionEnabled ? selectedIds!.has(agent.id) : undefined}
          onToggleSelect={selectionEnabled ? () => onToggleSelect!(agent.id) : undefined}
          onClick={() => onSelectAgent(agent)}
          onEdit={() => onEditAgent(agent)}
          onToggleStatus={onToggleStatus ? () => onToggleStatus(agent) : undefined}
          onDelete={onDeleteAgent ? () => onDeleteAgent(agent) : undefined}
          onClone={() => onCloneAgent(agent)}
        />
      ))}
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  isChecked?: boolean;
  onToggleSelect?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  onClone?: () => void;
}

function AgentCard({ agent, isSelected, isChecked, onToggleSelect, onClick, onEdit, onToggleStatus, onDelete, onClone }: AgentCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative',
        isSelected && 'ring-2 ring-primary',
        isChecked && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={() => onClick?.()}
    >
      <CardContent className="p-4">
        {onToggleSelect !== undefined && (
          <div
            className="absolute top-3 left-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggleSelect()}
              aria-label={`Select ${agent.name}`}
            />
          </div>
        )}
        <div className="flex items-start justify-between">
          <div className={cn("flex items-center gap-3", onToggleSelect !== undefined && "ml-7")}>
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
              <DropdownMenuItem onClick={onClone}>
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </DropdownMenuItem>
              {onToggleStatus && (
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
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
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
    initializing: Clock,
    blocked: AlertCircle,
    error: AlertCircle,
    escaped: AlertCircle,
    terminated: Clock,
  };

  const colors = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    idle: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    paused: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    initializing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    blocked: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    escaped: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  const Icon = icons[status] || CheckCircle2;

  return (
    <Badge variant="secondary" className={cn('text-xs gap-1', colors[status])}>
      <Icon className="h-3 w-3" />
      {getAgentStatusLabel(status)}
    </Badge>
  );
}
