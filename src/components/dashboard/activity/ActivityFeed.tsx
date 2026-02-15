'use client';

import * as React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle, ChevronDown, Zap, WifiLow, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityItem, ActivityItemSkeleton } from './ActivityItem';
import { ActivityFilterBar } from './ActivityFilter';
import { useRealtimeActivities } from './useRealtimeActivities';
import type { ConnectionState } from '@/lib/realtime/useRealtime';
import type { ActivityEvent, ActivityFilter, ActivityFeedProps } from './types';

// ============================================================================
// Connection Status Indicator Component
// ============================================================================

interface ConnectionStatusProps {
  state: ConnectionState;
  retryCount: number;
  onRetry?: () => void;
}

function ConnectionStatus({ state, retryCount, onRetry }: ConnectionStatusProps) {
  const config: Record<ConnectionState, { 
    icon: React.ReactNode; 
    label: string; 
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    tooltip: string;
  }> = {
    connected: {
      icon: <Wifi className="w-3 h-3" />,
      label: 'Live',
      variant: 'default',
      tooltip: 'Real-time updates are active',
    },
    connecting: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Connecting...',
      variant: 'outline',
      tooltip: 'Establishing real-time connection...',
    },
    reconnecting: {
      icon: <WifiLow className="w-3 h-3" />,
      label: 'Reconnecting...',
      variant: 'secondary',
      tooltip: `Attempting to reconnect (attempt ${retryCount})...`,
    },
    disconnected: {
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Offline',
      variant: 'outline',
      tooltip: 'Real-time updates are paused. Click to reconnect.',
    },
    error: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'Error',
      variant: 'destructive',
      tooltip: 'Connection error. Click to retry.',
    },
  };

  const { icon, label, variant, tooltip } = config[state];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 cursor-pointer transition-all',
              (state === 'error' || state === 'disconnected') && 'hover:opacity-80'
            )}
            onClick={(state === 'error' || state === 'disconnected') ? onRetry : undefined}
          >
            {icon}
            <span className="text-xs">{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
// Connection Error Banner
// ============================================================================

function ConnectionErrorBanner({ 
  error, 
  onRetry 
}: { 
  error: Error | null; 
  onRetry: () => void;
}) {
  if (!error) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-700">
          Real-time updates unavailable
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 text-xs">
        Retry
      </Button>
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
    connectionState,
    connectionError,
    retryCount,
    error,
    hasMore,
    loadMore,
    refetch,
    retryConnection,
  } = useRealtimeActivities({
    enabled: realtime,
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
            
            {/* Realtime connection status */}
            {realtime && (
              <ConnectionStatus 
                state={connectionState} 
                retryCount={retryCount}
                onRetry={retryConnection}
              />
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              disabled={isLoading}
              className="h-8 w-8"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        
        {/* Connection error banner */}
        {realtime && connectionError && (
          <ConnectionErrorBanner error={connectionError} onRetry={retryConnection} />
        )}
        
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
