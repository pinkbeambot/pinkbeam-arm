## Overview

Create the main landing page at `/` for pinkbeam.ai.

## Page Structure

```tsx
<MarketingLayout>
  <Hero />
  <ProblemSection />
  <AgentCapabilities /> {/* renamed from EmployeeTabs */}
  <HowItWorks />
  <Testimonials />
  <PricingPreview />
  <FAQ />
  <FinalCTA />
</MarketingLayout>
```

## Content Adaptation

### Hero
- **Headline:** "Run a 50-person company as a 1-person founder"
- **Subheadline:** "ARM is the command center for managing your AI workforce"
- **CTA:** "Get Started" → links to signup
- **Secondary CTA:** "See how it works" → scrolls to HowItWorks

### Problem Section
- Pain points: Overwhelmed by AI tools, no visibility, can't scale
- Solution: ARM provides visibility, control, trust

### Agent Capabilities
- Showcase agent types users can manage
- Sales, Marketing, Support, Content, Research agents
- Visual grid/tabs like pinkbeam EmployeeTabs

### How It Works
1. Create your AI workforce
2. Assign tasks and goals
3. Monitor in real-time
4. Scale without hiring

### Testimonials
- Case studies from solo founders
- "I scaled to $50K MRR with 5 AI agents"
- Metrics: Hours saved, revenue growth

### Pricing Preview
- Tease the 4 tiers
- "Starting at $49/month"
- Link to full pricing page

### FAQ
- What is ARM?
- How is this different from ChatGPT?
- Do I need technical skills?
- How do I get started?

## Technical Requirements

- [ ] Route at `/` in Next.js
- [ ] Metadata for SEO
- [ ] Structured data (SoftwareApplication, WebPage)
- [ ] OG image for social sharing

## Testing

- [ ] Visual regression: Compare to pinkbeam landing quality
- [ ] Lighthouse score >90
- [ ] Responsive check (desktop, tablet, mobile)
- [ ] Cross-browser check
- [ ] Accessibility audit

## Related

- Depends on: #30 (component migration)
- Blocks: None (parallel work with #32, #33)
