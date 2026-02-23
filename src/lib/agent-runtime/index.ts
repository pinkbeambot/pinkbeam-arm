/**
 * Agent Runtime Core Module
 * 
 * Central export for all agent runtime services
 * 
 * @module src/lib/agent-runtime
 */

export { AgentSpawner, getAgentSpawner, resetAgentSpawner } from './spawner';
export { AgentLifecycleManager, getLifecycleManager, resetLifecycleManager } from './lifecycle';
// TODO: Fix llm-router export - file doesn't exist
// export { AgentLLMRouter, getAgentLLMRouter, resetAgentLLMRouter } from './llm-router';
// TODO: Fix messaging export - file doesn't exist
// export { A2AMessagingService, getMessagingService, resetMessagingService } from './messaging';

// Re-export types
export type { SpawnAgentInput, SpawnAgentResult, SpawnerConfig } from './spawner';
export type { LifecycleState, TransitionResult, TransitionRequest, LifecycleConfig } from './lifecycle';
// TODO: Fix llm-router type exports - file doesn't exist
// export type { RouteRequest, RouteResult, RouterConfig } from './llm-router';
// TODO: Fix messaging type exports - file doesn't exist
// export type { SendMessageInput, SendMessageResult, MessagingConfig } from './messaging';
