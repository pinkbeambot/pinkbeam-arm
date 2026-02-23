# Form Patterns Design Specification

## Overview

Consistent form patterns across the ARM platform ensure predictable user experiences, reduce cognitive load, and maintain accessibility standards.

**Location:** `src/components/forms/` (proposed)
**Related:** `src/components/ui/` (shadcn/ui primitives)
**Dependencies:** react-hook-form, zod, @hookform/resolvers

---

## Design Principles

1. **Clear visual hierarchy** - Labels, inputs, and actions have consistent spatial relationships
2. **Progressive disclosure** - Group related fields; show advanced options on demand
3. **Inline validation** - Errors appear contextually without blocking flow
4. **Accessible by default** - All forms meet WCAG 2.1 AA standards
5. **Responsive layouts** - Forms adapt gracefully from mobile to desktop

---

## Form Layout Patterns

### 1. Single Column (Default)

**Use when:** Most forms, especially on mobile or narrow containers

**Layout:**
```
┌─────────────────────────────────────────┐
│  Form Title                             │
│  Optional description text              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Label *                         │    │
│  │ ┌─────────────────────────────┐ │    │
│  │ │ Input field                 │ │    │
│  │ └─────────────────────────────┘ │    │
│  │ Helper text or error message    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Label *                         │    │
│  │ ┌─────────────────────────────┐ │    │
│  │ │ Input field                 │ │    │
│  │ └─────────────────────────────┘ │    │
│  │ Helper text or error message    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Label                           │    │
│  │ ┌─────────────────────────────┐ │    │
│  │ │ Textarea                    │ │    │
│  │ │                             │ │    │
│  │ └─────────────────────────────┘ │    │
│  │ Optional helper text            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                                         │
│       [Cancel]        [Submit →]        │
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Value | Notes |
|---------|-------|-------|
| Form width | `max-w-xl` (576px) | Standard modal width |
| Field gap | `space-y-6` (24px) | Between form groups |
| Label gap | `space-y-2` (8px) | Between label and input |
| Container padding | `p-6` | Inside modal/card |

---

### 2. Two Column Layout

**Use when:** Related fields that work as pairs (first/last name, city/state)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Form Title                             │
│                                         │
│  ┌──────────────────┬──────────────────┐│
│  │ Label *          │ Label *          ││
│  │ ┌──────────────┐ │ ┌──────────────┐ ││
│  │ │ First Name   │ │ │ Last Name    │ ││
│  │ └──────────────┘ │ └──────────────┘ ││
│  └──────────────────┴──────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Label *                             ││
│  │ ┌─────────────────────────────────┐ ││
│  │ │ Email Address                   │ ││
│  │ └─────────────────────────────────┘ ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌──────────────────┬──────────────────┐│
│  │ Label *          │ Label            ││
│  │ ┌──────────────┐ │ ┌──────────────┐ ││
│  │ │ City         │ │ │ State ▾      │ ││
│  │ └──────────────┘ │ └──────────────┘ ││
│  └──────────────────┴──────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Value | Notes |
|---------|-------|-------|
| Grid | `grid grid-cols-2 gap-4` | Equal columns |
| Responsive | `grid-cols-1 sm:grid-cols-2` | Stack on mobile |
| Column gap | `gap-4` (16px) | Between columns |

---

### 3. Sectioned Form

**Use when:** Long forms with distinct groupings (settings, configuration)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Form Title                             │
│                                         │
│  ╔═════════════════════════════════════╗│
│  ║  📋 Basic Information               ║│
│  ╠═════════════════════════════════════╣│
│  ║                                     ║│
│  ║  ┌─────────────────────────────┐    ║│
│  ║  │ Label *                     │    ║│
│  ║  │ ┌─────────────────────────┐ │    ║│
│  ║  │ │ Input                   │ │    ║│
│  ║  │ └─────────────────────────┘ │    ║│
│  ║  └─────────────────────────────┘    ║│
│  ║                                     ║│
│  ║  ┌─────────────────────────────┐    ║│
│  ║  │ Label                       │    ║│
│  ║  │ ┌─────────────────────────┐ │    ║│
│  ║  │ │ Input                   │ │    ║│
│  ║  │ └─────────────────────────┘ │    ║│
│  ║  └─────────────────────────────┘    ║│
│  ╚═════════════════════════════════════╝│
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                                         │
│  ╔═════════════════════════════════════╗│
│  ║  ⚙️ Configuration                   ║│
│  ╠═════════════════════════════════════╣│
│  ║                                     ║│
│  ║  ┌─────────────────────────────┐    ║│
│  ║  │ Label *                     │    ║│
│  ║  │ ┌─────────────────────────┐ │    ║│
│  ║  │ │ Select ▾                │ │    ║│
│  ║  │ └─────────────────────────┘ │    ║│
│  ║  └─────────────────────────────┘    ║│
│  ╚═════════════════════════════════════╝│
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│       [Cancel]        [Save Changes]    │
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Value | Notes |
|---------|-------|-------|
| Section gap | `space-y-8` (32px) | Between sections |
| Section header | `text-lg font-semibold` | With icon optional |
| Divider | `<Separator />` | Between sections |
| Section padding | `space-y-4` | Internal field spacing |

---

## Input Field Guidelines

### Label Placement

**Always top-aligned** (above input)

```
┌─────────────────────────────────┐
│ Label *                         │  ← 14px, font-medium, mb-2
│ ┌─────────────────────────────┐ │
│ │                             │ │  ← Input field
│ └─────────────────────────────┘ │
│ Helper or error text            │  ← 14px, mt-1.5
└─────────────────────────────────┘
```

**Why top-aligned:**
- Scannable - users see label and field together
- Accommodates long labels without truncation
- Consistent with shadcn/ui patterns
- Better mobile experience

### Required Field Indicators

**Use asterisk (*)** with legend

```tsx
<div className="space-y-2">
  <Label htmlFor="email">
    Email Address <span className="text-destructive">*</span>
  </Label>
  <Input id="email" required aria-required="true" />
