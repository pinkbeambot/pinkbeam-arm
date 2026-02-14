'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/notification';
import {
  Bell, CheckCheck, Info, AlertCircle, AlertTriangle, CheckCircle2,
  X, Clock, ExternalLink, Filter, MoreHorizontal, Trash2,
  UserCheck, GitPullRequest, ShieldAlert, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: string) => Promise<boolean>;
  onMarkAllAsRead: () => Promise<number>;
  onDelete: (id: string) => Promise<boolean>;
  onRefresh: () => void;
  maxNotifications?: number;
  className?: string;
  showFilters?: boolean;
  emptyMessage?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  showMarkAsRead?: boolean;
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
  decision_required: 'bg-pink-500 text-white',
  system_alert: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-amber-500 text-white',
  error: 'bg-red-500 text-white',
};

// Badge variant mapping for notification types
const notificationBadgeVariants: Record<NotificationType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  task_assigned: 'default',
  escalation_received: 'secondary',
  decision_required: 'default',
  system_alert: 'destructive',
  info: 'default',
  success: 'secondary',
  warning: 'secondary',
  error: 'destructive',
};

// Format relative time
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
    task_assigned: 'Task',
    escalation_received: 'Escalation',
    decision_required: 'Decision',
    system_alert: 'System',
    info: 'Info',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
  };
  return labels[type] || type;
}

// Individual notification item
function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  showMarkAsRead = true,
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = notificationIcons[notification.type];
  const iconColor = notificationColors[notification.type];
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onMarkAsRead(notification.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    await onDelete(notification.id);
  };

  if (isDeleting) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative flex gap-3 p-3 rounded-lg border transition-all cursor-pointer group',
        'hover:bg-accent/50 hover:border-border/80',
        !notification.is_read ? 'bg-accent/20 border-l-4 border-l-pink-500' : 'bg-background border-border'
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', iconColor)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={notificationBadgeVariants[notification.type]} className="text-[10px] px-1.5 py-0 h-4">
              {getNotificationTypeLabel(notification.type)}
            </Badge>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-pink-500" />
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {showMarkAsRead && !notification.is_read && (
                <DropdownMenuItem onClick={handleMarkAsRead}>
                  <Check className="w-4 h-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h4 className={cn('text-sm font-medium mt-1', !notification.is_read && 'text-foreground')}>
          {notification.title}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>

        {/* Footer info */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(notification.created_at)}
          </span>
          {notification.action_url && (
            <span className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              <ExternalLink className="w-3 h-3" />
              {notification.action_label || 'View details'}
            </span>
          )}
        </div>

        {/* Priority indicator */}
        {notification.priority === 'urgent' && (
          <Badge variant="destructive" className="mt-2 text-[10px]">
            Urgent
          </Badge>
        )}
        {notification.priority === 'high' && (
          <Badge variant="secondary" className="mt-2 text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100">
            High Priority
          </Badge>
        )}
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ message = 'No notifications yet' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground">{message}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        When you receive notifications, they&apos;ll appear here.
      </p>
    </div>
  );
}

// Loading state
function LoadingState({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 border rounded-lg">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Filter tabs
function FilterTabs({
  activeFilter,
  onFilterChange,
  unreadCount,
}: {
  activeFilter: 'all' | 'unread' | 'task_assigned' | 'escalation_received' | 'decision_required' | 'system_alert';
  onFilterChange: (filter: typeof activeFilter) => void;
  unreadCount: number;
}) {
  const filters: { value: typeof activeFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'task_assigned', label: 'Tasks' },
    { value: 'escalation_received', label: 'Escalations' },
    { value: 'decision_required', label: 'Decisions' },
    { value: 'system_alert', label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs whitespace-nowrap"
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
          {filter.count !== undefined && filter.count > 0 && (
            <span className="ml-1.5 bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {filter.count > 99 ? '99+' : filter.count}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

// Main NotificationDropdown component
export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
  maxNotifications = 50,
  className,
  showFilters = true,
  emptyMessage = 'No notifications yet',
}: NotificationDropdownProps) {
  const [activeFilter, setActiveFilter] = React.useState<
    'all' | 'unread' | 'task_assigned' | 'escalation_received' | 'decision_required' | 'system_alert'
  >('all');

  // Filter notifications based on active filter
  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications;

    if (activeFilter === 'unread') {
      filtered = notifications.filter((n) => !n.is_read);
    } else if (activeFilter !== 'all') {
      filtered = notifications.filter((n) => n.type === activeFilter);
    }

    return filtered.slice(0, maxNotifications);
  }, [notifications, activeFilter, maxNotifications]);

  const handleMarkAllAsRead = async () => {
    await onMarkAllAsRead();
  };

  // Get count for current filter
  const currentFilterCount = React.useMemo(() => {
    if (activeFilter === 'unread') return unreadCount;
    if (activeFilter === 'all') return notifications.length;
    return notifications.filter((n) => n.type === activeFilter).length;
  }, [notifications, activeFilter, unreadCount]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'w-full max-w-md bg-background border rounded-lg shadow-lg overflow-hidden',
        className
      )}
    >
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
            onClick={onRefresh}
            title="Refresh"
          >
            <Clock className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          unreadCount={unreadCount}
        />
      )}

      {/* Notification list */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <LoadingState />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            message={
              activeFilter === 'unread'
                ? 'No unread notifications'
                : activeFilter === 'all'
                ? emptyMessage
                : `No ${getNotificationTypeLabel(activeFilter as NotificationType).toLowerCase()} notifications`
            }
          />
        ) : (
          <div className="p-2 space-y-2">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredNotifications.length} of {currentFilterCount}
        </span>
        <a
          href="/portal/settings/notifications"
          className="text-primary hover:underline flex items-center gap-1"
        >
          Settings
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export { NotificationItem, EmptyState, LoadingState, FilterTabs, formatRelativeTime, getNotificationTypeLabel };
