'use client';

/**
 * DecisionDetail Component
 * 
 * Sheet-based detail view for a decision.
 * Features:
 * - Full decision information display
 * - Agent info with avatar
 * - Status and priority display
 * - Reasoning section
 * - Alternatives considered
 * - Proposed action preview
 * - Timeline information
 * - Integration with ApprovalButtons
 */

import * as React from 'react';
import { 
  Brain, 
  X, 
  Clock,
  User,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ListTodo,
  ArrowRight,
  History,
  FileText,
  Zap,
  ArrowUpCircle,
  Circle,
  ExternalLink
} from 'lucide-react';
import { cn, formatDateTime, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Decision, DecisionStatus, DecisionPriority, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ApprovalButtons } from './ApprovalButtons';

// ============================================================================
// Status Configuration
// ============================================================================

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}

const statusConfig: Record<DecisionStatus, StatusConfig> = {
  proposed: {
    label: 'Proposed',
    color: '#eab308',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    icon: <Circle className="h-4 w-4" />,
  },
  approved: {
    label: 'Approved',
    color: '#22c55e',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600 dark:text-green-400',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400',
    icon: <XCircle className="h-4 w-4" />,
  },
  overridden: {
    label: 'Overridden',
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    icon: <ArrowUpCircle className="h-4 w-4" />,
  },
  executed: {
    label: 'Executed',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: <Zap className="h-4 w-4" />,
  },
};

// ============================================================================
// Priority Configuration
// ============================================================================

interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
}

const priorityConfig: Record<DecisionPriority, PriorityConfig> = {
  urgent: {
    label: 'Urgent',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
  },
  high: {
    label: 'High',
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
  },
  normal: {
    label: 'Normal',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
  },
  low: {
    label: 'Low',
    color: '#6b7280',
    bgColor: 'bg-gray-500/10',
  },
};

// ============================================================================
// Props Interface
// ============================================================================

export interface DecisionDetailProps {
  /** The decision to display */
  decision: Decision | null;
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when decision is approved */
  onApprove?: (decisionId: string, notes?: string) => Promise<void> | void;
  /** Callback when decision is rejected */
  onReject?: (decisionId: string, reason: string) => Promise<void> | void;
  /** Callback when user wants to override */
  onOverride?: (decisionId: string, overrideData: { correctDecision: string; reason: string }) => Promise<void> | void;
  /** Callback to view related task */
  onViewTask?: (taskId: string) => void;
  /** Callback to view in activity log */
  onViewActivity?: (decisionId: string) => void;
  /** Loading state */
  loading?: boolean;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DecisionDetail({
  decision,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onOverride,
  onViewTask,
  onViewActivity,
  loading = false,
  className,
}: DecisionDetailProps) {
  if (!decision) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className={cn('w-full sm:max-w-xl', className)}>
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a decision to view details</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const agent = decision.agent;
  const status = statusConfig[decision.status];
  const priority = decision.priority ? priorityConfig[decision.priority] : null;
  const canAct = decision.status === 'proposed';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('w-full sm:max-w-2xl overflow-hidden flex flex-col', className)}>
        {/* Header */}
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', status.bgColor)}>
                {status.icon}
              </div>
              <div>
                <SheetTitle className="text-left text-lg">{decision.title}</SheetTitle>
                <SheetDescription className="text-left">
                  Made {formatRelativeTime(decision.created_at)}
                </SheetDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge 
                variant="secondary" 
                className={cn(status.bgColor, status.textColor)}
              >
                {status.label}
              </Badge>
              {priority && (
                <Badge 
                  variant="outline" 
                  style={{ borderColor: priority.color, color: priority.color }}
                  className="text-xs"
                >
                  {priority.label} Priority
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1 -mx-6 px-6 py-4">
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{decision.description}</p>
            </div>

            {/* Agent Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Proposed By
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={agent?.avatar_url || undefined} />
                    <AvatarFallback 
                      className={cn(
                        'text-sm text-white',
                        getAvatarColor(agent?.id || decision.agent_id)
                      )}
                    >
                      {agent ? getInitials(agent.name) : 'AI'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{agent?.name || 'Unknown Agent'}</p>
                    <p className="text-sm text-muted-foreground">
                      {agent?.role ? agent.role.charAt(0).toUpperCase() + agent.role.slice(1) : 'Agent'}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Badge variant="outline">
                      <Gauge className="h-3 w-3 mr-1" />
                      {decision.confidence}% confidence
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Alert */}
            {decision.status === 'overridden' && (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-orange-800 dark:text-orange-200">
                      Decision Overridden
                    </h5>
                    {decision.override_reason && (
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        Reason: {decision.override_reason}
                      </p>
                    )}
                    {decision.overridden_by && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        By: {decision.overridden_by}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reasoning Section */}
            {decision.reasoning && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {decision.reasoning}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alternatives Considered */}
            {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Alternatives Considered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {decision.alternatives_considered.map((alternative, index) => (
                      <li 
                        key={index} 
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm">{alternative}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Proposed Action */}
            {decision.proposed_action && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Proposed Action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-auto max-h-[300px]">
                    {JSON.stringify(decision.proposed_action, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Decision Made</span>
                    <span className="font-medium">{formatDateTime(decision.created_at)}</span>
                  </div>
                  {decision.updated_at && decision.updated_at !== decision.created_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span>{formatDateTime(decision.updated_at)}</span>
                    </div>
                  )}
                  {decision.executed_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Executed</span>
                      <span>{formatDateTime(decision.executed_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t pt-4 mt-auto space-y-3">
          {/* Approval/Action Buttons */}
          {(onApprove || onReject) && canAct && (
            <div className="flex justify-end">
              <ApprovalButtons
                decision={decision}
                onApprove={onApprove || (() => {})}
                onReject={onReject || (() => {})}
                loading={loading}
              />
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {decision.task_id && onViewTask && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewTask(decision.task_id!)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View Task
                </Button>
              )}
              {onViewActivity && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewActivity(decision.id)}
                >
                  <History className="h-4 w-4 mr-2" />
                  View Activity
                </Button>
              )}
            </div>

            {/* Override Button (for non-proposed decisions) */}
            {onOverride && decision.status !== 'overridden' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onOverride(decision.id, { correctDecision: '', reason: '' })}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Override
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default DecisionDetail;
