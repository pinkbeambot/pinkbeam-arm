# Empty State Component Specification

**Location:** `src/components/empty/`

## Overview

Empty state components for the ARM portal. Three variants:
- `EmptyStateDefault` - No data yet
- `EmptyStateSearch` - No search results
- `EmptyStateError` - Loading error

## Props Interface

```typescript
import { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: 'default' | 'search' | 'error';
  className?: string;
  children?: React.ReactNode; // Additional content (error details, etc.)
}
```

## Implementation Notes

### File Structure
```
src/components/empty/
├── index.ts              # Barrel export
├── EmptyState.tsx        # Main component with variants
├── types.ts              # TypeScript interfaces
└── EmptyState.stories.tsx # Storybook stories (optional)
```

### Key Design Tokens

| Token | Value |
|-------|-------|
| Container padding | `p-12` (desktop), `p-6` (mobile) |
| Icon size | 48px (default), 32px (compact) |
| Icon container | `bg-muted/50 rounded-full p-4` |
| Headline | `text-lg font-semibold text-foreground` |
| Description | `text-sm text-muted-foreground max-w-md` |
| CTA margin | `mt-6` |

### Variant-Specific Styles

**Default:**
- Icon color: `text-muted-foreground`
- CTA variant: `beam` (primary)

**Search:**
- Icon: `Search` from lucide-react
- CTA variant: `outline`
- Action text: "Clear filters" or "Clear search"

**Error:**
- Icon: `AlertTriangle` from lucide-react
- Icon color: `text-destructive`
- Container border: `border-destructive/20`
- CTA variant: `default` with `RefreshCw` icon

### Copy Suggestions by Context

#### Agent Roster
- Default: "No agents yet" / "Create your first AI agent to start delegating tasks." / "Create Agent"
- Search: "No agents found" / "No agents match \"[query]\". Try adjusting your search." / "Clear Search"
- Error: "Failed to load agents" / "We couldn't fetch your agents. Please try again." / "Try Again"

#### Task Pipeline
- Default: "No tasks yet" / "Create your first task to get your agents working." / "Create Task"
- Search: "No tasks found" / "No tasks match your filters. Try adjusting your criteria." / "Clear Filters"
- Error: "Failed to load tasks" / "We couldn't fetch your tasks. Please try again." / "Try Again"

#### Escalation Inbox
- Default: "All caught up!" / "No escalations need your attention. Enjoy the peace and quiet." / "View History"
- Search: "No escalations found" / "No escalations match your filters." / "Clear Filters"
- Error: "Failed to load escalations" / "We couldn't fetch your escalations." / "Try Again"

#### Decision Log
- Default: "No decisions yet" / "Decisions made by your agents will appear here for review." / "Learn More"
- Search: "No decisions found" / "No decisions match your search criteria." / "Clear Search"
- Error: "Failed to load decisions" / "We couldn't fetch your decision history." / "Try Again"

#### Activity Feed
- Default: "No activity yet" / "Agent actions and system events will appear here." / "Refresh"
- Filtered: "No activities found" / "No activities match your selected filters." / "Clear Filters"
- Error: "Failed to load activities" / "We couldn't fetch recent activity." / "Try Again"

### Accessibility Requirements

- Icon must have `aria-hidden="true"`
- Headline should use semantic heading (h2-h4 based on page hierarchy)
- CTA must have visible focus ring
- Color contrast: 4.5:1 minimum for text

### Animation

Wrap with `FadeIn` for entrance animation:
```tsx
import { FadeIn } from '@/components/animations';

<FadeIn direction="up" delay={0.1}>
  <EmptyState {...props} />
</FadeIn>
```

## Example Usage

```tsx
// Default empty state
<EmptyStateDefault
  icon={Bot}
  title="No agents yet"
  description="Create your first AI agent to start delegating tasks."
  action={{ label: "Create Agent", href: "/agents/new" }}
/>

// Search empty state
<EmptyStateSearch
  title="No results found"
  description={`No agents match "${query}". Try a different search term.`}
  onClear={() => setQuery('')}
/>

// Error empty state
<EmptyStateError
  title="Failed to load agents"
  description="We couldn't fetch your agents. Please check your connection and try again."
  onRetry={refetch}
  error={error}
/>
```

## Dependencies

- `lucide-react` - Icons
- `@/components/ui/button` - CTA buttons
- `@/components/ui/card` - Container
- `@/components/animations/FadeIn` - Entrance animation
- `@/lib/utils` - `cn()` utility
