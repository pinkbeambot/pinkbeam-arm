'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * FormValidationSummary - Displays multiple validation errors in an alert
 * 
 * @example
 * <FormValidationSummary 
 *   errors={["Name is required", "Email is invalid"]}
 *   title="Please fix the following errors:"
 * />
 */
export interface FormValidationSummaryProps {
  /** Array of error messages to display */
  errors: string[];
  /** Optional custom title */
  title?: string;
  /** Additional className */
  className?: string;
  /** Callback when user clicks an error (for focus management) */
  onErrorClick?: (error: string, index: number) => void;
  /** Variant - affects styling */
  variant?: 'default' | 'destructive';
}

export function FormValidationSummary({
  errors,
  title = "Please fix the following errors:",
  className,
  onErrorClick,
  variant = 'destructive',
}: FormValidationSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <Alert 
      variant={variant} 
      className={cn(className)}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside mt-2 space-y-1">
          {errors.map((error, index) => (
            <li 
              key={index}
              className={cn(
                onErrorClick && "cursor-pointer hover:underline",
                "text-sm"
              )}
              onClick={() => onErrorClick?.(error, index)}
            >
              {error}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

FormValidationSummary.displayName = 'FormValidationSummary';

/**
 * RequiredFieldLegend - Legend explaining required field indicator
 * 
 * @example
 * <RequiredFieldLegend />
 * // or
 * <RequiredFieldLegend className="mb-6" />
 */
export interface RequiredFieldLegendProps {
  /** Additional className */
  className?: string;
  /** Custom text (default: "Required fields") */
  text?: string;
}

export function RequiredFieldLegend({
  className,
  text = "Required fields",
}: RequiredFieldLegendProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <span className="text-destructive" aria-hidden="true">*</span>
      {' '}{text}
    </p>
  );
}

RequiredFieldLegend.displayName = 'RequiredFieldLegend';
