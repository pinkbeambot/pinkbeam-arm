'use client';

import * as React from 'react';
import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { PlanCard, UsageMeter, InvoiceTable } from '@/components/billing';
import { useBilling, useAgentLimit, useTrial } from '@/lib/hooks/useBilling';
import { useRBAC } from '@/lib/hooks';
import type { SubscriptionTier } from '@/types';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  Zap,
  BarChart3,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

function BillingLoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  trialing: { label: 'Trial', variant: 'secondary' },
  past_due: { label: 'Past Due', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'outline' },
  incomplete: { label: 'Incomplete', variant: 'outline' },
  unpaid: { label: 'Unpaid', variant: 'destructive' },
  paused: { label: 'Paused', variant: 'outline' },
};

export default function BillingSettingsPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  const {
    billing,
    usage,
    plans,
    invoices,
    loading: isLoading,
    error,
    refetch,
    createCheckoutSession,
    createPortalSession,
  } = useBilling();

  const [isCreatingCheckout, setIsCreatingCheckout] = React.useState(false);
  const [isCreatingPortal, setIsCreatingPortal] = React.useState(false);

  const { agentCount: currentCount, agentLimit: limit, isAtLimit, percentUsed } = useAgentLimit();
  const canCreate = !isAtLimit;
  const { isTrialing, daysRemaining } = useTrial();

  // RBAC permissions
  const { can } = useRBAC();
  const canReadBilling = can('billing:read');
  const canManageBilling = can('billing:manage');

  const [selectedTier, setSelectedTier] = React.useState<SubscriptionTier | null>(null);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setIsCreatingCheckout(true);
    try {
      const url = await createCheckoutSession(tier);
      if (url) {
        window.location.href = url;
      }
    } finally {
      setIsCreatingCheckout(false);
      setSelectedTier(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsCreatingPortal(true);
    try {
      const url = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setIsCreatingPortal(false);
    }
  };

  if (!canReadBilling) {
    return (
      <PortalLayout>
        <PageContainer>
          <PageHeader
            title="Billing & Subscription"
            description="Manage your subscription plan and billing information"
          />
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have permission to view billing information. Contact your workspace owner for access.
            </AlertDescription>
          </Alert>
        </PageContainer>
      </PortalLayout>
    );
  }

  if (isLoading) {
    return (
      <PortalLayout>
        <PageContainer>
          <PageHeader
            title="Billing & Subscription"
            description="Manage your subscription plan and billing information"
          />
          <BillingLoadingSkeleton />
        </PageContainer>
      </PortalLayout>
    );
  }

  const currentTier = billing?.currentTier || 'starter';
  const statusInfo = statusLabels[billing?.subscriptionStatus || 'trialing'] || statusLabels.trialing;

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Billing & Subscription"
          description="Manage your subscription plan and billing information"
        >
          {billing?.stripeCustomerId && canManageBilling && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={isCreatingPortal}
            >
              {isCreatingPortal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage Subscription
            </Button>
          )}
        </PageHeader>

        <div className="space-y-6 max-w-6xl">
          {/* Success/Cancel alerts */}
          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Your subscription has been updated successfully. It may take a moment to reflect.
              </AlertDescription>
            </Alert>
          )}
          {canceled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Checkout was canceled. No changes have been made to your subscription.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message}
                <Button variant="link" size="sm" onClick={refetch} className="ml-2 p-0 h-auto">
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Overview Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Current Plan
                </CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <span className="capitalize">{currentTier}</span>
                  <Badge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {billing?.cancelAtPeriodEnd && (
                  <p className="text-xs text-destructive">
                    Cancels at end of billing period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Agents
                </CardDescription>
                <CardTitle>
                  {currentCount} / {limit === null ? 'Unlimited' : limit}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!canCreate && (
                  <p className="text-xs text-destructive">Agent limit reached</p>
                )}
                {canCreate && percentUsed !== null && percentUsed >= 80 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {percentUsed}% of agent limit used
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {isTrialing ? 'Trial Ends' : 'Current Period'}
                </CardDescription>
                <CardTitle className="text-lg">
                  {isTrialing && daysRemaining !== null ? (
                    `${daysRemaining} days left`
                  ) : billing?.currentPeriodEndsAt ? (
                    new Date(billing.currentPeriodEndsAt).toLocaleDateString()
                  ) : (
                    '-'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isTrialing && daysRemaining !== null && daysRemaining <= 3 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Trial ending soon - upgrade to keep your workspace
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Usage Section */}
          {usage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Usage
                </CardTitle>
                <CardDescription>
                  Current resource usage for your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <UsageMeter
                  label="Agents"
                  current={usage.agentCount}
                  limit={usage.agentLimit}
                />
                <UsageMeter
                  label="Tasks"
                  current={usage.taskCount}
                  limit={usage.taskLimit}
                />
                <UsageMeter
                  label="Storage"
                  current={Math.round(usage.storageUsedMb * 10) / 10}
                  limit={usage.storageLimitMb}
                  unit=" MB"
                />
              </CardContent>
            </Card>
          )}

          {/* Plans Grid */}
          {plans.length > 0 && canManageBilling && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-1">Available Plans</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose the plan that best fits your needs
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      currentTier={currentTier as SubscriptionTier}
                      onSelect={handleUpgrade}
                      loading={isCreatingCheckout && selectedTier === plan.id}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Invoices */}
          {invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Recent Invoices
                </CardTitle>
                <CardDescription>
                  Your billing history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceTable invoices={invoices} />
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </PortalLayout>
  );
}
