---
name: new-component
description: Scaffold a new React component following project conventions (shadcn/ui patterns, cn() utility, Tailwind)
disable-model-invocation: true
---

# Scaffold Component

Create a new React component following the project's established patterns.

## Arguments

The user should provide a component name and where it belongs (dashboard, marketing, agents, etc.).

## Steps

1. Determine the correct directory based on component type:
   - Dashboard components: `src/components/dashboard/`
   - Agent components: `src/components/agents/`
   - Task components: `src/components/tasks/`
   - Chat components: `src/components/chat/`
   - Marketing components: `src/components/marketing/`
   - Shared/UI primitives: `src/components/ui/`

2. Create the component file using this template:

```typescript
"use client"; // Only if the component needs interactivity (useState, useEffect, event handlers)

import { cn } from "@/lib/utils";
// Import UI primitives from barrel export:
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
// import { Button } from "@/components/ui";

interface {ComponentName}Props {
  className?: string;
  // Define props here
}

export function {ComponentName}({ className, ...props }: {ComponentName}Props) {
  return (
    <div className={cn("", className)}>
      {/* Component content */}
    </div>
  );
}
```

3. If it's a marketing component, also export it from `src/components/marketing/index.ts`

## Rules

- Use `cn()` from `@/lib/utils` for conditional class merging
- Import UI components from `@/components/ui` (barrel export)
- Use named exports (not default exports)
- Only add `"use client"` if the component needs client-side interactivity
- Follow existing naming: PascalCase files matching the export name
- Use Tailwind CSS for all styling — no CSS modules or styled-components
- Use the `beam` Button variant for primary CTAs with Pink Beam branding
- Accept `className` prop for composability
