'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

/**
 * FormField - Complete form field with label, input, error, and helper
 * 
 * @example
 * <FormField 
 *   name="email" 
 *   label="Email Address" 
 *   required
 *   helper="We'll never share your email"
 *   error={errors.email?.message}
 * >
 *   <Input type="email" placeholder="you@example.com" />
 * </FormField>
 */
export interface FormFieldProps {
  /** Field name - used for id and aria attributes */
  name: string;
  /** Label text */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Helper text displayed below input */
  helper?: string;
  /** Error message - when present, shows in error state */
  error?: string;
  /** Input element or component */
  children: React.ReactElement;
  /** Optional className for the wrapper */
  className?: string;
  /** Loading state for async validation */
  isValidating?: boolean;
  /** Success state for async validation */
  isValid?: boolean;
  /** Success message to show when valid */
  successMessage?: string;
}

export function FormField({
  name,
  label,
  required = false,
  helper,
  error,
  children,
  className,
  isValidating = false,
  isValid = false,
  successMessage,
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const helperId = `${name}-helper`;
  const successId = `${name}-success`;
  
  // Build aria-describedby based on state
  const describedBy = error 
    ? errorId 
    : isValid && successMessage 
      ? successId 
      : helper 
        ? helperId 
        : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">*</span>
        )}
        {required && (
          <span className="sr-only">(required)</span>
        )}
      </Label>
      
      <div className="relative">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {React.cloneElement(children as React.ReactElement<any>, {
          id: name,
          name,
          'aria-invalid': !!error,
          'aria-describedby': describedBy,
          'aria-required': required,
        })}
        
        {/* Async validation indicator */}
        {isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* Valid indicator */}
        {!isValidating && isValid && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
      
      {/* Success message */}
      {!error && isValid && successMessage && (
        <p 
          id={successId} 
          className="text-sm text-green-600 flex items-center gap-1"
        >
          <Check className="h-3.5 w-3.5 flex-shrink-0" />
          {successMessage}
        </p>
      )}
      
      {/* Helper text */}
      {!error && (!isValid || !successMessage) && helper && (
        <p id={helperId} className="text-sm text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  );
}

FormField.displayName = 'FormField';
