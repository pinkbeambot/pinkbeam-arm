'use client';

/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Clock,
  ArrowLeft,
  CheckCheck,
  X,
  HelpCircle,
  Brain,
  AlertTriangle,
  Send,
  MessageSquare,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';
import { cn, formatDateTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Escalation, EscalationUrgency, EscalationType } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EscalationDetailPanelProps {
  escalation: Escalation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (id: string, resolution: string) => void;
  onTakeOver?: (id: string) => void;
}

export function EscalationDetailPanel({
  escalation,
  open,
  onOpenChange,
  onResolve,
  onTakeOver,
}: EscalationDetailPanelProps) {
  const [responseType, setResponseType] = useState<'approve' | 'reject' | 'request_info' | 'take_over' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  if (!escalation) return null;

  const urgencyConfig = getUrgencyConfig(escalation.urgency);
  const typeConfig = getTypeConfig(escalation.type);
  const waitingTime = getWaitingTime(escalation.created_at);

  const handleResponse = useCallback((type: 'approve' | 'reject' | 'request_info' | 'take_over') => {
    setResponseType(type);
    setConfirmDialogOpen(true);
  }, []);

  const handleConfirmResponse = useCallback(() => {
    if (!responseType || !escalation) return;

    let resolution = '';
    switch (responseType) {
      case 'approve':
        resolution = `Approved: ${responseText || 'Approved agent recommendation'}`;
        break;
      case 'reject':
        resolution = `Rejected: ${responseText || 'Did not approve agent recommendation'}`;
        break;
      case 'request_info':
        resolution = `Info Requested: ${responseText || 'Requested additional information'}`;
        break;
      case 'take_over':
        resolution = `Taken Over: ${responseText || 'CEO taking direct control of this matter'}`;
        break;
    }

    onResolve(escalation.id, resolution);
    setConfirmDialogOpen(false);
    setResponseText('');
    setResponseType(null);
    onOpenChange(false);
  }, [responseType, escalation, responseText, onResolve, onOpenChange]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader className="space-y-4">
            {/* Priority indicator */}
            <div className={cn('flex items-center gap-2', urgencyConfig.textColor)}>
              {urgencyConfig.icon}
              <span className="font-semibold capitalize">{escalation.urgency} Priority</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{waitingTime}</span>
            </div>
            
            <SheetTitle className="text-xl leading-tight">
              {escalation.title}
            </SheetTitle>

            {/* Meta info */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={cn(urgencyConfig.badgeColor)}>
                <span className="capitalize">{escalation.urgency}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {typeConfig.icon}
                <span className="capitalize">{escalation.type}</span>
              </Badge>
              {escalation.status === 'resolved' && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-6">
              {/* Agent Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={escalation.agent?.avatar_url} />
                  <AvatarFallback className={cn('text-white text-sm', getAvatarColor(escalation.agent?.id || escalation.agent_id))}>
                    {getInitials(escalation.agent?.name || 'Unknown')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{escalation.agent?.name || 'Unknown Agent'}</p>
                  <p className="text-xs text-muted-foreground">
                    Escalated {formatDateTime(escalation.created_at)}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Agent&apos;s Question
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {escalation.description}
                </p>
              </div>

              {/* Context */}
              {escalation.context && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Context
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {escalation.context}
                  </div>
                </div>
              )}

              <Separator />

              {/* Agent Analysis */}
              {escalation.agent_analysis && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Agent Analysis
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                      <p className="text-xs font-medium text-green-800 dark:text-green-400 mb-1">What I Know</p>
                      <p className="text-sm text-muted-foreground">{escalation.agent_analysis.what_i_know}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1">What I Don&apos;t Know</p>
                      <p className="text-sm text-muted-foreground">{escalation.agent_analysis.what_i_dont_know}</p>
                    </div>
                    {escalation.agent_analysis.what_i_tried.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">What I Tried</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {escalation.agent_analysis.what_i_tried.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {escalation.agent_recommendation && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Agent&apos;s Recommendation</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {escalation.agent_recommendation}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              'h-full rounded-full',
                              (escalation.agent_confidence || 0) > 0.7 ? 'bg-green-500' :
                              (escalation.agent_confidence || 0) > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${(escalation.agent_confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {Math.round((escalation.agent_confidence || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Options if available */}
              {escalation.question?.options && escalation.question.options.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Options Considered</h4>
                  <div className="space-y-2">
                    {escalation.question.options.map((option, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md hover:bg-muted/50">
                        <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}.</span>
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution if resolved */}
              {escalation.status === 'resolved' && escalation.resolution && (
                <>
                  <Separator />
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Resolution
                    </h4>
                    <p className="text-sm text-muted-foreground">{escalation.resolution}</p>
                    {escalation.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resolved {formatDateTime(escalation.resolved_at)}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Action Buttons - Only for open escalations */}
          {escalation.status === 'open' && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Choose your response:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => handleResponse('approve')}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleResponse('reject')}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => handleResponse('request_info')}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Request Info
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleResponse('take_over')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Take Over
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Response Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseType === 'approve' && 'Approve Recommendation'}
              {responseType === 'reject' && 'Reject Recommendation'}
              {responseType === 'request_info' && 'Request More Information'}
              {responseType === 'take_over' && 'Take Over Task'}
            </DialogTitle>
            <DialogDescription>
              {responseType === 'approve' && 'Approve the agent\'s recommendation and allow them to proceed.'}
              {responseType === 'reject' && 'Reject the agent\'s recommendation. Provide guidance on the correct approach.'}
              {responseType === 'request_info' && 'Ask the agent to gather more information before making a decision.'}
              {responseType === 'take_over' && 'Take direct control of this task. The agent will step aside.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional Feedback (optional)
              </label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Provide feedback to help the agent learn..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmResponse}
              variant={responseType === 'approve' ? 'default' : responseType === 'reject' ? 'destructive' : 'secondary'}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper functions
function getUrgencyConfig(urgency: EscalationUrgency) {
  const configs = {
    critical: {
      label: 'Critical',
      bgColor: 'bg-red-500',
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      textColor: 'text-red-600 dark:text-red-400',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    high: {
      label: 'High',
      bgColor: 'bg-orange-500',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      textColor: 'text-orange-600 dark:text-orange-400',
      icon: <AlertCircle className="h-4 w-4" />,
    },
    normal: {
      label: 'Normal',
      bgColor: 'bg-amber-500',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      textColor: 'text-amber-600 dark:text-amber-400',
      icon: <Clock className="h-4 w-4" />,
    },
    low: {
      label: 'Low',
      bgColor: 'bg-blue-500',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      textColor: 'text-blue-600 dark:text-blue-400',
      icon: <HelpCircle className="h-4 w-4" />,
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

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}
