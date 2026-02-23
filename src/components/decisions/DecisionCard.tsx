'use client';

/**
 * DecisionCard Component
 * 
 * Displays a single decision with status badge, agent info, and proposed action.
 * Features:
 * - Status badges with color coding (proposed=yellow, approved=green, rejected=red, overridden=orange, executed=blue)
 * - Priority indicators (low, normal, high, urgent)
 * - Agent avatar and name
 * - Proposed action preview
 * - Confidence level indicator
 * - Click to view details
 */

import * as React from 'react';
import { 
  Brain, 
  Clock, 
  ChevronRight,
  Zap,
  ArrowUpCircle,
  Circle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { cn, formatRelativeTime, formatDateTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Decision, DecisionStatus, DecisionPriority, Agent } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// ============================================================================
// Status Configuration
// ============================================================================

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const statusConfig: Record<DecisionStatus, StatusConfig> = {
  proposed: {
    label: 'Proposed',
    color: '#eab308',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: 'border-yellow-200',
    icon: <Circle className="w-3 h-3" />,
  },
  approved: {
    label: 'Approved',
    color: '#22c55e',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  overridden: {
    label: 'Overridden',
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200',
    icon: <ArrowUpCircle className="w-3 h-3" />,
  },
  executed: {
    label: 'Executed',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200',
    icon: <Zap className="w-3 h-3" />,
  },
};

// ============================================================================
// Priority Configuration
// ============================================================================

interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const priorityConfig: Record<DecisionPriority, PriorityConfig> = {
  urgent: {
    label: 'Urgent',
    color: '#ef4444',
    bgColor: 'bg-red-500',
    icon: <Zap className="w-3 h-3" />,
  },
  high: {
    label: 'High',
    color: '#f97316',
    bgColor: 'bg-orange-500',
    icon: <ArrowUpCircle className="w-3 h-3" />,
  },
  normal: {
    label: 'Normal',
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
    icon: <Circle className="w-3 h-3" />,
  },
  low: {
    label: 'Low',
    color: '#6b7280',
    bgColor: 'bg-gray-500',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getConfidenceVariant(confidence: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (confidence >= 90) return 'default';
  if (confidence >= 70) return 'secondary';
  return 'destructive';
}

function formatProposedAction(action: Record<string, unknown> | undefined): string {
  if (!action) return 'No action details';
  const type = action.type as string || action.action as string || 'Unknown action';
  return type;
}

// ============================================================================
// Props Interface
// ============================================================================

export interface DecisionCardProps {
  /** The decision to display */
  decision: Decision;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when view details is clicked */
  onViewDetails?: () => void;
  /** Optional className for styling */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DecisionCard({
  decision,
  isSelected = false,
  onClick,
  onViewDetails,
  className,
}: DecisionCardProps) {
  const agent = decision.agent;
  const status = statusConfig[decision.status];
  const priority = decision.priority ? priorityConfig[decision.priority] : null;
  const confidenceVariant = getConfidenceVariant(decision.confidence);

  const handleClick = React.useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleViewDetails = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.();
  }, [onViewDetails]);

  return (
    <TooltipProvider>
      <Card
        className={cn(
          // Base styles
          'group relative bg-card border rounded-lg overflow-hidden',
          'cursor-pointer transition-all duration-200',
          'hover:shadow-md hover:border-primary/30',
          'active:scale-[0.99]',
          
          // Selection state
          isSelected && 'ring-2 ring-primary ring-offset-2',
          
          // Border color based on status
          'border-l-4',
          
          className
        )}
        style={{ borderLeftColor: status.color }}
        onClick={handleClick}
        data-testid={`decision-card-${decision.id}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`${decision.title}, ${status.label} status${priority ? `, ${priority.label} priority` : ''}`}
      >
        {/* Priority Indicator (top-right corner) */}
        {priority && (
          <div className={cn(
            'absolute top-0 right-0 w-0 h-0',
            'border-t-[24px] border-l-[24px] border-transparent',
          )} style={{ borderTopColor: priority.color }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute -top-[20px] right-1 text-white">
                  {priority.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{priority.label} Priority</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Agent Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-background">
                <AvatarImage src={agent?.avatar_url || undefined} />
                <AvatarFallback 
                  className={cn(
                    'text-xs text-white',
                    getAvatarColor(agent?.id || decision.agent_id)
                  )}
                >
                  {agent ? getInitials(agent.name) : 'AI'}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-2 pr-6">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate pr-2">
                    {decision.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {decision.description}
                  </p>
                </div>

                {/* View Details Button (hover only) */}
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={handleViewDetails}
                    aria-label="View details"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>

              {/* Proposed Action Preview */}
              {decision.proposed_action && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {formatProposedAction(decision.proposed_action)}
                  </span>
                </div>
              )}

              {/* Meta Row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Status Badge */}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-[10px] font-medium border-0 gap-1',
                    status.bgColor,
                    status.textColor
                  )}
                >
                  {status.icon}
                  {status.label}
                </Badge>

                {/* Confidence Badge */}
                <Badge 
                  variant={confidenceVariant}
                  className="text-[10px]"
                >
                  {decision.confidence}%
                </Badge>

                <Separator orientation="vertical" className="h-3 hidden sm:block" />

                {/* Agent Name */}
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {agent?.name || 'Unknown Agent'}
                </span>

                <Separator orientation="vertical" className="h-3 hidden sm:block" />

                {/* Timestamp */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(decision.created_at)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDateTime(decision.created_at)}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Chevron (mobile) */}
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 sm:hidden self-center" />
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default DecisionCard;
