'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Wifi, WifiOff, RefreshCw, Activity as ActivityIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { ActivityItem, ActivityItemSkeleton } from '@/components/dashboard/activity';
import { ActivityFilters } from '@/components/dashboard/activity/ActivityFilters';
import { useActivities, type EntityType, type TimeRange, type ActionType } from '@/hooks/useActivities';
import { useAuth } from '@/components/auth/AuthProvider';
import { EmptyStateSearch, EmptyStateError } from '@/components/empty';
import type { Activity } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface ActivityFeedPageClientProps {
  initialAgentId?: string;
}

// ============================================================================
// Connection Status Component
// ============================================================================

function ConnectionStatusBadge({
  isConnected,
  isReconnecting,
  onRetry,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
  onRetry?: () => void;
}) {
  if (isReconnecting) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Reconnecting...
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge variant="default" className="gap-1.5 bg-green-500 hover:bg-green-600">
        <Wifi className="w-3 h-3" />
        Live
      </Badge>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 gap-1.5 text-xs"
      onClick={onRetry}
    >
      <WifiOff className="w-3 h-3" />
      Offline
    </Button>
  );
}

// ============================================================================
// Empty State Components
// ============================================================================

function ActivityEmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <EmptyStateSearch
        title="No activities found"
        description="Try adjusting your filters to see more activities."
        onClear={onClearFilters}
        clearLabel="Clear filters"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <ActivityIcon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        No activities yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Activities will appear here when agents start working. Check back soon!
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ActivityFeedPageClient({ initialAgentId }: ActivityFeedPageClientProps = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const [agents, setAgents] = React.useState<{ id: string; name: string; avatar_url?: string }[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = React.useState(false);
  
  // Filters state
  const [entityType, setEntityType] = React.useState<EntityType>('all');
  const [timeRange, setTimeRange] = React.useState<TimeRange>('24h');
  const [agentId, setAgentId] = React.useState<string | undefined>(initialAgentId);
  const [actionTypes, setActionTypes] = React.useState<ActionType[]>([]);
  const [search, setSearch] = React.useState<string>('');

  // Fetch agents for filter dropdown
  React.useEffect(() => {
    async function fetchAgents() {
      try {
        setIsLoadingAgents(true);
        const response = await fetch('/api/agents?limit=100');
        if (response.ok) {
          const data = await response.json();
          const agentList = data.data?.map((agent: { id: string; name: string; avatar_url?: string }) => ({
            id: agent.id,
            name: agent.name,
            avatar_url: agent.avatar_url,
          })) || [];
          setAgents(agentList);
        }
      } catch {
        // Silently fail - agents list is not critical
      } finally {
        setIsLoadingAgents(false);
      }
    }

    fetchAgents();
  }, []);

  // Use the activities hook with React Query
  const {
    activities,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRealtimeConnected,
    isRealtimeReconnecting,
    retryRealtime,
  } = useActivities({
    entityType,
    timeRange,
    agentId,
    actionType: actionTypes.length > 0 ? actionTypes[0] : undefined, // Hook supports single action type
    search,
    realtime: true,
  });

  // Handle filter changes
  const handleFiltersChange = React.useCallback(
    (filters: {
      entityType?: EntityType;
      timeRange?: TimeRange;
      agentId?: string;
      actionTypes?: ActionType[];
      search?: string;
    }) => {
      if (filters.entityType !== undefined) setEntityType(filters.entityType);
      if (filters.timeRange !== undefined) setTimeRange(filters.timeRange);
      if (filters.agentId !== undefined) setAgentId(filters.agentId);
      if (filters.actionTypes !== undefined) setActionTypes(filters.actionTypes || []);
      if (filters.search !== undefined) setSearch(filters.search || '');
    },
    []
  );

  // Clear all filters
  const handleClearFilters = React.useCallback(() => {
    setEntityType('all');
    setTimeRange('24h');
    setAgentId(undefined);
    setActionTypes([]);
    setSearch('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters =
    entityType !== 'all' ||
    timeRange !== '24h' ||
    !!agentId ||
    actionTypes.length > 0 ||
    !!search;

  // Handle activity click
  const handleActivityClick = React.useCallback(
    (activity: Activity) => {
      // Navigate based on related entity
      if (activity.related_task_id) {
        router.push(`/portal/tasks/${activity.related_task_id}`);
      } else if (activity.related_decision_id) {
        router.push(`/portal/decisions/${activity.related_decision_id}`);
      } else if (activity.related_escalation_id) {
        router.push(`/portal/escalations/${activity.related_escalation_id}`);
      } else if (activity.agent_id) {
        router.push(`/portal/agents/${activity.agent_id}`);
      }
    },
    [router]
  );

  // Transform Activity to ActivityEvent for ActivityItem
  const transformActivity = React.useCallback((activity: Activity) => {
    const typeMap: Record<string, string> = {
      'agent.spawned': 'agent_spawned',
      'agent.status_changed': 'agent_spawned',
      'agent.terminated': 'agent_terminated',
      'task.created': 'task_created',
      'task.assigned': 'task_created',
      'task.started': 'task_started',
      'task.progress': 'task_started',
      'task.completed': 'task_completed',
      'task.failed': 'task_failed',
      'decision.proposed': 'decision_made',
      'decision.made': 'decision_made',
      'decision.overridden': 'decision_made',
      'escalation.created': 'escalation_created',
      'escalation.resolved': 'escalation_resolved',
      'message.sent': 'task_created',
      'message.received': 'task_created',
      'system.error': 'task_failed',
      'system.config_changed': 'agent_spawned',
    };

    const targetType = activity.related_task_id
      ? 'task'
      : activity.related_decision_id
      ? 'decision'
      : activity.related_escalation_id
      ? 'escalation'
      : undefined;

    return {
      id: activity.id,
      type: (typeMap[activity.type] || 'task_created') as
        | 'task_created'
        | 'task_started'
        | 'task_completed'
        | 'task_failed'
        | 'decision_made'
        | 'escalation_created'
        | 'escalation_resolved'
        | 'agent_spawned'
        | 'agent_terminated',
      timestamp: activity.created_at,
      actor: {
        id: activity.agent_id || activity.actor_id || 'system',
        type: (activity.actor_type || 'agent') as 'agent' | 'user' | 'system',
        name:
          (activity.metadata?.actor_name as string) ||
          activity.agent?.name ||
          activity.agent_id ||
          'System',
        avatarUrl: (activity.metadata?.actor_avatar as string) || activity.agent?.avatar_url,
      },
      target: targetType && (activity.related_task_id || activity.related_decision_id || activity.related_escalation_id)
        ? {
            id: activity.related_task_id || activity.related_decision_id || activity.related_escalation_id || '',
            type: targetType as 'task' | 'decision' | 'escalation',
            name: (activity.metadata?.target_name as string) || activity.title,
          }
        : undefined,
      metadata: {
        title: activity.title,
        description: activity.description,
        ...activity.metadata,
      },
    };
  }, []);

  return (
    <PortalLayout>
      <PageContainer>
        {/* Header with real-time indicator */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Activity Feed
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time stream of everything happening in your AI workforce
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatusBadge
              isConnected={isRealtimeConnected}
              isReconnecting={isRealtimeReconnecting}
              onRetry={retryRealtime}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-8 w-8"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with filters */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <ActivityFilters
                  entityType={entityType}
                  timeRange={timeRange}
                  agentId={agentId}
                  actionTypes={actionTypes}
                  search={search}
                  agents={agents}
                  isLoadingAgents={isLoadingAgents}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  variant="sidebar"
                  showSearch={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Activity feed */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                {error ? (
                  <div className="p-6">
                    <EmptyStateError
                      title="Failed to load activities"
                      description="We couldn't fetch your activities. Please try again."
                      onRetry={refetch}
                      retryLabel="Try Again"
                      error={error}
                    />
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {isLoading && activities.length === 0 ? (
                      // Initial loading skeletons
                      <div className="p-4 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <ActivityItemSkeleton key={i} />
                        ))}
                      </div>
                    ) : activities.length === 0 ? (
                      <ActivityEmptyState
                        hasFilters={hasActiveFilters}
                        onClearFilters={handleClearFilters}
                      />
                    ) : (
                      <div className="divide-y divide-border/50">
                        {activities.map((activity) => (
                          <ActivityItem
                            key={activity.id}
                            event={transformActivity(activity)}
                            onClick={() => handleActivityClick(activity)}
                          />
                        ))}

                        {/* Load more */}
                        {hasNextPage && (
                          <div className="p-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchNextPage()}
                              disabled={isFetchingNextPage}
                              className="text-muted-foreground"
                            >
                              {isFetchingNextPage
                                ? 'Loading...'
                                : 'Load more activities'}
                            </Button>
                          </div>
                        )}

                        {/* End of feed */}
                        {!hasNextPage && activities.length > 0 && (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            You've reached the end of the feed
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </PortalLayout>
  );
}
