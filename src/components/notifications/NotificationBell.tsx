'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types/notification';
import {
  Bell, CheckCheck, Info, AlertCircle, AlertTriangle, CheckCircle2,
  X, Clock, ExternalLink, Settings, UserCheck, GitPullRequest, ShieldAlert, BellRing
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface NotificationBellProps {
  className?: string;
  maxNotifications?: number;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

// Icon mapping for notification types
const notificationIcons: Record<NotificationType, typeof Info> = {
  task_assigned: UserCheck,
  escalation_received: AlertTriangle,
  decision_required: GitPullRequest,
  system_alert: ShieldAlert,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

// Color mapping for notification types
const notificationColors: Record<NotificationType, string> = {
  task_assigned: 'bg-blue-500 text-white',
  escalation_received: 'bg-amber-500 text-white',
  decision_required: 'bg-purple-500 text-white',
  system_alert: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-amber-500 text-white',
  error: 'bg-red-500 text-white',
};

// Border color mapping for hover states
const notificationBorderColors: Record<NotificationType, string> = {
  task_assigned: 'border-blue-500/20 hover:border-blue-500/40',
  escalation_received: 'border-amber-500/20 hover:border-amber-500/40',
  decision_required: 'border-purple-500/20 hover:border-purple-500/40',
  system_alert: 'border-red-500/20 hover:border-red-500/40',
  info: 'border-blue-500/20 hover:border-blue-500/40',
  success: 'border-green-500/20 hover:border-green-500/40',
  warning: 'border-amber-500/20 hover:border-amber-500/40',
  error: 'border-red-500/20 hover:border-red-500/40',
};

// Format relative time (e.g., "2m ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get notification label based on type
function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    task_assigned: 'Task Assigned',
    escalation_received: 'Escalation',
    decision_required: 'Decision Required',
    system_alert: 'System Alert',
    info: 'Info',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
  };
  return labels[type] || type;
}

// Individual notification item component
function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const router = useRouter();
  const Icon = notificationIcons[notification.type];
  const borderColor = notificationBorderColors[notification.type];
  const iconColor = notificationColors[notification.type];

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  return (
    <div
      className={cn(
        'relative flex gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent/50 group',
        borderColor,
        !notification.is_read && 'bg-accent/30'
      )}
      onClick={handleClick}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', iconColor)}>
              <Icon className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">{getNotificationTypeLabel(notification.type)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium leading-tight pr-6', !notification.is_read && 'text-foreground')}>
            {notification.title}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
            title="Dismiss"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(notification.created_at)}
          </span>
          {notification.action_url && (
            <span className="text-xs text-primary flex items-center gap-0.5">
              <ExternalLink className="w-3 h-3" />
              {notification.action_label || 'View'}
            </span>
          )}
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-pink-500" />
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ message = 'No notifications yet' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Bell className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Loading state component
function LoadingState() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Main NotificationBell component
export function NotificationBell({ className, maxNotifications = 50 }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  } = useNotifications({
    filters: { limit: maxNotifications },
    enableRealtime: true,
  });

  // Prioritize unread notifications, then show recent read ones
  const displayNotifications = React.useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read);
    const read = notifications
      .filter((n) => n.is_read)
      .slice(0, Math.max(5, 10 - unread.length));
    return [...unread, ...read].slice(0, maxNotifications);
  }, [notifications, maxNotifications]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Refresh when dropdown opens
  React.useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('relative', className)}
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pink-500 px-1.5 text-xs font-medium text-white animate-in zoom-in-50">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-30"></span>
                    </span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Notifications</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              title="Refresh"
            >
              <Clock className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Notification list */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load notifications</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : displayNotifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="p-2 space-y-1">
              {displayNotifications.map((notification) => (
                <div key={notification.id} className="group">
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <DropdownMenuItem asChild className="cursor-pointer">
            <a
              href="/portal/settings/notifications"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
              Notification Settings
            </a>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { NotificationItem, EmptyState, LoadingState, formatRelativeTime, getNotificationTypeLabel };
