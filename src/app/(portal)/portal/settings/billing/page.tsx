'use client';

import * as React from 'react';
import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useBilling, useAgentLimit, useTrial } from '@/lib/hooks/useBilling';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { PlanCard } from '@/components/billing/PlanCard';
import { InvoiceTable } from '@/components/billing/InvoiceTable';
import {
  CreditCard,
  Receipt,
  BarChart3,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { SubscriptionTier, SubscriptionStatus } from '@/types/billing';

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  active: { label: 'Active', icon: CheckCircle, className: 'text-green-600 bg-green-50 border-green-200' },
  trialing: { label: 'Trial', icon: Clock, className: 'text-blue-600 bg-blue-50 border-blue-200' },
  past_due: { label: 'Past Due', icon: AlertCircle, className: 'text-red-600 bg-red-50 border-red-200' },
  canceled: { label: 'Canceled', icon: XCircle, className: 'text-gray-600 bg-gray-50 border-gray-200' },
  incomplete: { label: 'Incomplete', icon: AlertCircle, className: 'text-amber-600 bg-amber-50 border-amber-200' },
  incomplete_expired: { label: 'Expired', icon: XCircle, className: 'text-gray-600 bg-gray-50 border-gray-200' },
  unpaid: { label: 'Unpaid', icon: AlertCircle, className: 'text-red-600 bg-red-50 border-red-200' },
  paused: { label: 'Paused', icon: Clock, className: 'text-amber-600 bg-amber-50 border-amber-200' },
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-20 mx-auto" />
              <Skeleton className="h-8 w-16 mx-auto" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function BillingSettingsPage() {
  const {
    billing,
    usage,
    plans,
    invoices,
    loading,
    error,
    createCheckoutSession,
    createPortalSession,
  } = useBilling();
  const { isAtLimit } = useAgentLimit();
  const { isTrialing, daysRemaining, isTrialExpired } = useTrial();
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setCheckoutLoading(true);
    const url = await createCheckoutSession(tier);
    if (url) {
      window.location.href = url;
    }
    setCheckoutLoading(false);
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    const url = await createPortalSession();
    if (url) {
      window.location.href = url;
    }
    setPortalLoading(false);
  };

  const statusConfig = billing
    ? STATUS_CONFIG[billing.subscriptionStatus] || STATUS_CONFIG.active
    : STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <PortalLayout>
        <PageContainer>
          <PageHeader
            title="Billing & Subscription"
            description="Manage your plan, usage, and payment methods."
          />
          <LoadingSkeleton />
        </PageContainer>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Billing & Subscription"
          description="Manage your plan, usage, and payment methods."
        >
          {billing?.stripeCustomerId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage in Stripe
            </Button>
          )}
        </PageHeader>

        <div className="space-y-6 max-w-5xl">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {/* Trial banner */}
          {isTrialing && !isTrialExpired && daysRemaining !== null && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Your trial ends in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>.
                Subscribe to a plan to keep your agents running.
              </AlertDescription>
            </Alert>
          )}

          {isTrialExpired && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your trial has expired. Subscribe to a plan to continue using ARM.
              </AlertDescription>
            </Alert>
          )}

          {billing?.cancelAtPeriodEnd && (
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Your subscription will cancel at the end of the current period
                ({formatDate(billing.currentPeriodEndsAt)}).
              </AlertDescription>
            </Alert>
          )}

          {/* Current Plan Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your subscription details and current billing period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-bold capitalize">
                    {billing?.currentTier || 'Starter'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusConfig.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    {billing?.currentPeriodEndsAt && (
                      <span className="text-xs text-muted-foreground">
                        Renews {formatDate(billing.currentPeriodEndsAt)}
                      </span>
                    )}
                  </div>
                </div>
                {billing?.stripeCustomerId && (
                  <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={portalLoading}>
                    Manage Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Overview */}
          {usage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Usage
                </CardTitle>
                <CardDescription>
                  Current resource usage against your plan limits
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
                  current={Math.round(usage.storageUsedMb)}
                  limit={usage.storageLimitMb}
                  unit="MB"
                />
                {isAtLimit && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You&apos;ve reached your agent limit. Upgrade your plan to create more agents.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          {plans.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-1">Available Plans</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose the plan that best fits your needs
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {plans
                    .filter((p) => p.isActive)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        currentTier={billing?.currentTier || 'starter'}
                        onSelect={handleUpgrade}
                        loading={checkoutLoading}
                      />
                    ))}
                </div>
              </div>
            </>
          )}

          {/* Invoice History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Invoice History
              </CardTitle>
              <CardDescription>
                Your recent invoices and payment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceTable invoices={invoices} />
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </PortalLayout>
  );
}
