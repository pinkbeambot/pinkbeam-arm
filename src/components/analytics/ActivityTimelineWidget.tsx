'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatRelativeTime, getInitials, formatDateTime } from '@/lib/utils';
import { Activity, Bot, CheckCircle2, AlertCircle, Brain, MessageSquare, Settings } from 'lucide-react';
import type { ActivityTimelineItem } from '@/types/analytics';

interface ActivityTimelineWidgetProps {
  activities?: ActivityTimelineItem[];
  summary?: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
  };
  isLoading?: boolean;
  className?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  agent: <Bot className="h-3.5 w-3.5" />,
  task: <CheckCircle2 className="h-3.5 w-3.5" />,
  decision: <Brain className="h-3.5 w-3.5" />,
  escalation: <AlertCircle className="h-3.5 w-3.5" />,
  system: <Settings className="h-3.5 w-3.5" />,
  message: <MessageSquare className="h-3.5 w-3.5" />,
};

const categoryColors: Record<string, string> = {
  agent: 'bg-blue-500',
  task: 'bg-green-500',
  decision: 'bg-purple-500',
  escalation: 'bg-red-500',
  system: 'bg-gray-500',
  message: 'bg-amber-500',
};

export function ActivityTimelineWidget({
  activities,
  summary,
  isLoading,
  className,
}: ActivityTimelineWidgetProps) {
  if (isLoading) {
    return <ActivityTimelineSkeleton className={className} />;
  }

  const timelineItems = activities || [];

  const groupedActivities = timelineItems.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityTimelineItem[]>);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              {summary?.totalEvents ?? 0} events
            </CardDescription>
          </div>
          {summary && Object.keys(summary.eventsByCategory).length > 0 && (
            <div className="flex -space-x-1">
              {Object.entries(summary.eventsByCategory)
                .slice(0, 4)
                .map(([category, count]) => (
                  <div
                    key={category}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 border-background',
                      categoryColors[category] || 'bg-gray-500'
                    )}
                    title={`${category}: ${count}`}
                  >
                    <span className="scale-75 text-white">
                      {categoryIcons[category]}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {timelineItems.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
            <Activity className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, items]) => (
                <div key={date}>
                  <div className="sticky top-0 z-10 mb-2 bg-card">
                    <span className="text-xs font-medium text-muted-foreground">{date}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: ActivityTimelineItem }) {
  const icon = categoryIcons[activity.category] || <Activity className="h-3.5 w-3.5" />;
  const colorClass = categoryColors[activity.category] || 'bg-gray-500';

  return (
    <div className="group relative flex gap-3">
      <div className="relative flex flex-col items-center">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-white', colorClass)}>
          {icon}
        </div>
        <div className="mt-1 h-full w-px bg-border group-last:hidden" />
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{activity.title}</p>
            {activity.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {activity.description}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              {activity.agentName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[8px]">
                      {getInitials(activity.agentName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[100px]">{activity.agentName}</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(activity.timestamp)}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
            {activity.type.split('.').pop()}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function ActivityTimelineSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex -space-x-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-full border-2 border-background" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, groupIndex) => (
            <div key={groupIndex}>
              <Skeleton className="mb-2 h-3 w-16" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((__, itemIndex) => (
                  <div key={itemIndex} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="mt-1 h-12 w-px" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
