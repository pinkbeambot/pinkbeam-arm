'use client';

import * as React from 'react';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useActivityFeed } from '@/components/dashboard/activity/useActivityFeed';
import { ActivityItem, ActivityItemSkeleton } from '@/components/dashboard/activity/ActivityItem';

// ============================================================================
// Types
// ============================================================================

interface ActivityTabProps {
  agentId: string;
}

// ============================================================================
// Activity Tab Component
// ============================================================================

export function ActivityTab({ agentId }: ActivityTabProps) {
  const {
    events,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    isRealtime,
  } = useActivityFeed({
    filter: {
      agentId,
      type: 'all',
      timeRange: '7d',
    },
    enabled: !!agentId,
  });

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load activity feed: {error.message}</span>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <ActivityTabSkeleton />;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">No recent activity</p>
        <p className="text-sm mt-1">This agent hasn&apos;t performed any actions recently.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Realtime indicator */}
      {isRealtime && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>Live updates</span>
        </div>
      )}

      {/* Activity list */}
      <div className="space-y-1">
        {events.map((event, index) => (
          <ActivityItem
            key={event.id}
            event={event}
            isNew={index < 3} // Mark first 3 as new for visual emphasis
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={loadMore}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Load more'
          )}
        </Button>
      )}

      {/* End of feed */}
      {!hasMore && events.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">
          End of activity feed
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Skeleton Loading State
// ============================================================================

function ActivityTabSkeleton() {
  return (
    <div className="space-y-4">
      {/* Realtime indicator skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Activity items skeleton */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default ActivityTab;
