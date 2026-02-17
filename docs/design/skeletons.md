# Skeleton Loading Design Specification

## Overview

Skeleton screens provide a loading state that mimics the content structure, reducing perceived load time and preventing layout shift. They create a sense of progress and familiarity.

**Location:** `src/components/loading/`
**Related:** `src/components/ui/skeleton.tsx`, `src/components/ui/loading/Skeleton.tsx`

---

## Design Principles

1. **Match the content structure** - Skeleton should mirror the actual layout
2. **Subtle animation** - Gentle pulse indicates activity without distraction
3. **Avoid layout shift** - Skeleton and content share identical dimensions
4. **Respect reduced motion** - Disable animations for users who prefer it

---

## Animation System

### Pulse Animation

**Timing Tokens:**
| Token | Value | Usage |
|-------|-------|-------|
| `skeleton-pulse-duration` | 2000ms (2s) | Full pulse cycle |
| `skeleton-pulse-easing` | `ease-in-out` | Smooth acceleration |
| `skeleton-pulse-opacity-start` | 1 | Peak opacity |
| `skeleton-pulse-opacity-end` | 0.4 | Minimum opacity |
| `skeleton-pulse-delay` | 0ms | Stagger delay between items |

**CSS Implementation:**
```css
@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.animate-skeleton-pulse {
  animation: skeleton-pulse 2s ease-in-out infinite;
}

/* Staggered animation for lists */
.skeleton-stagger-1 { animation-delay: 0ms; }
.skeleton-stagger-2 { animation-delay: 150ms; }
.skeleton-stagger-3 { animation-delay: 300ms; }
.skeleton-stagger-4 { animation-delay: 450ms; }
.skeleton-stagger-5 { animation-delay: 600ms; }
```

**Tailwind Implementation:**
```tsx
// Using built-in animate-pulse (slightly faster at 2s)
<div className="animate-pulse bg-muted rounded-md" />

// Custom slower pulse for premium feel
<div className="animate-[pulse_2.5s_ease-in-out_infinite] bg-muted rounded-md" />
```

### Wave/Shimmer Animation (Alternative)

For a more premium effect, use a shimmer sweep:

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## Skeleton Templates

### 1. AgentCard Skeleton

**Use when:** Loading agent cards in grid/list view

**Structure:**
```
┌─────────────────────────────────────────┐
│  ◯ ◯ ◯                    [====]       │  ← Avatar row + status badge
│                                         │
│  ████████████████████                    │  ← Name (line 1)
│  ████████████████                        │  ← Role/specialty (line 2)
│                                         │
│  [======] [======] [======]             │  ← Stats row (3 items)
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Width | Height | Border Radius |
|---------|-------|--------|---------------|
| Avatar | 48px | 48px | `rounded-full` |
| Status Badge | 60px | 20px | `rounded-full` |
| Name Line | 75% | 16px | `rounded-md` |
| Role Line | 50% | 14px | `rounded-md` |
| Stat Item | ~30% | 32px | `rounded-md` |

**Implementation:**
```tsx
export function AgentCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-4", className)}>
      {/* Header: Avatar + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      
      {/* Stats row */}
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>
    </div>
  );
}
```

---

### 2. TaskCard Skeleton

**Use when:** Loading task cards in pipeline columns

**Structure:**
```
┌─────────────────────────────────────────┐
│  [✓]  ████████████████████    [====]   │  ← Checkbox + Title + Priority
│       ████████████                       │  ← Description
│                                         │
│  ◯ Name              📅 MM/DD/YY        │  ← Assignee + Due date
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Width | Height | Border Radius |
|---------|-------|--------|---------------|
| Checkbox | 16px | 16px | `rounded-sm` |
| Title | ~70% | 16px | `rounded-md` |
| Priority Badge | 50px | 18px | `rounded-full` |
| Description | 60% | 12px | `rounded-md` |
| Assignee Avatar | 24px | 24px | `rounded-full` |
| Due Date | 80px | 14px | `rounded-md` |

