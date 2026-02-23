// WebSocket Hooks
export {
  useWebSocket,
  useTopic,
  useGlobalWebSocket,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
} from "./useWebSocket";

// Agent Status Hook
export {
  useAgentStatus,
  useAgentsStatus,
  type UseAgentStatusOptions,
  type UseAgentStatusReturn,
} from "./useAgentStatus";

// Activity Feed Hook (re-export from components)
export {
  useActivityFeed,
  type UseActivityFeedOptions,
  type UseActivityFeedReturn,
} from "@/components/dashboard/activity";

// Activities Hook (React Query based)
export {
  useActivities,
  type UseActivitiesOptions,
  type UseActivitiesReturn,
  type ActivityFilters,
  type EntityType,
  type TimeRange,
  type ActionType,
} from "./useActivities";

// Real-time Activities Hook
export {
  useActivitiesRealtime,
  type UseActivitiesRealtimeOptions,
  type UseActivitiesRealtimeReturn,
} from "./useActivitiesRealtime";
