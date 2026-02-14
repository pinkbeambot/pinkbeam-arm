// Dashboard Components & Hooks

// Activity Feed (re-export from activity folder)
export {
  ActivityFeed,
  ActivityItem,
  ActivityItemSkeleton,
  ActivityIcon,
  ActivityTypeBadge,
  ActivityCategoryBadge,
  ActivityFilterBar,
  useRealtimeActivities,
  useActivityFeed,
} from './activity';

// Dashboard Stats Hook
export { useDashboardStats } from './useDashboardStats';
export type { DashboardStats, UseDashboardStatsReturn } from './useDashboardStats';

// Activity Types (re-export)
export type {
  ActivityEvent,
  ActivityEventType,
  ActivityFilter,
  ActivityFilterType,
  ActivityFeedState,
  ActivityFeedProps,
  ActivityItemProps,
  ActivityIconProps,
  ActivityFilterBarProps,
  RealtimeActivityUpdate,
  UseRealtimeActivitiesOptions,
  UseActivityFeedOptions,
  UseActivityFeedReturn,
  ActivitiesApiResponse,
} from './activity';
