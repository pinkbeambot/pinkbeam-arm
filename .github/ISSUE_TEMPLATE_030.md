## Overview

Create the public marketing site for pinkbeam.ai. The portal (`/portal/*`) is auth-walled, so we need a compelling landing experience at `/` and supporting pages to convert visitors.

## Design Direction

**Visual Reference:** Follow conventions from `~/code/pinkbeam` — similar styling, animations, component patterns. The pinkbeam codebase has excellent marketing aesthetics we should reuse.

**Key Routes:**
- `/` — Main landing page
- `/agents` — Agent capabilities showcase  
- `/agents/employee/[slug]` — Individual agent type detail pages
- `/pricing` — Pricing page (adapt ARM tiers)

## Scope

### Page Structure
- [ ] Marketing layout (different from PortalLayout — no sidebar, full-width sections)
- [ ] Navigation header (marketing nav, not portal nav)
- [ ] Footer with CTAs

### Landing Page (/)
- [ ] Hero section: "Run a 50-person company as a 1-person founder"
- [ ] Problem/Solution sections
- [ ] Agent capabilities showcase (EmployeeTabs pattern)
- [ ] How it works
- [ ] Social proof/testimonials
- [ ] Pricing preview
- [ ] Final CTA
- [ ] FAQ

### Agents Showcase (/agents)
- [ ] Hero: "Build your AI workforce"
- [ ] Agent type grid/cards (from EmployeeTabs pattern)
- [ ] Capability highlights
- [ ] Demo/demo request CTA

### Agent Detail (/agents/employee/[slug])
- [ ] Dynamic routes for each agent type
- [ ] Agent capabilities, pricing, use cases
- [ ] Sample work/output examples
- [ ] Purchase/try CTA

### Pricing Page (/pricing)
- [ ] ARM pricing tiers: Starter ($49), Pro ($199), Business ($499), Scale ($999)
- [ ] Feature comparison table
- [ ] ROI calculator (reuse from pinkbeam)
- [ ] FAQ

## Technical Requirements

- [ ] Responsive (desktop-first per project convention)
- [ ] SEO metadata for all pages
- [ ] Structured data (JSON-LD)
- [ ] Performance: <2s LCP
- [ ] Animations: Subtle scroll animations (match pinkbeam quality)

## Assets to Migrate/Reuse

From `~/code/pinkbeam`:
- Component patterns in `components/agents/sections/`
- Hero, PricingSection, FAQ, Testimonials components
- Animation utilities
- Color scheme (adapt to ARM brand)
- Typography scale

## Testing/QA

- [ ] Visual regression testing (screenshot comparisons)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile responsive check
- [ ] Accessibility audit (a11y)
- [ ] Performance audit (Lighthouse >90)

## Deliverables

- Marketing pages at `/`, `/agents`, `/agents/employee/[slug]`, `/pricing`
- Reusable marketing components in `src/components/marketing/`
- Marketing layout wrapper
- All tests passing

## Notes

- Keep `/portal/*` separate and auth-walled
- Marketing site is public, no auth required
- Can reuse significant code from pinkbeam — migrate carefully

---
**Estimated effort:** 3-5 commits over 2-3 sessions
**Depends on:** None (can parallel with backend API work)
