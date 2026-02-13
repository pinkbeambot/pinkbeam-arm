'use client';

import { useMemo } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal, 
  CheckCheck,
  ArrowRight,
  User,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Brain
} from 'lucide-react';
import { cn, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Escalation, EscalationUrgency, EscalationType } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EscalationListProps {
  escalations: Escalation[];
  loading: boolean;
  selectedEscalationId?: string;
  onSelectEscalation: (escalation: Escalation) => void;
  onResolve: (escalation: Escalation) => void;
  onTakeOver?: (escalation: Escalation) => void;
}

export function EscalationList({
  escalations,
  loading,
  selectedEscalationId,
  onSelectEscalation,
  onResolve,
  onTakeOver,
}: EscalationListProps) {
  if (loading) {
    return <EscalationListSkeleton />;
  }

  if (escalations.length === 0) {
    return <EmptyEscalationState />;
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-3 pr-4">
        {escalations.map((escalation) => (
          <EscalationCard
            key={escalation.id}
            escalation={escalation}
            isSelected={escalation.id === selectedEscalationId}
            onClick={() => onSelectEscalation(escalation)}
            onResolve={() => onResolve(escalation)}
            onTakeOver={onTakeOver ? () => onTakeOver(escalation) : undefined}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface EscalationCardProps {
  escalation: Escalation;
  isSelected?: boolean;
  onClick: () => void;
  onResolve: () => void;
  onTakeOver?: () => void;
}

function EscalationCard({ 
  escalation, 
  isSelected, 
  onClick, 
  onResolve,
  onTakeOver 
}: EscalationCardProps) {
  const urgencyConfig = getUrgencyConfig(escalation.urgency);
  const typeConfig = getTypeConfig(escalation.type);
  const waitingTime = getWaitingTime(escalation.created_at);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative overflow-hidden',
        isSelected && 'ring-2 ring-primary shadow-md',
        escalation.status === 'resolved' && 'opacity-75'
      )}
      onClick={onClick}
    >
      {/* Priority indicator bar */}
      <div 
        className={cn('absolute left-0 top-0 bottom-0 w-1', urgencyConfig.bgColor)} 
      />
      
      <CardContent className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Agent Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={escalation.agent?.avatar_url} />
              <AvatarFallback className={cn('text-white text-xs', getAvatarColor(escalation.agent?.id || escalation.agent_id))}>
                {getInitials(escalation.agent?.name || 'Unknown')}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
              urgencyConfig.bgColor
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {escalation.agent?.name || 'Unknown Agent'}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn('text-xs', urgencyConfig.badgeColor)}
                  >
                    {urgencyConfig.icon}
                    <span className="ml-1 capitalize">{escalation.urgency}</span>
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                  >
                    {typeConfig.icon}
                    <span className="ml-1 capitalize">{escalation.type}</span>
                  </Badge>
                </div>

                {/* Title */}
                <h4 className={cn(
                  'font-semibold text-foreground mt-1 line-clamp-1',
                  escalation.status === 'open' && escalation.urgency === 'critical' && 'text-red-600 dark:text-red-400'
                )}>
                  {escalation.title}
                </h4>

                {/* Summary */}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {escalation.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {waitingTime}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeTime(escalation.created_at)}</span>
                  </div>

                  {escalation.status === 'open' && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve();
                        }}
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Resolve
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={onResolve}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark Resolved
                          </DropdownMenuItem>
                          {onTakeOver && (
                            <DropdownMenuItem onClick={onTakeOver}>
                              <User className="mr-2 h-4 w-4" />
                              Take Over
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-muted-foreground">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {escalation.status === 'resolved' && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EscalationListSkeleton() {
  return (
    <div className="space-y-3 pr-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 pl-5">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyEscalationState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-950 mb-6">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No escalations
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Your agents are handling things autonomously! 
        Escalations will appear here when agents need your input.
      </p>
      <div className="text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          New escalations will trigger a notification
        </p>
      </div>
    </div>
  );
}

// Helper functions
function getUrgencyConfig(urgency: EscalationUrgency) {
  const configs = {
    critical: {
      label: 'Critical',
      bgColor: 'bg-red-500',
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    high: {
      label: 'High',
      bgColor: 'bg-orange-500',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      icon: <AlertCircle className="h-3 w-3" />,
    },
    normal: {
      label: 'Normal',
      bgColor: 'bg-amber-500',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      icon: <Clock className="h-3 w-3" />,
    },
    low: {
      label: 'Low',
      bgColor: 'bg-blue-500',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      icon: <HelpCircle className="h-3 w-3" />,
    },
  };

  return configs[urgency] || configs.normal;
}

function getTypeConfig(type: EscalationType) {
  const configs = {
    clarification: {
      label: 'Clarification',
      icon: <HelpCircle className="h-3 w-3" />,
    },
    approval: {
      label: 'Approval',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    error: {
      label: 'Error',
      icon: <XCircle className="h-3 w-3" />,
    },
    edge_case: {
      label: 'Edge Case',
      icon: <Brain className="h-3 w-3" />,
    },
  };

  return configs[type] || configs.clarification;
}

function getWaitingTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m waiting`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h waiting`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d waiting`;
}

// Filters component
interface EscalationFiltersProps {
  statusFilter: 'open' | 'resolved' | 'all';
  onStatusFilterChange: (status: 'open' | 'resolved' | 'all') => void;
  urgencyFilter: EscalationUrgency | 'all';
  onUrgencyFilterChange: (urgency: EscalationUrgency | 'all') => void;
  typeFilter: EscalationType | 'all';
  onTypeFilterChange: (type: EscalationType | 'all') => void;
  agentFilter: string | 'all';
  onAgentFilterChange: (agent: string | 'all') => void;
  agents: { id: string; name: string }[];
}

export function EscalationFilters({
  statusFilter,
  onStatusFilterChange,
  urgencyFilter,
  onUrgencyFilterChange,
  typeFilter,
  onTypeFilterChange,
  agentFilter,
  onAgentFilterChange,
  agents,
}: EscalationFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Status Filter */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {(['all', 'open', 'resolved'] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => onStatusFilterChange(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Urgency Filter */}
      <select
        value={urgencyFilter}
        onChange={(e) => onUrgencyFilterChange(e.target.value as EscalationUrgency | 'all')}
        className="h-8 px-3 text-sm rounded-md border border-input bg-background"
      >
        <option value="all">All Priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="normal">Normal</option>
        <option value="low">Low</option>
      </select>

      {/* Type Filter */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value as EscalationType | 'all')}
        className="h-8 px-3 text-sm rounded-md border border-input bg-background"
      >
        <option value="all">All Types</option>
        <option value="clarification">Clarification</option>
        <option value="approval">Approval</option>
        <option value="error">Error</option>
        <option value="edge_case">Edge Case</option>
      </select>

      {/* Agent Filter */}
      <select
        value={agentFilter}
        onChange={(e) => onAgentFilterChange(e.target.value)}
        className="h-8 px-3 text-sm rounded-md border border-input bg-background"
      >
        <option value="all">All Agents</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
    </div>
  );
}
