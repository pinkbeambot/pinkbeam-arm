## Overview

Migrate and adapt marketing components from `~/code/pinkbeam` to ARM.

## Components to Migrate

### Sections (from `~/code/pinkbeam/components/agents/sections/`)
- [ ] `Hero.tsx` — Main hero section
- [ ] `ProblemSection.tsx` — Problem statement
- [ ] `HowItWorks.tsx` — Step-by-step process
- [ ] `EmployeeTabs.tsx` → Rename to `AgentCapabilities.tsx`
- [ ] `Testimonials.tsx` — Social proof
- [ ] `PricingSection.tsx` — Pricing display
- [ ] `FAQ.tsx` — FAQ accordion
- [ ] `FinalCTA.tsx` — Call to action

### UI Components (from `~/code/pinkbeam/components/ui/`)
- [ ] Animation wrappers
- [ ] Card components
- [ ] Button variants (marketing style)
- [ ] Section containers

### Utilities
- [ ] Animation hooks
- [ ] Scroll utilities
- [ ] Structured data helpers

## Migration Requirements

- [ ] Copy components to `~/code/arm/src/components/marketing/`
- [ ] Update imports to ARM project structure
- [ ] Adapt branding (Pink Beam ARM vs old Pink Beam)
- [ ] Update content for ARM messaging
- [ ] Ensure TypeScript types match ARM conventions
- [ ] Remove any old/broken dependencies

## Testing

- [ ] Each component renders without errors
- [ ] Animations work correctly
- [ ] Responsive behavior maintained
- [ ] No console warnings

## Acceptance Criteria

- [ ] All components in `src/components/marketing/`
- [ ] Components work in isolation (Storybook-style testing)
- [ ] Ready for page composition in #31
