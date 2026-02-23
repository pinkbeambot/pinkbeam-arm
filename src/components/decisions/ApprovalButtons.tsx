'use client';

/**
 * ApprovalButtons Component
 * 
 * Action buttons for approving or rejecting decisions.
 * Features:
 * - Approve button with confirmation
 * - Reject button with confirmation
 * - Loading states
 * - Success/error feedback
 * - Disabled states based on decision status
 */

import * as React from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Decision, DecisionStatus } from '@/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// ============================================================================
// Props Interface
// ============================================================================

export interface ApprovalButtonsProps {
  /** The decision being acted upon */
  decision: Decision;
  /** Callback when decision is approved */
  onApprove: (decisionId: string, notes?: string) => Promise<void> | void;
  /** Callback when decision is rejected */
  onReject: (decisionId: string, reason: string) => Promise<void> | void;
  /** Whether an action is currently loading */
  loading?: boolean;
  /** Optional className for styling */
  className?: string;
  /** Size variant for buttons */
  size?: 'default' | 'sm' | 'lg';
  /** Whether to show full width buttons */
  fullWidth?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ApprovalButtons({
  decision,
  onApprove,
  onReject,
  loading = false,
  className,
  size = 'default',
  fullWidth = false,
}: ApprovalButtonsProps) {
  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [approveNotes, setApproveNotes] = React.useState('');
  const [rejectReason, setRejectReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Determine if actions are allowed
  const canAct = decision.status === 'proposed';
  const isFinal = ['approved', 'rejected', 'executed'].includes(decision.status);
  const isOverridden = decision.status === 'overridden';

  const handleApproveClick = React.useCallback(() => {
    if (!canAct) return;
    setShowApproveDialog(true);
  }, [canAct]);

  const handleRejectClick = React.useCallback(() => {
    if (!canAct) return;
    setShowRejectDialog(true);
  }, [canAct]);

  const handleConfirmApprove = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onApprove(decision.id, approveNotes || undefined);
      setShowApproveDialog(false);
      setApproveNotes('');
    } finally {
      setIsSubmitting(false);
    }
  }, [decision.id, approveNotes, onApprove]);

  const handleConfirmReject = React.useCallback(async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onReject(decision.id, rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } finally {
      setIsSubmitting(false);
    }
  }, [decision.id, rejectReason, onReject]);

  // If decision is already finalized, show status
  if (isFinal || isOverridden) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {decision.status === 'approved' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Approved</span>
          </div>
        )}
        {decision.status === 'rejected' && (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Rejected</span>
          </div>
        )}
        {decision.status === 'executed' && (
          <div className="flex items-center gap-2 text-blue-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Executed</span>
          </div>
        )}
        {decision.status === 'overridden' && (
          <div className="flex items-center gap-2 text-orange-600">
            <XCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Overridden</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        'flex items-center gap-2',
        fullWidth && 'flex-col',
        className
      )}>
        <Button
          variant="outline"
          size={size}
          onClick={handleRejectClick}
          disabled={!canAct || loading || isSubmitting}
          className={cn(
            'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700',
            fullWidth && 'w-full'
          )}
        >
          {isSubmitting && showRejectDialog ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Reject
        </Button>

        <Button
          variant="default"
          size={size}
          onClick={handleApproveClick}
          disabled={!canAct || loading || isSubmitting}
          className={cn(
            'bg-green-600 hover:bg-green-700 text-white',
            fullWidth && 'w-full'
          )}
        >
          {isSubmitting && showApproveDialog ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Approve
        </Button>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Approve Decision
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this decision? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="bg-muted rounded-lg p-3 mb-4">
              <p className="font-medium text-sm">{decision.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {decision.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-notes">Approval Notes (optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Add any notes about this approval..."
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmApprove();
              }}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Confirm Approval'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Decision
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this decision? Please provide a reason for the rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="bg-muted rounded-lg p-3 mb-4">
              <p className="font-medium text-sm">{decision.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {decision.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this decision is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[80px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                This feedback will be shared with the agent for learning.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmReject();
              }}
              disabled={isSubmitting || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ApprovalButtons;
