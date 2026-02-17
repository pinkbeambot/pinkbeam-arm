# Loading Skeleton Component Specification

**Location:** `src/components/loading/`

## Overview

Skeleton loading components for the ARM portal. Four specialized templates plus base Skeleton primitive.

## Components

### 1. AgentCardSkeleton

**Purpose:** Loading state for agent cards in grid/list views

**Structure:**
```
┌─────────────────────────────────┐
│  ◯░░░  ████████████    [====]   │  Avatar + Info + Status
│        ██████████████           │
│  [======] [======] [======]     │  Stats row
└─────────────────────────────────┘
```

**Specs:**
| Element | ClassName |
|---------|-----------|
| Container | `rounded-lg border bg-card p-4 space-y-4` |
| Avatar | `h-12 w-12 rounded-full` |
| Name line | `h-4 w-32` |
| Role line | `h-3 w-24` |
| Status badge | `h-5 w-16 rounded-full` |
| Stat boxes | `h-8 flex-1 rounded-md` |

### 2. TaskCardSkeleton

**Purpose:** Loading state for task cards in pipeline

**Structure:**
```
┌─────────────────────────────────┐
│  [✓]  █████████████████ [===]   │  Checkbox + Title + Priority
│       ████████████              │  Description
│  ◯░░░  Name        📅 ████      │  Assignee + Due date
└─────────────────────────────────┘
```

**Specs:**
| Element | ClassName |
|---------|-----------|
| Container | `rounded-lg border bg-card p-3 space-y-3` |
| Checkbox | `h-4 w-4 rounded-sm` |
| Title | `h-4 w-3/4` |
| Priority | `h-4 w-12 rounded-full` |
| Description | `h-3 w-1/2` |
| Assignee avatar | `h-6 w-6 rounded-full` |
| Assignee name | `h-3 w-20` |
| Due date | `h-3 w-16` |

### 3. ActivityItemSkeleton

**Purpose:** Loading state for activity feed items

**Structure:**
```
┌─────────────────────────────────┐
│  ◯░░░  [====] ████████████      │  Avatar + Badge + Timestamp
│        ████████████████████     │  Description line 1
│        ██████████               │  Description line 2
└─────────────────────────────────┘
```

**Specs:**
| Element | ClassName |
|---------|-----------|
| Container | `flex gap-3 p-3 rounded-lg` |
| Avatar | `h-9 w-9 rounded-full` |
| Type badge | `h-5 w-16 rounded-full` |
| Timestamp | `h-3 w-12` |
| Description L1 | `h-4 w-full` |
| Description L2 | `h-3 w-1/3` |

### 4. DashboardStatsSkeleton

**Purpose:** Loading state for dashboard statistics

**Structure:**
```
┌───────────────────────────────────────────────┐
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │  4 stat cards
│  │ ████ │ │ ████ │ │ ████ │ │ ████ │         │
│  │ ████ │ │ ████ │ │ ████ │ │ ████ │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│  ┌──────────────────────────────────────┐     │
│  │  [Chart bars - 12 columns]           │     │  Chart placeholder
│  └──────────────────────────────────────┘     │
└───────────────────────────────────────────────┘
```

**Specs:**
| Element | ClassName |
|---------|-----------|
| Stats grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` |
| Stat card | `rounded-lg border bg-card p-4 space-y-2` |
| Stat label | `h-3 w-20` |
| Stat value | `h-7 w-24` |
| Chart container | `rounded-lg border bg-card p-6` |
| Chart title | `h-5 w-32 mb-6` |
| Chart bars | `flex-1 rounded-t-md` (varying heights) |

### 5. ActivityFeedSkeleton

**Purpose:** List wrapper with stagger animation

**Props:**
```typescript
interface ActivityFeedSkeletonProps {
  count?: number;  // Default: 5
  className?: string;
}
```

### 6. StatCardSkeleton

**Purpose:** Individual stat card skeleton (reusable)

**Specs:**
| Element | ClassName |
|---------|-----------|
| Container | `rounded-lg border bg-card p-4 space-y-2` |
| Label | `h-3 w-20` |
| Value | `h-7 w-24` |

## Animation Tokens

| Token | Value | CSS |
|-------|-------|-----|
| Duration | 2000ms | `animate-pulse` (default 2s) |
| Easing | ease-in-out | Built into animate-pulse |
| Stagger delay | 150ms | `[animation-delay:${i * 150}ms]` |

## Accessibility

- Skeletons should respect `prefers-reduced-motion`
- Use `aria-busy="true"` on container
- Provide screen reader text: "Loading..."

```tsx
// Reduced motion support
const prefersReducedMotion = useReducedMotion();

<div 
  className={cn("bg-muted rounded-md", !prefersReducedMotion && "animate-pulse")}
/>

// Screen reader announcement
<div role="status" aria-live="polite" className="sr-only">
  Loading agents...
</div>
```

## Implementation File Structure

```
src/components/loading/
├── index.ts                    # Barrel export
├── Skeleton.tsx                # Base primitive + all variants
├── types.ts                    # TypeScript interfaces
├── useSkeleton.ts              # Utility hook for skeleton state
└── Skeleton.stories.tsx        # Storybook stories (optional)
```

## Example Usage

```tsx
// Single skeleton
<Skeleton className="h-4 w-32" />

// Agent card loading
<AgentCardSkeleton />

// List with stagger
<ActivityFeedSkeleton count={5} />

// Dashboard loading
<DashboardStatsSkeleton />

// Conditional rendering
{isLoading ? (
  <TaskCardSkeleton />
) : (
  <TaskCard task={task} />
)}

// With reduced motion check
<Skeleton 
  className="h-4 w-32" 
  disableAnimation={prefersReducedMotion}
/>
```

## Dependencies

- `@/components/ui/skeleton` - Base primitive
- `@/lib/utils` - `cn()` utility
- `framer-motion` - For useReducedMotion hook

## Notes

- All skeletons use `bg-muted` for the pulse color
- Match exact dimensions of the content being loaded
- Use `space-y-*` for consistent vertical rhythm
- Stagger only up to 4 items (performance)
- For lists > 5 items, repeat pattern without additional stagger