**Implementation:**
```tsx
export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-3 space-y-3", className)}>
      {/* Header: Checkbox + Title + Priority */}
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-4 rounded-sm mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      
      {/* Footer: Assignee + Due Date */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
```

---

### 3. ActivityItem Skeleton

**Use when:** Loading activity feed items

**Structure:**
```
┌─────────────────────────────────────────┐
│                                         │
│  ◯░░░  [====] ████████████              │  ← Avatar + Badge + Timestamp
│        █████████████████████████████    │  ← Description line 1
│        ████████████                     │  ← Description line 2
│                                         │
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Width | Height | Border Radius |
|---------|-------|--------|---------------|
| Avatar | 36px | 36px | `rounded-full` |
| Type Badge | 60px | 20px | `rounded-full` |
| Timestamp | 50px | 12px | `rounded-md` |
| Description L1 | 90% | 14px | `rounded-md` |
| Description L2 | 40% | 12px | `rounded-md` |

**Implementation:**
```tsx
export function ActivityItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 p-3 rounded-lg", className)}>
      {/* Avatar */}
      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
      
      {/* Content */}
      <div className="flex-1 space-y-2 min-w-0">
        {/* Header: Badge + Timestamp */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
        
        {/* Description lines */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// List wrapper with stagger
export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton 
          key={i} 
          className={cn(
            "animate-pulse",
            i > 0 && `[animation-delay:${i * 150}ms]`
          )} 
        />
      ))}
    </div>
  );
}
```

---

### 4. DashboardStats Skeleton

**Use when:** Loading dashboard statistics overview

**Structure:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ ████     │  │ ████     │  │ ████     │  │ ████     │     │
│  │ ████████ │  │ ████████ │  │ ████████ │  │ ████████ │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │              [Chart Placeholder]                     │   │
│  │                                                      │   │
│  │    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓          │   │
│  │              ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │   │
│  │                          ▓▓▓▓▓▓▓▓▓▓▓▓▓              │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Specs:**
| Element | Width | Height | Border Radius |
|---------|-------|--------|---------------|
| Stat Card | 25% (grid) | 80px | `rounded-lg` |
| Stat Label | 60px | 12px | `rounded-md` |
| Stat Value | 80px | 24px | `rounded-md` |
| Chart Container | 100% | 200px | `rounded-lg` |
| Chart Bar | ~8% each | 40-120px | `rounded-t-md` |

**Implementation:**
```tsx
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-2", className)}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

