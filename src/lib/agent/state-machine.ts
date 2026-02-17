/**
 * Agent State Machine
 * 
 * Manages agent lifecycle states and valid transitions.
 * Based on AGENT-PROTOCOL.md specification.
 * 
 * States: initializing → idle → active → paused → blocked → error → terminated
 */

import { AgentStatus } from '@/types';

// ============================================================================
// State Definitions
// ============================================================================

export const AGENT_STATES = [
  'initializing',
  'idle',
  'active',
  'paused',
  'blocked',
  'error',
  'escaped',
  'terminated'
] as const satisfies AgentStatus[];

export type AgentState = typeof AGENT_STATES[number];

// ============================================================================
// State Transition Rules
// ============================================================================

/**
 * Valid state transitions matrix
 * Key: current state, Value: allowed next states
 */
export const STATE_TRANSITIONS: Record<AgentState, AgentState[]> = {
  // Initializing can complete to idle or fail to error
  initializing: ['idle', 'error', 'terminated'],
  
  // Idle can start working, be paused, or terminate
  idle: ['active', 'paused', 'terminated'],
  
  // Active can complete to idle, pause, block, error, or terminate
  active: ['idle', 'paused', 'blocked', 'error', 'terminated'],
  
  // Paused can resume to previous state or terminate
  paused: ['idle', 'active', 'terminated'],
  
  // Blocked can resume, error, escape to human control, or terminate
  blocked: ['active', 'error', 'escaped', 'terminated'],
  
  // Error can recover to idle or be terminated
  error: ['idle', 'terminated'],
  
  // Escaped (human control) can resume or terminate
  escaped: ['active', 'terminated'],
  
  // Terminated is terminal - no outgoing transitions
  terminated: []
};

// ============================================================================
// State Metadata
// ============================================================================

export interface StateMetadata {
  description: string;
  isTerminal: boolean;
  isActive: boolean;
  allowsProcessing: boolean;
  color: string;
}

export const STATE_METADATA: Record<AgentState, StateMetadata> = {
  initializing: {
    description: 'Agent is being set up and configured',
    isTerminal: false,
    isActive: true,
    allowsProcessing: false,
    color: '#6366f1'
  },
  idle: {
    description: 'Agent is ready to receive tasks',
    isTerminal: false,
    isActive: false,
    allowsProcessing: true,
    color: '#22c55e'
  },
  active: {
    description: 'Agent is currently working on a task',
    isTerminal: false,
    isActive: true,
    allowsProcessing: true,
    color: '#3b82f6'
  },
  paused: {
    description: 'Agent is temporarily suspended by parent',
    isTerminal: false,
    isActive: false,
    allowsProcessing: false,
    color: '#f59e0b'
  },
  blocked: {
    description: 'Agent is waiting for external input (escalation)',
    isTerminal: false,
    isActive: false,
    allowsProcessing: false,
    color: '#f97316'
  },
  error: {
    description: 'Agent encountered an error and needs attention',
    isTerminal: false,
    isActive: false,
    allowsProcessing: false,
    color: '#ef4444'
  },
  escaped: {
    description: 'Human has taken control of the agent',
    isTerminal: false,
    isActive: false,
    allowsProcessing: false,
    color: '#a855f7'
  },
  terminated: {
    description: 'Agent has been cleaned up and archived',
    isTerminal: true,
    isActive: false,
    allowsProcessing: false,
    color: '#6b7280'
  }
};

// ============================================================================
// State Change Event
// ============================================================================

export interface StateChangeEvent {
  agentId: string;
  tenantId: string;
  previousState: AgentState;
  newState: AgentState;
  reason?: string;
  triggeredBy: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type StateChangeHandler = (event: StateChangeEvent) => void | Promise<void>;

// ============================================================================
// State Machine Class
// ============================================================================

export class AgentStateMachine {
  private handlers: Map<string, StateChangeHandler[]> = new Map();
  
  canTransition(from: AgentState, to: AgentState): boolean {
    if (from === to) return true;
    return STATE_TRANSITIONS[from]?.includes(to) ?? false;
  }
  
  getValidTransitions(state: AgentState): AgentState[] {
    return [...STATE_TRANSITIONS[state]];
  }
  
  validateTransition(from: AgentState, to: AgentState): { valid: boolean; error?: string } {
    if (STATE_METADATA[from].isTerminal) {
      return { valid: false, error: `Cannot transition from terminal state '${from}'` };
    }
    
    if (!this.canTransition(from, to)) {
      return { valid: false, error: `Invalid transition from '${from}' to '${to}'` };
    }
    
    return { valid: true };
  }
  
