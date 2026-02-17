# Empty State Design Specification

## Overview

Empty states provide feedback to users when there is no content to display. They help maintain context, guide users toward next steps, and reduce confusion.

**Location:** `src/components/empty/`
**Related:** `src/components/ui/empty-states/EmptyState.tsx` (existing base component)

---

## Design Principles

1. **Never dead-end** - Always provide a clear next step
2. **Match the context** - Use appropriate icons and copy for the specific screen
3. **Maintain hierarchy** - Keep visual weight proportional to page importance
4. **Be helpful** - Explain why the state exists and how to resolve it

---

## Variants

### 1. Default Empty State

**Use when:** No data exists yet (first-use, empty collection)

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│              [Icon]                     │  ← 48px illustration/icon
│                                         │
│         Headline (H3)                   │  ← Primary message
│    Description text explaining          │  ← Secondary context (max-width: 400px)
│    what this area is for                │
│                                         │
│         [ Primary CTA ]                 │  ← Action to populate
│                                         │
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Token | Value |
|---------|-------|-------|
| Container | `bg-card` | White/dark card background |
| Icon | `text-muted-foreground` | 48px, centered |
| Headline | `text-foreground` | 18px, font-semibold, mb-2 |
| Description | `text-muted-foreground` | 14px, text-center, max-w-md |
| CTA | `variant="beam"` or `variant="default"` | Centered, mt-6 |
| Padding | `p-12` | Generous whitespace |
| Border | `border-dashed` | Visual distinction |

**Copy Guidelines:**
- Headline: "No [items] yet" or "Get started with [feature]"
- Description: Explain what the user will see and why it's useful
- CTA: Action-oriented verb ("Create [item]", "Add [item]", "Get Started")

**Examples:**
| Context | Headline | Description | CTA |
|---------|----------|-------------|-----|
| Agent Roster | "No agents yet" | "Create your first AI agent to start delegating tasks." | "Create Agent" |
| Task Pipeline | "No tasks in this stage" | "Drag tasks here or create new ones to get started." | "Create Task" |
| Escalation Inbox | "All caught up!" | "No escalations need your attention right now." | "View History" |
| Decision Log | "No decisions yet" | "Decisions made by your agents will appear here." | "Learn More" |

---

### 2. Search Empty State

**Use when:** Filters/search returned no results

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│              [SearchIcon]               │  ← 48px search/magnifying glass
│                                         │
│       "No results found"                │  ← Headline
│  Try adjusting your search or filters   │  ← Description
│  to find what you're looking for        │
│                                         │
│  [Clear Filters]  or  [Modify Search]   │  ← Secondary actions
│                                         │
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Token | Value |
|---------|-------|-------|
| Icon | `text-muted-foreground` | Search/Magnifying glass, 48px |
| Headline | `text-foreground` | "No results found" |
| Description | `text-muted-foreground` | Context-aware suggestion |
| Primary Action | `variant="outline"` | "Clear all filters" |
| Secondary Action | `variant="ghost"` | "Modify search" (optional) |

**Copy Guidelines:**
- Headline: Always "No results found"
- Description: Be specific about what was searched
  - With filters: "No agents match your current filters."
  - With search: "No tasks found for \"[search term]\"."
  - Combined: "No results match your search and filters."

**Action Patterns:**
```typescript
// Clear filters only
{ label: "Clear filters", onClick: clearFilters }

// Clear search only
{ label: "Clear search", onClick: clearSearch }

// Clear both
{ label: "Clear all", onClick: clearAll }
```

**Examples:**
| Context | Description | Primary Action |
|---------|-------------|----------------|
| Agent Search | "No agents match \"[query]\". Try a different name or role." | "Clear Search" |
| Task Filters | "No tasks match your filters. Try adjusting status or priority." | "Clear Filters" |
| Activity Feed | "No activities found for the selected agent." | "View All" |
| Escalations | "No escalations match your urgency filter." | "Reset Filters" |

---

### 3. Error Empty State

