'use client';

import { useState } from 'react';
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
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { cn, formatDateTime, formatRelativeTime, getInitials } from '@/lib/utils';
import type { Decision, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  getConfidenceColor,
  getConfidenceBadgeVariant,
  getDecisionStatusIcon,
  getDecisionStatusColor,
  getDecisionStatusLabel,
} from './DecisionFilters';

interface DecisionDetailPanelProps {
  decision: Decision | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOverride: (decisionId: string, overrideData: { correctDecision: string; reason: string; sendFeedback: boolean }) => void;
  onViewTask: (taskId: string) => void;
  onViewActivity: (decisionId: string) => void;
  loading?: boolean;
}

export function DecisionDetailPanel({
  decision,
  open,
  onOpenChange,
  onOverride,
  onViewTask,
  onViewActivity,
  loading,
}: DecisionDetailPanelProps) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    correctDecision: '',
    reason: '',
    sendFeedback: true,
  });

  if (!decision) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a decision to view details</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const agent = decision.agent;
  const confidenceVariant = getConfidenceBadgeVariant(decision.confidence);
  const statusIcon = getDecisionStatusIcon(decision.status);
  const statusColorClass = getDecisionStatusColor(decision.status);

  const handleOverrideSubmit = () => {
    if (!overrideForm.correctDecision.trim() || !overrideForm.reason.trim()) {
      return;
    }
    onOverride(decision.id, overrideForm);
    setOverrideMode(false);
    setOverrideForm({ correctDecision: '', reason: '', sendFeedback: true });
  };

  const canOverride = decision.status !== 'overridden' && decision.status !== 'executed';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', statusColorClass)}>
                {statusIcon}
              </div>
              <div>
                <SheetTitle className="text-left">Decision Details</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  Made {formatRelativeTime(decision.created_at)}
                </p>
              </div>
            </div>
            <Badge variant={confidenceVariant} className="text-sm">
              {decision.confidence}% Confidence
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Decision Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Decision Made
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg">{decision.title}</h4>
                  <p className="text-muted-foreground mt-1">{decision.description}</p>
                </div>

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
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent Info */}
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={agent?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {agent ? getInitials(agent.name) : 'AI'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{agent?.name || 'Unknown Agent'}</p>
                    <p className="text-sm text-muted-foreground">
                      {agent?.role ? agent.role.charAt(0).toUpperCase() + agent.role.slice(1) : 'Agent'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Context Section */}
            {decision.proposed_action && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Proposed Action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-auto">
                    {JSON.stringify(decision.proposed_action, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Decision Made</span>
                    <span>{formatDateTime(decision.created_at)}</span>
                  </div>
                  {decision.executed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Executed</span>
                      <span>{formatDateTime(decision.executed_at)}</span>
                    </div>
                  )}
                  {decision.overridden_by && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overridden By</span>
                      <span>{decision.overridden_by}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Override Form */}
            {overrideMode && canOverride && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-4 w-4" />
                    Override Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="correct-decision">Correct Decision</Label>
                    <Textarea
                      id="correct-decision"
                      placeholder="What should the decision have been?"
                      value={overrideForm.correctDecision}
                      onChange={(e) => setOverrideForm({ ...overrideForm, correctDecision: e.target.value })}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">Reason for Override</Label>
                    <Textarea
                      id="override-reason"
                      placeholder="Explain why you&apos;re overriding this decision..."
                      value={overrideForm.reason}
                      onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="send-feedback"
                      checked={overrideForm.sendFeedback}
                      onChange={(e) => setOverrideForm({ ...overrideForm, sendFeedback: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="send-feedback" className="text-sm">
                      Send feedback to agent for learning
                    </Label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleOverrideSubmit}
                      disabled={!overrideForm.correctDecision.trim() || !overrideForm.reason.trim()}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Confirm Override
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setOverrideMode(false);
                        setOverrideForm({ correctDecision: '', reason: '', sendFeedback: true });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t pt-4 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {decision.task_id && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewTask(decision.task_id!)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View Task
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewActivity(decision.id)}
              >
                <History className="h-4 w-4 mr-2" />
                View in Activity
              </Button>
            </div>
            
            {canOverride && !overrideMode && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setOverrideMode(true)}
                className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              >
                <History className="h-4 w-4 mr-2" />
                Override
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