export function DashboardStatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      
      {/* Chart Placeholder */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-5 w-32 mb-6" />
        <div className="h-48 flex items-end justify-between gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1 rounded-t-md" 
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Design Tokens Summary

### Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `skeleton-bg` | `bg-muted` | `bg-muted` | Base skeleton color |
| `skeleton-bg-subtle` | `bg-muted/50` | `bg-muted/50` | Lighter skeleton elements |

### Sizing

| Element | Size | Notes |
|---------|------|-------|
| Avatar (large) | 48x48px | Agent cards, profiles |
| Avatar (medium) | 36x36px | Activity items |
| Avatar (small) | 24x24px | Task cards, inline |
| Text line (heading) | 16px height | Titles, names |
| Text line (body) | 14px height | Descriptions |
| Text line (caption) | 12px height | Metadata, timestamps |
| Badge | 18-20px height | Status, priority |
| Card padding | 12-16px | Consistent spacing |
| Border radius | `rounded-md` (6px) | Default elements |
| Border radius (pills) | `rounded-full` | Avatars, badges |

### Animation

| Token | Value | Purpose |
|-------|-------|---------|
| `animation-pulse` | 2s ease-in-out infinite | Default pulse |
| `animation-delay-stagger` | 150ms | List item delay |
| `animation-delay-max` | 600ms (4 items) | Cap stagger at 4 |

---

## Component API

### Base Skeleton

```typescript
interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;  // For wrapping content
}

// Usage: <Skeleton className="h-4 w-32" />
```

### Skeleton Variants

```typescript
// Pre-built skeleton components
export function AgentCardSkeleton(props: { className?: string })
export function TaskCardSkeleton(props: { className?: string })
export function ActivityItemSkeleton(props: { className?: string })
export function DashboardStatsSkeleton(props: { className?: string })
export function StatCardSkeleton(props: { className?: string })
export function ActivityFeedSkeleton(props: { count?: number })
```

### Skeleton Container

```typescript
interface SkeletonContainerProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  minHeight?: string;  // Prevent layout shift
}

// Usage:
<SkeletonContainer 
  isLoading={isLoading}
  skeleton={<AgentCardSkeleton />}
  minHeight="120px"
>
  <AgentCard agent={agent} />
</SkeletonContainer>
```

---

## Accessibility

### Required

- [ ] Respect `prefers-reduced-motion`
- [ ] Skeletons are visual only (no focusable elements)
- [ ] Content replaces skeletons (don't overlay)
- [ ] Maintain semantic structure during loading

### Reduced Motion Support

```tsx
export function Skeleton({ className, ...props }: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div
      className={cn(
        "bg-muted rounded-md",
        !prefersReducedMotion && "animate-pulse",
        className
      )}
      {...props}
    />
  );
}
```

### Screen Reader Support

```tsx
// Announce loading state
<div role="status" aria-live="polite" className="sr-only">
  Loading agents...
</div>

// Or use aria-busy on container
<div aria-busy="true" aria-label="Loading agents">
  <AgentCardSkeleton />
  <AgentCardSkeleton />
  <AgentCardSkeleton />
</div>
```

---

## Usage Patterns

### Inline Skeleton

```tsx
// Single element loading
<div className="flex items-center gap-2">
  {isLoading ? (
    <Skeleton className="h-4 w-24" />
  ) : (
    <span>{agent.name}</span>
  )}
</div>
```

### List Loading

```tsx
// Multiple items with stagger
<div className="space-y-2">
  {isLoading ? (
    Array.from({ length: 5 }).map((_, i) => (
      <AgentCardSkeleton key={i} className={i > 0 ? `delay-[${i * 150}ms]` : ''} />
    ))
  ) : (
    agents.map(agent => <AgentCard key={agent.id} agent={agent} />)
  )}
</div>
```

### Conditional Rendering

```tsx
// Full section loading
{isLoading ? (
  <DashboardStatsSkeleton />
) : error ? (
  <ErrorState onRetry={refetch} />
) : stats ? (
  <DashboardStats stats={stats} />
) : null}
```

---

## Best Practices

### Do

- ✅ Match skeleton dimensions to actual content
- ✅ Use consistent spacing with final design
- ✅ Stagger list items for organic feel
- ✅ Show skeletons immediately on navigation
- ✅ Limit skeleton items (3-5 for lists)

### Don't

- ❌ Use skeletons for long loading (>10s) - show progress
- ❌ Animate every element (performance)
- ❌ Use skeletons for instant loads (<300ms)
- ❌ Create overly complex skeleton layouts
- ❌ Keep skeletons visible after content loads

---

## Related Files

- `src/components/ui/skeleton.tsx` - Base Skeleton primitive
- `src/components/ui/loading/Skeleton.tsx` - Extended skeletons
- `src/components/animations/FadeIn.tsx` - Content entrance
- `src/lib/utils.ts` - `cn()` utility

---

## Implementation Checklist

- [ ] Create skeleton components in `src/components/loading/`
- [ ] Implement all 4 template variants
- [ ] Add stagger animation support
- [ ] Support reduced motion preference
- [ ] Test with screen readers (aria-busy)
- [ ] Verify no layout shift between skeleton/content
- [ ] Add storybook stories or demo page
- [ ] Document timing tokens