**Use when:** Data failed to load or an error occurred

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│         [AlertTriangle Icon]            │  ← 48px warning icon, red/amber
│              ⚠️ 🚨                      │
│                                         │
│       "Failed to load [items]"          │  ← Headline
│    Something went wrong while           │  ← Error description
│    fetching your data                   │
│                                         │
│         [ Try Again ]                   │  ← Primary retry action
│                                         │
│   Error: Connection timeout (500ms)     │  ← Technical details (optional)
│                                         │
└─────────────────────────────────────────┘
```

**Specs:**
| Element | Token | Value |
|---------|-------|-------|
| Icon | `text-destructive` | AlertTriangle or AlertCircle, 48px |
| Headline | `text-foreground` | "Failed to load [resource]" |
| Description | `text-muted-foreground` | User-friendly error message |
| Primary Action | `variant="default"` | "Try Again" with RefreshCw icon |
| Error Details | `text-destructive/60` | 12px, monospace (optional) |
| Container | `border-destructive/20` | Subtle red border tint |

**Copy Guidelines:**
- Headline: Acknowledge the failure ("Failed to load...", "Something went wrong")
- Description: Explain in plain language (avoid technical jargon)
- CTA: Always provide a retry action

**Error Message Mapping:**
| Error Type | User-Friendly Message |
|------------|----------------------|
| Network Error | "Connection failed. Check your internet and try again." |
| Server Error (500) | "Our servers are having trouble. Please try again shortly." |
| Timeout | "Request timed out. The server is taking too long to respond." |
| Not Found (404) | "The requested data could not be found." |
| Unauthorized (403) | "You don't have permission to view this data." |
| Rate Limited (429) | "Too many requests. Please wait a moment and try again." |

**Technical Details Display:**
```typescript
// Show error details in dev mode or for power users
{showErrorDetails && (
  <p className="text-xs text-destructive/60 font-mono mt-4">
    {error.message}
  </p>
)}
```

---

## Design Tokens

### Iconography

| Token | Size | Usage |
|-------|------|-------|
| `empty-state-icon-sm` | 32px | Inline, compact empty states |
| `empty-state-icon-md` | 48px | Default, most empty states |
| `empty-state-icon-lg` | 64px | Feature highlights, onboarding |

### Icon Colors by Variant

| Variant | Icon Color | Background |
|---------|------------|------------|
| Default | `text-muted-foreground` | `bg-muted/50` (circle) |
| Search | `text-muted-foreground` | `bg-muted/50` (circle) |
| Error | `text-destructive` | `bg-destructive/10` (circle) |

### Recommended Icons (Lucide)

| Context | Icon | Import |
|---------|------|--------|
| Default/Generic | `Inbox` | `lucide-react` |
| Agents | `Bot` | `lucide-react` |
| Tasks | `ClipboardList` | `lucide-react` |
| Search | `Search` | `lucide-react` |
| Error | `AlertTriangle` | `lucide-react` |
| Empty Results | `FileX` | `lucide-react` |
| No Data | `Database` | `lucide-react` |
| No Connection | `WifiOff` | `lucide-react` |
| Success/Complete | `CheckCircle` | `lucide-react` |

---

## CTA Button Placement

### Guidelines

1. **Single Action:** Center-aligned, `variant="beam"` for primary actions
2. **Secondary Action:** `variant="outline"` or `variant="ghost"`, placed inline or below
3. **Action Group:** Max 2 buttons, primary on the right (or stacked on mobile)

### Layout Patterns

```typescript
// Single centered action
<div className="flex justify-center mt-6">
  <Button variant="beam">Create Agent</Button>
</div>

// Action group (horizontal)
<div className="flex items-center justify-center gap-3 mt-6">
  <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
  <Button variant="beam" onClick={createNew}>Create New</Button>
</div>

// Action group (vertical on mobile)
<div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
  <Button variant="outline" className="w-full sm:w-auto">Clear Filters</Button>
  <Button variant="beam" className="w-full sm:w-auto">Try Again</Button>
</div>
```

---

## Component API

### EmptyState Component

```typescript
interface EmptyStateProps {
  // Required
  icon: LucideIcon;                    // Icon component from lucide-react
  title: string;                       // Headline text
  description: string;                 // Secondary description
  
  // Optional
  action?: {
    label: string;
    href?: string;                     // Use for navigation
    onClick?: () => void;              // Use for actions
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
  className?: string;
  children?: ReactNode;                // Additional content below CTA
}
```

### Usage Examples

```tsx
// Default empty state
<EmptyState
  icon={Bot}
  title="No agents yet"
  description="Create your first AI agent to start delegating tasks."
  action={{ label: "Create Agent", href: "/agents/new" }}
/>

// Search empty state
<EmptyState
  icon={Search}
  title="No results found"
  description={`No agents match "${searchQuery}". Try a different search term.`}
  variant="search"
  action={{ label: "Clear Search", onClick: clearSearch }}
/>

// Error empty state
<EmptyState
  icon={AlertTriangle}
  title="Failed to load agents"
  description="We couldn't fetch your agents. Please check your connection and try again."
  variant="error"
  action={{ label: "Try Again", onClick: refetch }}
>
  {error?.message && (
    <p className="text-xs text-destructive/60 font-mono mt-4">
      {error.message}
    </p>
  )}
</EmptyState>
```

---

## Responsive Behavior

| Breakpoint | Padding | Icon Size | Max Width |
|------------|---------|-----------|-----------|
| Mobile (<640px) | `p-6` | 40px | 100% |
| Tablet (640-1024px) | `p-8` | 48px | 400px |
| Desktop (>1024px) | `p-12` | 48-64px | 480px |

---

## Accessibility

### Required

- [ ] Icon has `aria-hidden="true"` (decorative)
- [ ] Headline uses proper heading hierarchy (h2-h4)
- [ ] CTA has visible focus state
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

### Recommended

- [ ] Announce state changes to screen readers
- [ ] Provide skip link for repeated empty states
- [ ] Consider reduced motion for animations

```tsx
// Screen reader announcement for dynamic content
<div role="status" aria-live="polite" className="sr-only">
  {emptyStateTitle} - {emptyStateDescription}
</div>
```

---

## Related Files

- `src/components/ui/empty-states/EmptyState.tsx` - Base component
- `src/components/ui/card.tsx` - Card wrapper
- `src/components/ui/button.tsx` - CTA buttons
- `src/components/animations/FadeIn.tsx` - Entrance animations

---

## Implementation Checklist

- [ ] Create EmptyState component in `src/components/empty/EmptyState.tsx`
- [ ] Extend existing UI component or replace with new implementation
- [ ] Add all three variants with proper styling
- [ ] Include icon size variations
- [ ] Implement responsive padding
- [ ] Add storybook stories or demo page
- [ ] Test with screen readers
- [ ] Verify color contrast
- [ ] Document copy guidelines for each context