  async transition(event: StateChangeEvent): Promise<void> {
    const validation = this.validateTransition(event.previousState, event.newState);
    
    if (!validation.valid) {
      throw new StateTransitionError(validation.error!, event.previousState, event.newState);
    }
    
    await this.executeExitActions(event);
    await this.executeTransitionHandlers(event);
    await this.executeEntryActions(event);
  }
  
  onStateChange(handler: StateChangeHandler): () => void {
    const key = 'global';
    if (!this.handlers.has(key)) this.handlers.set(key, []);
    this.handlers.get(key)!.push(handler);
    
    return () => {
      const handlers = this.handlers.get(key);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }
  
  onEnterState(state: AgentState, handler: StateChangeHandler): () => void {
    const key = `enter:${state}`;
    if (!this.handlers.has(key)) this.handlers.set(key, []);
    this.handlers.get(key)!.push(handler);
    
    return () => {
      const handlers = this.handlers.get(key);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }
  
  onExitState(state: AgentState, handler: StateChangeHandler): () => void {
    const key = `exit:${state}`;
    if (!this.handlers.has(key)) this.handlers.set(key, []);
    this.handlers.get(key)!.push(handler);
    
    return () => {
      const handlers = this.handlers.get(key);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }
  
  getStateMetadata(state: AgentState): StateMetadata {
    return STATE_METADATA[state];
  }
  
  isProcessingState(state: AgentState): boolean {
    return STATE_METADATA[state].allowsProcessing;
  }
  
  isTerminalState(state: AgentState): boolean {
    return STATE_METADATA[state].isTerminal;
  }
  
  getRecommendedAction(state: AgentState): string {
    switch (state) {
      case 'initializing': return 'Wait for initialization to complete';
      case 'idle': return 'Assign a task to activate the agent';
      case 'active': return 'Monitor progress, agent is working';
      case 'paused': return 'Resume when ready to continue';
      case 'blocked': return 'Resolve escalation to unblock';
      case 'error': return 'Review error and recover or terminate';
      case 'escaped': return 'Return control to agent or terminate';
      case 'terminated': return 'Agent is archived, no action needed';
      default: return 'Unknown state';
    }
  }
  
  private async executeEntryActions(event: StateChangeEvent): Promise<void> {
    const handlers = [
      ...(this.handlers.get('global') || []),
      ...(this.handlers.get(`enter:${event.newState}`) || [])
    ];
    
    for (const handler of handlers) await handler(event);
  }
  
  private async executeExitActions(event: StateChangeEvent): Promise<void> {
    const handlers = [...(this.handlers.get(`exit:${event.previousState}`) || [])];
    for (const handler of handlers) await handler(event);
  }
  
  private async executeTransitionHandlers(event: StateChangeEvent): Promise<void> {
    // Transition-specific logic can be added here
  }
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class StateTransitionError extends Error {
  constructor(
    message: string,
    public readonly fromState: AgentState,
    public readonly toState: AgentState
  ) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

export class InvalidStateError extends Error {
  constructor(public readonly state: string, public readonly agentId?: string) {
    super(`Invalid agent state: ${state}${agentId ? ` for agent ${agentId}` : ''}`);
    this.name = 'InvalidStateError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getPredecessorStates(state: AgentState): AgentState[] {
  const predecessors: AgentState[] = [];
  
  for (const [fromState, toStates] of Object.entries(STATE_TRANSITIONS)) {
    if (toStates.includes(state)) predecessors.push(fromState as AgentState);
  }
  
  return predecessors;
}

export function requiresParentApproval(from: AgentState, to: AgentState): boolean {
  const criticalTransitions: Array<[AgentState, AgentState]> = [
    ['active', 'terminated'],
    ['paused', 'terminated'],
    ['blocked', 'terminated'],
    ['error', 'terminated']
  ];
  
  return criticalTransitions.some(([f, t]) => f === from && t === to);
}

export function getTransitionPath(from: AgentState, to: AgentState): AgentState[] | null {
  if (from === to) return [from];
  
  const queue: Array<{ state: AgentState; path: AgentState[] }> = [{ state: from, path: [from] }];
  const visited = new Set<AgentState>([from]);
  
  while (queue.length > 0) {
    const { state, path } = queue.shift()!;
    
    for (const nextState of STATE_TRANSITIONS[state]) {
      if (nextState === to) return [...path, nextState];
      
      if (!visited.has(nextState)) {
        visited.add(nextState);
        queue.push({ state: nextState, path: [...path, nextState] });
      }
    }
  }
  
  return null;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const agentStateMachine = new AgentStateMachine();
export default agentStateMachine;
