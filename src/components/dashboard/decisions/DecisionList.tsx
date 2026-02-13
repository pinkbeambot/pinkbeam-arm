'use client';

import { useState, useMemo } from 'react';
import { 
  Brain, 
  Clock,
  MoreHorizontal,
  Eye,
  History,
  ArrowRight,
  Sparkles,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
import { cn, formatRelativeTime, formatDateTime, getInitials } from '@/lib/utils';
import type { Decision, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  getConfidenceColor, 
  getConfidenceBadgeVariant, 
  getDecisionStatusIcon, 
  getDecisionStatusColor,
  getDecisionStatusLabel,
  type ConfidenceLevel,
  type DecisionType,
  filterAndSortDecisions 
} from './DecisionFilters';

interface DecisionListProps {
  decisions: Decision[];
  agents: Agent[];
  loading: boolean;
  selectedDecisionId?: string;
  onSelectDecision: (decision: Decision) => void;
  onOverrideDecision: (decision: Decision) => void;
  onViewTask: (taskId: string) => void;
  searchQuery: string;
  agentFilter: string | 'all';
  confidenceFilter: ConfidenceLevel;
  typeFilter: DecisionType;
  dateRange: 'all' | 'today' | 'week' | 'month';
  sortField: 'created_at' | 'confidence' | 'title';
  sortOrder: 'asc' | 'desc';
}

export function DecisionList({
  decisions,
  agents,
  loading,
  selectedDecisionId,
  onSelectDecision,
  onOverrideDecision,
  onViewTask,
  searchQuery,
  agentFilter,
  confidenceFilter,
  typeFilter,
  dateRange,
  sortField,
  sortOrder,
}: DecisionListProps) {
  const filteredDecisions = useMemo(
    () =>
      filterAndSortDecisions(
        decisions,
        searchQuery,
        agentFilter,
        confidenceFilter,
        typeFilter,
        dateRange,
        sortField,
        sortOrder
      ),
    [decisions, searchQuery, agentFilter, confidenceFilter, typeFilter, dateRange, sortField, sortOrder]
  );

  if (loading) {
    return <DecisionListSkeleton />;
  }

  if (filteredDecisions.length === 0) {
    return <EmptyDecisionState hasFilters={searchQuery !== '' || agentFilter !== 'all' || confidenceFilter !== 'all' || typeFilter !== 'all' || dateRange !== 'all'} />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {filteredDecisions.map((decision) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            isSelected={decision.id === selectedDecisionId}
            onSelect={() => onSelectDecision(decision)}
            onOverride={() => onOverrideDecision(decision)}
            onViewTask={() => decision.task_id && onViewTask(decision.task_id)}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

interface DecisionCardProps {
  decision: Decision;
  isSelected: boolean;
  onSelect: () => void;
  onOverride: () => void;
  onViewTask: () => void;
}

function DecisionCard({ decision, isSelected, onSelect, onOverride, onViewTask }: DecisionCardProps) {
  const agent = decision.agent;
  const confidenceVariant = getConfidenceBadgeVariant(decision.confidence);
  const statusIcon = getDecisionStatusIcon(decision.status);
  const statusColorClass = getDecisionStatusColor(decision.status);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Agent Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={agent?.avatar_url || undefined} />
              <AvatarFallback className={cn('text-xs', getConfidenceColor(decision.confidence))}>
                {agent ? getInitials(agent.name) : 'AI'}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">
                    {decision.title}
                  </h3>
                  <Badge variant={confidenceVariant} className="text-xs">
                    {decision.confidence}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {decision.description}
                </p>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {decision.task_id && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewTask(); }}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      View Task
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onOverride(); }}
                    disabled={decision.status === 'overridden'}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Override Decision
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Meta Row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {/* Agent Name */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium">{agent?.name || 'Unknown Agent'}</span>
              </div>

              <Separator orientation="vertical" className="h-4" />

              {/* Status Badge */}
              <Badge variant="outline" className={cn('text-xs', statusColorClass)}>
                <span className="flex items-center gap-1">
                  {statusIcon}
                  {getDecisionStatusLabel(decision.status)}
                </span>
              </Badge>

              <Separator orientation="vertical" className="h-4" />

              {/* Timestamp */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeTime(decision.created_at)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {formatDateTime(decision.created_at)}
                </TooltipContent>
              </Tooltip>

              {/* Task Link */}
              {decision.task_id && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={(e) => { e.stopPropagation(); onViewTask(); }}
                  >
                    View Task
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyDecisionState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Brain className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">
          {hasFilters ? 'No decisions match your filters' : 'No decisions yet'}
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {hasFilters
            ? 'Try adjusting your filters to see more decisions.'
            : 'Decisions appear when agents make choices during task execution. Start by creating tasks and letting agents work on them.'}
        </p>
      </CardContent>
    </Card>
  );
}
