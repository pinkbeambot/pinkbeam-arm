'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

/**
 * FormSection - Grouped form fields with header
 * 
 * @example
 * <FormSection 
 *   title="Basic Information" 
 *   description="Configure the core agent settings"
 *   icon={User}
 * >
 *   <FormField name="name" label="Agent Name" required />
 *   <FormField name="role" label="Role" required />
 * </FormSection>
 */
export interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional Lucide icon component */
  icon?: LucideIcon;
  /** Form fields/content */
  children: React.ReactNode;
  /** Optional className */
  className?: string;
  /** Visual variant */
  variant?: 'default' | 'card';
  /** Whether to show a divider after this section */
  showDivider?: boolean;
}

export function FormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  variant = 'default',
  showDivider = false,
}: FormSectionProps) {
  const content = (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          )}
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground pl-0">
            {description}
          </p>
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <div className="rounded-lg border bg-card p-4">
        {content}
      </div>
    );
  }

  return (
    <>
      {content}
      {showDivider && <FormDivider className="my-6" />}
    </>
  );
}

FormSection.displayName = 'FormSection';

/**
 * FormDivider - Visual separation between form sections
 * 
 * @example
 * <FormSection title="Basic Info">
 *   <FormField name="name" label="Name" />
 * </FormSection>
 * 
 * <FormDivider label="Advanced Settings" />
 * 
 * <FormSection title="Configuration">
 *   <FormField name="setting" label="Setting" />
 * </FormSection>
 */
export interface FormDividerProps {
  /** Optional centered label */
  label?: string;
  /** Optional className */
  className?: string;
}

export function FormDivider({ label, className }: FormDividerProps) {
  if (label) {
    return (
      <div className={cn("relative", className)}>
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-medium">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return <hr className={cn("border-t", className)} />;
}

FormDivider.displayName = 'FormDivider';
