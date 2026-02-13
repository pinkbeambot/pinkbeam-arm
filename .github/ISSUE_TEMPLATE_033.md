## Overview

Create the agent detail pages at `/agents/employee/[slug]`.

## Dynamic Routes

Each agent type gets its own page:
- `/agents/employee/sales` — Sales agent
- `/agents/employee/marketing` — Marketing agent
- `/agents/employee/support` — Support agent
- `/agents/employee/content` — Content agent
- `/agents/employee/research` — Research agent

## Page Structure

```tsx
<MarketingLayout>
  <AgentHero name={slug} />
  <AgentCapabilities agent={slug} />
  <SampleWork agent={slug} />
  <PricingForAgent agent={slug} />
  <RelatedAgents current={slug} />
  <CTA />
</MarketingLayout>
```

## Content per Agent Type

### Sales Agent
- **Capabilities:** Lead gen, outreach, follow-up, CRM updates
- **Sample work:** Email sequences, call summaries, pipeline reports
- **Best for:** Solopreneurs doing their own sales

### Marketing Agent
- **Capabilities:** Content creation, social media, ad management
- **Sample work:** Blog posts, social threads, ad copy
- **Best for:** Founders without marketing teams

### Support Agent
- **Capabilities:** Ticket resolution, FAQs, escalation routing
- **Sample work:** Support responses, knowledge base updates
- **Best for:** Product-led growth companies

### Content Agent
- **Capabilities:** Writing, editing, SEO optimization
- **Sample work:** Articles, newsletters, documentation
- **Best for:** Content businesses, thought leaders

### Research Agent
- **Capabilities:** Market research, competitor analysis, data gathering
- **Sample work:** Research reports, competitor briefs, trend analysis
- **Best for:** Strategy-heavy businesses

## Technical Requirements

- [ ] Dynamic route: `/agents/employee/[slug]/page.tsx`
- [ ] Agent data in config/content file
- [ ] Generate static params for all agent types
- [ ] Metadata per agent (title, description, OG image)

## Testing

- [ ] All 5 agent pages render correctly
- [ ] Navigation between agents works
- [ ] Mobile responsive
- [ ] Images load correctly

## Related

- Depends on: #30 (components)
- Part of: Marketing site (#29)
