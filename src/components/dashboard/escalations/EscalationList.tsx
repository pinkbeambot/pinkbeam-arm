'use client';

import { useMemo, useState } from 'react';
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
  Brain,
  ChevronRight,
  SlidersHorizontal,
  X
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
    <ScrollArea className="h-[calc(100vh-300px)] sm:h-[calc(100vh-280px)]">
      <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
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
        'active:scale-[0.99]',
        isSelected && 'ring-2 ring-primary shadow-md',
        escalation.status === 'resolved' && 'opacity-75'
      )}
      onClick={onClick}
    >
      {/* Priority indicator bar */}
      <div 
        className={cn('absolute left-0 top-0 bottom-0 w-1 sm:w-1.5', urgencyConfig.bgColor)} 
      />
      
      <CardContent className="p-3 sm:p-4 pl-4 sm:pl-5">
        <div className="flex items-start gap-3">
          {/* Agent Avatar - Hidden on mobile */}
          <div className="relative flex-shrink-0 hidden sm:block">
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
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Mobile urgency dot */}
                  <span className={cn('sm:hidden w-2 h-2 rounded-full', urgencyConfig.bgColor)} />
                  
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {escalation.agent?.name || 'Unknown Agent'}
                  </span>
                  
                  <Badge 
                    variant="secondary" 
                    className={cn('text-[10px] sm:text-xs hidden sm:inline-flex', urgencyConfig.badgeColor)}
                  >
                    {urgencyConfig.icon}
                    <span className="ml-1 capitalize">{escalation.urgency}</span>
                  </Badge>
                  
                  {/* Mobile urgency badge */}
                  <Badge 
                    variant="secondary" 
                    className={cn('text-[10px] sm:hidden px-1.5 py-0', urgencyConfig.badgeColor)}
                  >
                    {escalation.urgency.charAt(0).toUpperCase()}
                  </Badge>

                  <Badge 
                    variant="outline" 
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2.5"
                  >
                    <span className="hidden sm:inline">{typeConfig.icon}</span>
                    <span className="sm:ml-1 capitalize">{escalation.type}</span>
                  </Badge>
                </div>

                {/* Title */}
                <h4 className={cn(
                  'font-semibold text-sm sm:text-base text-foreground mt-1 line-clamp-1',
                  escalation.status === 'open' && escalation.urgency === 'critical' && 'text-red-600 dark:text-red-400'
                )}>
                  {escalation.title}
                </h4>

                {/* Summary */}
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                  {escalation.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2 sm:mt-3">
                  <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {waitingTime}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{formatRelativeTime(escalation.created_at)}</span>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden sm:flex items-center gap-1">
                    {escalation.status === 'open' && (
                      <>
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
                            <Button variant="ghost" size="icon" className="h-7 w-7 min-h-[32px] min-w-[32px]">
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
                      </>
                    )}

                    {escalation.status === 'resolved' && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>

                  {/* Mobile Chevron */}
                  <ChevronRight className="h-5 w-5 text-muted-foreground sm:hidden" />
                </div>

                {/* Mobile Actions Row */}
                {escalation.status === 'open' && (
                  <div className="flex items-center gap-2 mt-3 sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve();
                      }}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                    {onTakeOver && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTakeOver();
                        }}
                      >
                        <User className="h-3 w-3 mr-1" />
                        Take Over
                      </Button>
                    )}
                  </div>
                )}
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
    <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-3 sm:p-4 pl-4 sm:pl-5">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0 hidden sm:block" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 sm:h-4 w-20 sm:w-24" />
                  <Skeleton className="h-3.5 sm:h-4 w-14 sm:w-16" />
                </div>
                <Skeleton className="h-4 sm:h-5 w-3/4" />
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-2.5 sm:h-3 w-28 sm:w-32" />
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
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-950 mb-4 sm:mb-6">
        <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
        No escalations
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4 sm:mb-6">
        Your agents are handling things autonomously! 
        Escalations will appear here when agents need your input.
      </p>
      <div className="text-xs sm:text-sm text-muted-foreground">
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
    policy_violation: {
      label: 'Policy Violation',
      icon: <XCircle className="h-3 w-3" />,
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

// ============================================================================
// Mobile Filter Sheet
// ============================================================================

interface MobileEscalationFiltersProps {
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

export function MobileEscalationFilters({
  statusFilter,
  onStatusFilterChange,
  urgencyFilter,
  onUrgencyFilterChange,
  typeFilter,
  onTypeFilterChange,
  agentFilter,
  onAgentFilterChange,
  agents,
}: MobileEscalationFiltersProps) {
  const hasFilters = statusFilter !== 'open' || urgencyFilter !== 'all' || typeFilter !== 'all' || agentFilter !== 'all';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'sm:hidden relative',
            hasFilters && 'border-primary'
          )}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {hasFilters && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Filter Escalations</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'open', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusFilterChange(status)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize',
                    statusFilter === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency Filter */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Urgency</h4>
            <div className="grid grid-cols-2 gap-2">
              {(['all', 'critical', 'high', 'normal', 'low'] as const).map((urgency) => (
                <button
                  key={urgency}
                  onClick={() => onUrgencyFilterChange(urgency)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize',
                    urgencyFilter === urgency
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {urgency === 'all' ? 'All Priorities' : urgency}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
            <div className="grid grid-cols-2 gap-2">
              {(['all', 'clarification', 'approval', 'error', 'edge_case'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => onTypeFilterChange(type)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize',
                    typeFilter === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {type === 'all' ? 'All Types' : type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Filter */}
          {agents.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Agent</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                <button
                  onClick={() => onAgentFilterChange('all')}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    agentFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  All Agents
                </button>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => onAgentFilterChange(agent.id)}
                    className={cn(
                      'w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                      agentFilter === agent.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Filters component - Desktop
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
  const hasFilters = statusFilter !== 'open' || urgencyFilter !== 'all' || typeFilter !== 'all' || agentFilter !== 'all';

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
      {/* Mobile Filters */}
      <MobileEscalationFilters
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        urgencyFilter={urgencyFilter}
        onUrgencyFilterChange={onUrgencyFilterChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        agentFilter={agentFilter}
        onAgentFilterChange={onAgentFilterChange}
        agents={agents}
      />

      {/* Desktop Filters */}
      <div className="hidden sm:flex flex-wrap gap-3 items-center">
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

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              onStatusFilterChange('open');
              onUrgencyFilterChange('all');
              onTypeFilterChange('all');
              onAgentFilterChange('all');
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
