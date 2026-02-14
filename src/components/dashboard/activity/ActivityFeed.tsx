'use client';

import * as React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ActivityItem, ActivityItemSkeleton } from './ActivityItem';
import { ActivityFilterBar } from './ActivityFilter';
import { useRealtimeActivities } from './useRealtimeActivities';
import type { ActivityEvent, ActivityFilter, ActivityFeedProps } from './types';

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ filter }: { filter: ActivityFilter }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        No activities found
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {filter.search || filter.type || filter.agentId
          ? 'Try adjusting your filters to see more activities.'
          : 'Activities will appear here when agents start working.'}
      </p>
    </div>
  );
}

// ============================================================================
// Activity Feed Component
// ============================================================================

export function ActivityFeed({
  className,
  initialFilter = {},
  showFilters = true,
  maxHeight = '600px',
  onEventClick,
  realtime = true,
  autoScroll = true,
}: ActivityFeedProps & { autoScroll?: boolean }) {
  const [filter, setFilter] = React.useState<ActivityFilter>(initialFilter);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [newEventIds, setNewEventIds] = React.useState<Set<string>>(new Set());
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isUserScrolling = React.useRef(false);
  const scrollTimeout = React.useRef<NodeJS.Timeout | null>(null);
  
  const {
    events,
    isLoading,
    isRealtime,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useRealtimeActivities({
    enabled: true,
    filter,
    onNewActivity: (activity) => {
      // Mark as new for animation
      setNewEventIds(prev => new Set(prev).add(activity.id));
      
      // Remove new indicator after 5 seconds
      setTimeout(() => {
        setNewEventIds(prev => {
          const next = new Set(prev);
          next.delete(activity.id);
          return next;
        });
      }, 5000);
      
      // Auto-scroll to newest if enabled and user is not manually scrolling
      if (autoScroll && !isUserScrolling.current && scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
  });
  
  // Handle event click
  const handleEventClick = (event: ActivityEvent) => {
    onEventClick?.(event);
  };
  
  // Handle expand toggle
  const handleExpand = (eventId: string) => {
    setExpandedId(expandedId === eventId ? null : eventId);
  };
  
  // Scroll to newest
  const scrollToNewest = React.useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      setShowScrollButton(false);
    }
  }, []);
  
  // Handle scroll to detect user scrolling and show/hide scroll button
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 100; // pixels from bottom
    
    // Track user scrolling
    isUserScrolling.current = true;
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 1000);
    
    // Show scroll button if scrolled down
    setShowScrollButton(scrollTop > 100);
    
    // Infinite scroll for loading more
    if (scrollHeight - scrollTop - clientHeight < threshold && hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);
  
  // Cleanup scroll timeout on unmount
  React.useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">Activity Feed</CardTitle>
            
            {/* Realtime indicator */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                isRealtime
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-amber-500/10 text-amber-600'
              )}
            >
              {isRealtime ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="mt-4">
            <ActivityFilterBar
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
        )}
      </CardHeader>
      
      {/* Content */}
      <CardContent className="p-0 relative">
        {/* Scroll to newest button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="sm"
            onClick={scrollToNewest}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 shadow-lg animate-fade-in"
          >
            <ChevronDown className="w-4 h-4 mr-1 rotate-180" />
            New activity
          </Button>
        )}
        
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Failed to load activities
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
            <Button onClick={refetch} variant="outline">
              Try again
            </Button>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto scrollbar-thin"
            style={{ maxHeight }}
          >
            {isLoading && events.length === 0 ? (
              // Initial loading skeletons
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ActivityItemSkeleton key={i} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              <div className="divide-y divide-border/50">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      index === 0 && newEventIds.has(event.id) && 'animate-slide-in'
                    )}
                  >
                    <ActivityItem
                      event={event}
                      isExpanded={expandedId === event.id}
                      onExpand={() => handleExpand(event.id)}
                      onClick={() => handleEventClick(event)}
                      isNew={newEventIds.has(event.id)}
                    />
                  </div>
                ))}
                
                {/* Load more indicator */}
                {hasMore && (
                  <div className="p-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadMore}
                      disabled={isLoading}
                      className="text-muted-foreground"
                    >
                      {isLoading ? 'Loading...' : 'Load more'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
