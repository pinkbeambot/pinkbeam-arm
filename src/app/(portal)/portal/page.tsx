'use client';

import { useRouter } from 'next/navigation';
import { PortalLayout, PageContainer, PageHeader } from "@/components/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Bot, CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Loader2, RefreshCw } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity";
import { useDashboardStats } from "@/components/dashboard/useDashboardStats";
import { OnboardingModal } from "@/components/onboarding";
import { useOnboarding } from "@/components/onboarding";
import { cn } from "@/lib/utils";

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading = false,
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            {isLoading ? (
              <div className="h-9 flex items-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-3xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-4">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && trendValue && (
            <span
              className={cn(
                "text-xs font-medium",
                trend === 'up' && "text-green-600",
                trend === 'down' && "text-red-600",
                trend === 'neutral' && "text-muted-foreground"
              )}
            >
              {trendValue}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Stats Error State
// ============================================================================

function StatsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="col-span-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Failed to load stats</p>
              <p className="text-sm text-muted-foreground">There was an error fetching dashboard data</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Quick Actions Component
// ============================================================================

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <Button variant="outline" className="w-full justify-start" onClick={onClick}>
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

// ============================================================================
// Main Dashboard Page
// ============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const { stats, isLoading, error, refetch } = useDashboardStats();
  const { isOpen, isLoading: onboardingLoading, completeOnboarding, skipOnboarding } = useOnboarding();

  const handleCreateAgent = () => {
    router.push('/portal/agents');
  };

  const handleViewTasks = () => {
    router.push('/portal/tasks');
  };

  const handleViewPerformance = () => {
    router.push('/portal/performance');
  };

  const handleViewTeam = () => {
    router.push('/portal/agents');
  };

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Portal"
          description="Welcome to your AI workforce command center."
        >
          <Button onClick={handleViewTasks}>Create Task</Button>
        </PageHeader>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {error ? (
            <div className="col-span-full">
              <StatsError onRetry={refetch} />
            </div>
          ) : (
            <>
              <StatCard
                title="Active Agents"
                value={stats.activeAgents}
                icon={Bot}
                description="Currently working"
                isLoading={isLoading}
              />
              <StatCard
                title="Tasks Today"
                value={stats.tasksCompletedToday}
                icon={CheckCircle2}
                description="Completed"
                isLoading={isLoading}
              />
              <StatCard
                title="Pending Escalations"
                value={stats.pendingEscalations}
                icon={AlertCircle}
                description="Need attention"
                isLoading={isLoading}
                trend={stats.pendingEscalations > 0 ? 'up' : 'neutral'}
              />
              <StatCard
                title="Avg Response"
                value={stats.avgResponseTime ?? "--"}
                icon={Clock}
                description="Minutes"
                isLoading={isLoading}
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <ActivityFeed
              maxHeight="600px"
              showFilters={false}
            />
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickActionButton
                  icon={Bot}
                  label="Create Agent"
                  onClick={handleCreateAgent}
                />
                <QuickActionButton
                  icon={CheckCircle2}
                  label="View Tasks"
                  onClick={handleViewTasks}
                />
                <QuickActionButton
                  icon={TrendingUp}
                  label="View Performance"
                  onClick={handleViewPerformance}
                />
                <QuickActionButton
                  icon={Users}
                  label="Manage Team"
                  onClick={handleViewTeam}
                />
              </CardContent>
            </Card>

            {/* Getting Started */}
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <GettingStartedStep
                    step={1}
                    title="Create your first agent"
                    description="Set up an AI worker to handle tasks"
                    isCompleted={stats.activeAgents > 0}
                  />
                  <GettingStartedStep
                    step={2}
                    title="Assign a task"
                    description="Give your agent work to do"
                    isCompleted={stats.tasksCompletedToday > 0}
                  />
                  <GettingStartedStep
                    step={3}
                    title="Monitor activity"
                    description="Watch your agent work in real-time"
                    isCompleted={false}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOpen}
        onClose={skipOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    </PortalLayout>
  );
}

// ============================================================================
// Getting Started Step Component
// ============================================================================

interface GettingStartedStepProps {
  step: number;
  title: string;
  description: string;
  isCompleted: boolean;
}

function GettingStartedStep({ step, title, description, isCompleted }: GettingStartedStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium flex-shrink-0",
          isCompleted
            ? "bg-green-500/10 text-green-600"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          step
        )}
      </div>
      <div className="min-w-0">
        <p className={cn(
          "font-medium text-sm",
          isCompleted && "text-foreground"
        )}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
