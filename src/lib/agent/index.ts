/**
 * Agent Runtime Core
 * 
 * Core runtime system for ARM (Agent Relationship Management) platform.
 * Provides state machine, spawning, lifecycle management, and context handling.
 * 
 * @module agent
 */

// State Machine
export {
  AgentStateMachine,
  agentStateMachine,
  StateTransitionError,
  InvalidStateError,
  AGENT_STATES,
  STATE_TRANSITIONS,
  STATE_METADATA,
  getPredecessorStates,
  requiresParentApproval,
  getTransitionPath
} from './state-machine';

export type {
  AgentState,
  StateMetadata,
  StateChangeEvent,
  StateChangeHandler
} from './state-machine';

// Spawner
export {
  AgentSpawner,
  createAgentSpawner,
  AGENT_TEMPLATES,
  MAX_AGENT_DEPTH,
  DEFAULT_MAX_SUB_AGENTS,
  DEFAULT_ESCALATION_THRESHOLD,
  DEFAULT_TIMEOUT_SECONDS,
  getRoleCapabilities,
  canRoleSpawn,
  validateAgentDepth
} from './spawner';

export type {
  SpawnOptions,
  SpawnContext,
  AgentLimits,
  SpawnResult,
  SpawnError,
  SpawnErrorCode,
  AgentTemplate
} from './spawner';

// Lifecycle
export {
  AgentLifecycleManager,
  createLifecycleManager,
  RECOVERY_STRATEGIES,
  DEFAULT_CONTEXT_CONFIG
} from './lifecycle';

export type {
  LifecycleOptions,
  InitializeResult,
  StartResult,
  PauseResult,
  ResumeResult,
  TerminateResult,
  RecoveryResult,
  LifecycleError,
  LifecycleErrorCode,
  AgentContext as LifecycleAgentContext,
  RecoveryStrategy
} from './lifecycle';

// Context
export {
  AgentContextManager,
  createContextManager,
  DEFAULT_CONTEXT_CONFIG as CONTEXT_DEFAULTS,
  CONTEXT_SUMMARY_TRUNCATION,
  ContextError
} from './context';

export type {
  AgentContext,
  TaskContext,
  DecisionContext,
  ActivityContext,
  ParentContext,
  ContextBuildOptions,
  ContextWindowConfig,
  ContextSearchOptions,
  ContextSearchResult
} from './context';
