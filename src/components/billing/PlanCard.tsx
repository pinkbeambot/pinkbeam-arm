'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { SubscriptionTierConfig, SubscriptionTier } from '@/types/billing';

interface PlanCardProps {
  plan: SubscriptionTierConfig;
  currentTier: SubscriptionTier;
  onSelect: (tier: SubscriptionTier) => void;
  loading?: boolean;
}

export function PlanCard({ plan, currentTier, onSelect, loading }: PlanCardProps) {
  const isCurrent = plan.id === currentTier;
  const isUpgrade = getPlanOrder(plan.id) > getPlanOrder(currentTier);
  const isDowngrade = getPlanOrder(plan.id) < getPlanOrder(currentTier);

  return (
    <Card className={cn(
      'relative flex flex-col',
      isCurrent && 'border-primary ring-1 ring-primary',
      plan.id === 'pro' && !isCurrent && 'border-violet-300 dark:border-violet-700',
    )}>
      {plan.id === 'pro' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-violet-600 text-white hover:bg-violet-600">Most Popular</Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default">Current Plan</Badge>
        </div>
      )}

      <CardHeader className="text-center pt-8">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <CardDescription className="text-xs">{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-3xl font-bold">{formatCurrency(plan.priceMonthly / 100)}</span>
          <span className="text-muted-foreground text-sm">/month</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-2.5">
          <li className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <span>{plan.agentLimit === null ? 'Unlimited agents' : `Up to ${plan.agentLimit} agents`}</span>
          </li>
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        ) : isUpgrade ? (
          <Button
            className="w-full"
            onClick={() => onSelect(plan.id)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upgrade'}
          </Button>
        ) : isDowngrade ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onSelect(plan.id)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Downgrade'}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function getPlanOrder(tier: SubscriptionTier): number {
  const order: Record<SubscriptionTier, number> = {
    starter: 0,
    pro: 1,
    business: 2,
    scale: 3,
  };
  return order[tier];
}