</div>

// At top of form
<p className="text-sm text-muted-foreground mb-6">
  <span className="text-destructive">*</span> Required fields
</p>
```

**Specs:**
| Element | Value |
|---------|-------|
| Asterisk color | `text-destructive` |
| Asterisk spacing | space before, no space after |
| Legend placement | Below title, above first field |

### Helper Text

**Use for:** Format guidance, context, optional hints

```tsx
<div className="space-y-2">
  <Label htmlFor="apiKey">API Key</Label>
  <Input id="apiKey" type="password" />
  <p className="text-sm text-muted-foreground">
    Your API key is encrypted and stored securely.
  </p>
</div>
```

**Specs:**
| Element | Value |
|---------|-------|
| Color | `text-muted-foreground` |
| Size | `text-sm` |
| Max length | 120 characters (wraps) |
| Placement | Below input, above error |

---

## Button Placement

### Primary Action Position

**Right-aligned** in modals, **left-aligned** in full-page forms

**Modal/Dialog:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Form content                           │
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                                         │
│  [Cancel]              [Save Changes →] │  ← Primary right
│                                         │
└─────────────────────────────────────────┘
```

**Full-page form:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Form content                           │
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                                         │
│  [Save Changes →]  [Cancel]             │  ← Primary left
│                                         │
└─────────────────────────────────────────┘
```

### Button Order

**Standard order (left to right):**

| Order | Button | Variant |
|-------|--------|---------|
| 1 | Danger (if applicable) | `destructive` |
| 2 | Secondary/Discard | `outline` |
| 3 | Cancel/Close | `outline` or `ghost` |
| 4 | Primary Action | `default` or `beam` |

### Button States

```tsx
<DialogFooter className="gap-2">
  <Button 
    variant="outline" 
    onClick={handleDiscard}
    disabled={!hasChanges || isSubmitting}
  >
    Discard
  </Button>
  <Button 
    variant="outline" 
    onClick={() => onOpenChange(false)}
    disabled={isSubmitting}
  >
    Cancel
  </Button>
  <Button 
    onClick={handleSubmit}
    disabled={!hasChanges || isSubmitting}
  >
    {isSubmitting ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Saving...
      </>
    ) : (
      <>
        <Check className="mr-2 h-4 w-4" />
        Save Changes
      </>
    )}
  </Button>
