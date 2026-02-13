## Overview

Visual QA and testing for marketing site to ensure production-ready quality.

## Testing Checklist

### Visual Consistency
- [ ] Matches pinkbeam quality level
- [ ] Consistent spacing and typography
- [ ] Animation smoothness (60fps)
- [ ] Color scheme follows ARM brand
- [ ] No layout shifts on load

### Responsive Testing
- [ ] Desktop (1440px+)
- [ ] Laptop (1280px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

### Performance
- [ ] Lighthouse Performance >90
- [ ] Lighthouse Accessibility >95
- [ ] Lighthouse Best Practices >95
- [ ] Lighthouse SEO >95
- [ ] LCP <2s
- [ ] CLS <0.1

### Functionality
- [ ] All navigation links work
- [ ] CTA buttons link correctly
- [ ] Form inputs (if any) validate
- [ ] No console errors
- [ ] No 404s for assets

### SEO
- [ ] All pages have unique titles
- [ ] All pages have meta descriptions
- [ ] OG images present
- [ ] Structured data validates
- [ ] Sitemap generated

## Testing Method

1. **Automated:** Lighthouse CI on PR
2. **Manual:** Visual inspection per checklist
3. **Screenshots:** Percy or similar for regression

## Acceptance Criteria

- [ ] All checklist items pass
- [ ] CTO approval on visual quality
- [ ] Ready for deployment

## Related

- Final step of marketing site work (#29)
- Blocks: Marketing site launch
