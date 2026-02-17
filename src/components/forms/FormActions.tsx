'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Undo } from 'lucide-react';

/**
 * FormActions - Consistent button row for form actions
 * 
 * @example
 * // Modal variant (default)
 * <FormActions
 *   onCancel={() => setOpen(false)}
 *   onSubmit={handleSubmit}
 *   onDiscard={handleDiscard}
 *   isSubmitting={loading}
 *   hasChanges={hasChanges}
 * />
 * 
 * @example
 * // Page variant
 * <FormActions
 *   variant="page"
 *   onCancel={() => router.back()}
 *   onSubmit={handleSubmit}
 *   submitLabel="Create Agent"
 * />
 */
export interface FormActionsProps {
  /** Cancel/close callback */
  onCancel?: () => void;
  /** Primary submit callback */
  onSubmit?: () => void;
  /** Discard changes callback */
  onDiscard?: () => void;
  /** Danger/delete callback */
  onDelete?: () => void;
  /** Custom submit button label */
  submitLabel?: string;
  /** Custom cancel button label */
  cancelLabel?: string;
  /** Custom discard button label */
  discardLabel?: string;
  /** Custom delete button label */
  deleteLabel?: string;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Whether form has unsaved changes */
  hasChanges?: boolean;
  /** Layout variant */
  variant?: 'modal' | 'page';
  /** Additional className */
  className?: string;
  /** Whether to show border separator */
  showBorder?: boolean;
  /** Whether submit is disabled (overrides hasChanges check) */
  isSubmitDisabled?: boolean;
  /** Whether cancel is disabled */
  isCancelDisabled?: boolean;
  /** Loading text (defaults to "Saving...") */
  loadingText?: string;
}

export function FormActions({
  onCancel,
  onSubmit,
  onDiscard,
  onDelete,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  discardLabel = 'Discard',
  deleteLabel = 'Delete',
  isSubmitting = false,
  hasChanges = true,
  variant = 'modal',
  className,
  showBorder = true,
  isSubmitDisabled = false,
  isCancelDisabled = false,
  loadingText = 'Saving...',
}: FormActionsProps) {
  const isPrimaryDisabled = isSubmitDisabled || !hasChanges || isSubmitting;
  
  return (
    <div 
      className={cn(
        "flex flex-wrap items-center gap-2 pt-4",
        showBorder && "border-t",
        variant === 'modal' ? "justify-end" : "justify-start",
        className
      )}
    >
      {/* Danger action - leftmost on page, optional on modal */}
      {onDelete && variant === 'page' && (
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isSubmitting}
          className="mr-auto"
        >
          <Undo className="mr-2 h-4 w-4" />
          {deleteLabel}
        </Button>
      )}

      {/* Discard changes */}
      {onDiscard && (
        <Button
          variant="outline"
          onClick={onDiscard}
          disabled={!hasChanges || isSubmitting}
        >
          <Undo className="mr-2 h-4 w-4" />
          {discardLabel}
        </Button>
      )}

      {/* Cancel/Close */}
      {onCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isCancelDisabled || isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          {cancelLabel}
        </Button>
      )}

      {/* Primary action */}
      {onSubmit && (
        <Button
          onClick={onSubmit}
          disabled={isPrimaryDisabled}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingText}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
      )}

      {/* Danger action - rightmost on modal */}
      {onDelete && variant === 'modal' && (
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isSubmitting}
          className="order-first mr-auto"
        >
          {deleteLabel}
        </Button>
      )}
    </div>
  );
}

FormActions.displayName = 'FormActions';
