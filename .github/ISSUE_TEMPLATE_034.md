## Overview

Create the pricing page at `/pricing` with ARM tier structure.

## Pricing Tiers

| Tier | Agents | Price | Best For |
|------|--------|-------|----------|
| **Starter** | Up to 3 | $49/mo | Individuals testing AI agents |
| **Pro** | Up to 10 | $199/mo | Solopreneurs, small agencies |
| **Business** | Up to 25 | $499/mo | Growing businesses |
| **Scale** | Unlimited | $999/mo | Enterprises, agencies |

## Page Structure

```tsx
<MarketingLayout>
  <PricingHero />
  <PricingCards /> {/* Toggle: Monthly/Annual */}
  <FeatureComparison /> {/* Detailed table */}
  <ROICalculator /> {/* Reuse from pinkbeam */}
  <PricingFAQ />
  <CTA />
</MarketingLayout>
```

## Features to Highlight

### All Tiers
- Core dashboard
- Agent roster
- Activity feed
- Task pipeline
- Email support

### Pro+
- Advanced analytics
- Priority support
- Custom integrations
- API access

### Business+
- Team features (future)
- SLA
- Dedicated support

### Scale
- White-label
- Custom contracts
- Dedicated infrastructure

## Interactive Elements

- [ ] Monthly/Annual toggle (10% discount annual)
- [ ] Feature comparison with expandable details
- [ ] ROI calculator: inputs → time saved → value

## Testing

- [ ] Toggle works correctly
- [ ] Calculator math is accurate
- [ ] All CTAs link to signup
- [ ] Responsive layout

## Related

- Depends on: #30 (components, especially PricingSection)
- Part of: Marketing site (#29)