</DialogFooter>
```

---

## Error Message Patterns

### Inline Errors (Default)

**Use for:** Field-level validation errors

```tsx
<div className="space-y-2">
  <Label htmlFor="email">
    Email Address <span className="text-destructive">*</span>
  </Label>
  <Input 
    id="email" 
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? "email-error" : undefined}
  />
  {errors.email && (
    <p id="email-error" className="text-sm text-destructive">
      {errors.email.message}
    </p>
  )}
</div>
```

**Layout:**
```
┌─────────────────────────────────┐
│ Email Address *                 │
│ ┌─────────────────────────────┐ │
│ │ invalid@email               │ │  ← Red border (aria-invalid)
│ └─────────────────────────────┘ │
│ Please enter a valid email      │  ← text-destructive
└─────────────────────────────────┘
```

**Specs:**
| Element | Value |
|---------|-------|
| Border color | `aria-invalid:border-destructive` |
| Ring color | `aria-invalid:ring-destructive/20` |
| Text color | `text-destructive` |
| Icon (optional) | `<AlertCircle className="h-4 w-4" />` |

### Summary Alert (Multiple Errors)

**Use for:** Form submission with multiple validation errors

```tsx
{validationErrors.length > 0 && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Please fix the following errors:</AlertTitle>
    <AlertDescription>
      <ul className="list-disc list-inside mt-2">
        {validationErrors.map((error, idx) => (
          <li key={idx}>{error}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Please fix the following errors:     │
│                                         │
│   • Agent name is required              │
│   • Description is required             │
│   • At least one capability required    │
└─────────────────────────────────────────┘
```

**Placement:** Top of form content, below header

### Toast Notifications

**Use for:**
- Success confirmation after submission
- Async operation errors
- Server errors that aren't field-specific

```tsx
// On success
toast({
  title: "Agent created",
  description: "Your new agent is ready to work.",
});

// On error
toast({
  variant: "destructive",
  title: "Failed to create agent",
  description: error.message,
});
```

---

## Validation UX

### When to Validate

| Trigger | Use For | Example |
|---------|---------|---------|
| `onBlur` | Field format validation | Email, phone, URL |
| `onChange` (debounced) | Availability checking | Username uniqueness |
| `onSubmit` | Required fields, business logic | All required fields |
| `onBlur` + `onSubmit` | Most common pattern | Default approach |

**Recommended default:**
```tsx
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur',  // Validate on blur
  reValidateMode: 'onChange',  // Re-validate on change after first error
});
```

### Error Message Copy Guidelines

**Be specific and actionable:**

| ❌ Don't | ✅ Do |
|----------|-------|
| "Invalid" | "Please enter a valid email address" |
| "Required" | "Agent name is required" |
| "Error" | "Password must be at least 8 characters" |
| "Failed" | "Could not connect. Please try again." |

**Voice:** Clear, helpful, non-technical. No error codes.

### Success State Indicators

**Use for:** Async validation, confirmation

```tsx
<div className="space-y-2">
  <Label htmlFor="username">Username</Label>
  <div className="relative">
    <Input id="username" />
    {isValidating ? (
      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
    ) : isValid ? (
      <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
    ) : null}
  </div>
  {isValid && (
    <p className="text-sm text-green-600">Username available</p>
  )}
</div>
```

### Async Validation Loading States

```tsx
<div className="space-y-2">
  <Label htmlFor="agentName">
    Agent Name <span className="text-destructive">*</span>
  </Label>
  <div className="relative">
    <Input 
      id="agentName"
      disabled={isChecking}
    />
    {isChecking && (
      <div className="absolute right-3 top-2.5 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Checking...</span>
      </div>
    )}
  </div>
</div>
```

---

## Component Specifications

### FormSection

**Purpose:** Group related form fields with a header

```tsx
interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}

function FormSection({ 
  title, 
  description, 
  icon: Icon, 
  children,
  className 
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
```

**Usage:**
```tsx
<FormSection 
  title="Basic Information" 
  description="Configure the core agent settings"
  icon={User}
>
  <FormField name="name" label="Agent Name" required />
  <FormField name="role" label="Role" required />
</FormSection>
```

**Specs:**
| Element | Value |
|---------|-------|
| Title | `text-lg font-semibold` |
| Icon | `h-5 w-5 text-primary` |
| Description | `text-sm text-muted-foreground` |
| Content gap | `space-y-4` |

---

### FormField

**Purpose:** Complete form field with label, input, error, and helper

```tsx
interface FormFieldProps {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ 
  name, 
  label, 
  required, 
  helper, 
  error,
  children 
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const helperId = `${name}-helper`;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {React.cloneElement(children as React.ReactElement, {
        id: name,
        'aria-invalid': !!error,
        'aria-describedby': error ? errorId : helper ? helperId : undefined,
      })}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-sm text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
```

**Usage:**
```tsx
<FormField 
  name="email" 
  label="Email Address" 
  required
  helper="We'll never share your email"
  error={errors.email?.message}
>
  <Input type="email" placeholder="you@example.com" />
</FormField>
```

---

### FormActions

**Purpose:** Consistent button row for form actions

```tsx
interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  onDiscard?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  discardLabel?: string;
  isSubmitting?: boolean;
  hasChanges?: boolean;
  variant?: 'modal' | 'page';
}

function FormActions({
  onCancel,
  onSubmit,
  onDiscard,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  discardLabel = 'Discard',
  isSubmitting = false,
  hasChanges = true,
  variant = 'modal',
}: FormActionsProps) {
  return (
    <div className={cn(
      "flex gap-2 pt-4 border-t",
      variant === 'modal' ? "justify-end" : "justify-start"
    )}>
      {onDiscard && (
        <Button
          variant="outline"
          onClick={onDiscard}
          disabled={!hasChanges || isSubmitting}
        >
          {discardLabel}
        </Button>
      )}
      {onCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
      )}
      {onSubmit && (
        <Button
          onClick={onSubmit}
          disabled={!hasChanges || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
```

**Usage:**
```tsx
<FormActions
  onCancel={() => setOpen(false)}
  onSubmit={handleSubmit}
  onDiscard={handleDiscard}
  isSubmitting={loading}
  hasChanges={hasChanges}
  variant="modal"
/>
```

---

### FormDivider

**Purpose:** Visual separation between form sections

```tsx
interface FormDividerProps {
  label?: string;
  className?: string;
}

function FormDivider({ label, className }: FormDividerProps) {
  if (label) {
    return (
      <div className={cn("relative", className)}>
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {label}
          </span>
        </div>
      </div>
    );
  }
  
  return <Separator className={className} />;
}
```

**Usage:**
```tsx
<FormSection title="Basic Info">
  {/* fields */}
</FormSection>

<FormDivider label="Advanced Settings" />

<FormSection title="Configuration">
  {/* fields */}
</FormSection>
```

---

## Accessibility Requirements

### Label Associations

**Every input MUST have an associated label:**

```tsx
// ✅ Correct: htmlFor + id
<Label htmlFor="email">Email</Label>
<Input id="email" />

// ✅ Correct: Wrapped (Radio/Checkbox)
<Label className="flex items-center gap-2">
  <Checkbox />
  <span>Subscribe to updates</span>
</Label>

// ❌ Incorrect: No association
<Label>Email</Label>
<Input />
```

### Error Announcements

**Errors must be announced to screen readers:**

```tsx
// Method 1: aria-describedby
<Input 
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && <p id="email-error" role="alert">{error}</p>}

// Method 2: aria-errormessage (newer)
<Input 
  aria-invalid={!!error}
  aria-errormessage={error ? "email-error" : undefined}
/>
```

### Keyboard Navigation

**Tab order:** Natural DOM order

**Custom requirements:**
- All inputs focusable via Tab
- Focus visible on all interactive elements
- No keyboard traps
- Esc closes modals

```tsx
<Dialog>
  <DialogContent 
    onEscapeKeyDown={() => onOpenChange(false)}
    onInteractOutside={(e) => {
      if (hasChanges) e.preventDefault(); // Prevent accidental close
    }}
  >
    {/* form */}
  </DialogContent>
</Dialog>
```

### Focus Management

**On modal open:** Focus first input

```tsx
useEffect(() => {
  if (open) {
    // Small delay for animation
    const timer = setTimeout(() => {
      document.getElementById('firstName')?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }
}, [open]);
```

**On error:** Focus first invalid field

```tsx
const onError = (errors: FieldErrors) => {
  const firstErrorField = Object.keys(errors)[0];
  if (firstErrorField) {
    document.getElementById(firstErrorField)?.focus();
  }
};

<form onSubmit={handleSubmit(onSubmit, onError)}>
```

**Focus indicators:**
```css
/* Already in shadcn/ui */
focus-visible:border-ring 
focus-visible:ring-ring/50 
focus-visible:ring-[3px]
```

---

## Copy Examples

### Error Messages

| Field | Error | Message |
|-------|-------|---------|
| Name | Required | "Name is required" |
| Name | Too long | "Name must be 100 characters or less" |
| Email | Invalid | "Please enter a valid email address" |
| Email | Required | "Email address is required" |
| Password | Too short | "Password must be at least 8 characters" |
| Password | Weak | "Password must include a number and special character" |
| Select | None selected | "Please select an option" |
| URL | Invalid | "Please enter a valid URL (e.g., https://example.com)" |
| Phone | Invalid | "Please enter a valid phone number" |
| Date | Past date | "Please select a future date" |
| Number | Range | "Value must be between 1 and 100" |
| Unique | Taken | "This name is already in use. Please choose another." |

### Helper Text

| Field | Helper |
|-------|--------|
| Password | "Must be at least 8 characters with a number and symbol" |
| API Key | "Your key is encrypted and never shared" |
| Webhook | "We'll send POST requests to this URL" |
| Username | "Letters, numbers, and underscores only" |
| Description | "This will be shown to team members" |
| Tags | "Press Enter to add multiple tags" |

### Button Labels

| Action | Label | Icon |
|--------|-------|------|
| Create | "Create Agent" | Plus |
| Save | "Save Changes" | Check |
| Update | "Update Settings" | RefreshCw |
| Delete | "Delete Forever" | Trash2 |
| Cancel | "Cancel" | X |
| Discard | "Discard Changes" | Undo |
| Continue | "Continue →" | ChevronRight |
| Back | "← Back" | ChevronLeft |

---

## Integration with Existing Patterns

### Current Implementation Reference

**CreateAgentModal patterns:**
- Step-based wizard with progress indicator
- Template selection as first step
- Zod validation with react-hook-form
- `mode: 'onChange'` for real-time validation
- Review step before submission

**EditAgentModal patterns:**
- Tab-based organization
- Unsaved changes tracking
- Discard functionality
- Validation summary alert
- Avatar preview integration

### Migration Guide

**From ad-hoc forms to Form components:**

```tsx
// Before: Inline form
<div className="space-y-4">
  <div className="space-y-2">
    <Label>Name</Label>
    <Input />
  </div>
</div>

// After: Using FormField
<FormSection title="Details">
  <FormField name="name" label="Name" required>
    <Input />
  </FormField>
</FormSection>
```

---

## Appendix

### Related Documentation

- [shadcn/ui Form](https://ui.shadcn.com/docs/components/form)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [WCAG Form Guidelines](https://www.w3.org/WAI/tutorials/forms/)

### Changelog

| Date | Change |
|------|--------|
| 2026-02-17 | Initial specification |

---

**Status:** Ready for ENG-FE implementation
**Owner:** ENG-UX
**Reviewers:** CTO, ENG-FE
