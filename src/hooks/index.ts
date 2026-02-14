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
