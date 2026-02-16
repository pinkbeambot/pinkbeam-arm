/**
 * API Client Hooks
 * 
 * React Query-style hooks for connecting to the ARM backend API.
 * All hooks include:
 * - Loading states with skeleton support
 * - Error handling with retry
 * - Empty states
 * - Real-time updates via Supabase
 */

export { useAgents, useAgent, type UseAgentsOptions, type UseAgentsReturn } from './useAgents';
export { useActivities, useLatestActivities, type UseActivitiesOptions, type UseActivitiesReturn } from './useActivities';
export { useTasks, useTask, type UseTasksOptions, type UseTasksReturn, type CreateTaskInput, type UpdateTaskInput } from './useTasks';
