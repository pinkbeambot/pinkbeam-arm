/**
 * Agent Runtime Core Module
 *
 * Central export for all agent runtime services
 *
 * @module src/lib/agent-runtime
 */

export { AgentSpawner, getAgentSpawner, resetAgentSpawner } from './spawner';
export { AgentLifecycleManager, getLifecycleManager, resetLifecycleManager } from './lifecycle';
export { AgentLLMRouter, getAgentLLMRouter, resetAgentLLMRouter } from './llm-router';
export { A2AMessagingService, getMessagingService, resetMessagingService } from './messaging';

// Re-export types
export type { SpawnAgentInput, SpawnAgentResult, SpawnerConfig } from './spawner';
export type { LifecycleState, TransitionResult, TransitionRequest, LifecycleConfig } from './lifecycle';
export type { RouteRequest, RouteResult, RouterConfig } from './llm-router';
export type { SendMessageInput, SendMessageResult, MessagingConfig } from './messaging';
