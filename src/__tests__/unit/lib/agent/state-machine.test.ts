/**
 * Agent State Machine Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AgentStateMachine,
  agentStateMachine,
  StateTransitionError,
  InvalidStateError,
  AGENT_STATES,
  STATE_TRANSITIONS,
  STATE_METADATA,
  getPredecessorStates,
  requiresParentApproval,
  getTransitionPath,
  AgentState
} from '@/lib/agent/state-machine';

describe('AgentStateMachine', () => {
  let stateMachine: AgentStateMachine;

  beforeEach(() => {
    stateMachine = new AgentStateMachine();
  });

  describe('State Definitions', () => {
    it('should have all required states', () => {
      const expectedStates: AgentState[] = [
        'initializing',
        'idle',
        'active',
        'paused',
        'blocked',
        'error',
        'escaped',
        'terminated'
      ];
      
      expect(AGENT_STATES).toEqual(expectedStates);
    });

    it('should have metadata for all states', () => {
      for (const state of AGENT_STATES) {
        expect(STATE_METADATA[state]).toBeDefined();
        expect(STATE_METADATA[state].description).toBeTruthy();
        expect(typeof STATE_METADATA[state].isTerminal).toBe('boolean');
        expect(typeof STATE_METADATA[state].isActive).toBe('boolean');
        expect(typeof STATE_METADATA[state].allowsProcessing).toBe('boolean');
        expect(STATE_METADATA[state].color).toMatch(/^#/);
      }
    });
  });

  describe('canTransition', () => {
    it('should allow same state transitions (no-op)', () => {
      for (const state of AGENT_STATES) {
        expect(stateMachine.canTransition(state, state)).toBe(true);
      }
    });

    it('should allow valid transitions from initializing', () => {
      expect(stateMachine.canTransition('initializing', 'idle')).toBe(true);
      expect(stateMachine.canTransition('initializing', 'error')).toBe(true);
      expect(stateMachine.canTransition('initializing', 'terminated')).toBe(true);
    });

    it('should not allow invalid transitions from initializing', () => {
      expect(stateMachine.canTransition('initializing', 'active')).toBe(false);
      expect(stateMachine.canTransition('initializing', 'paused')).toBe(false);
      expect(stateMachine.canTransition('initializing', 'blocked')).toBe(false);
    });

    it('should allow valid transitions from idle', () => {
      expect(stateMachine.canTransition('idle', 'active')).toBe(true);
      expect(stateMachine.canTransition('idle', 'paused')).toBe(true);
      expect(stateMachine.canTransition('idle', 'terminated')).toBe(true);
    });

    it('should allow valid transitions from active', () => {
      expect(stateMachine.canTransition('active', 'idle')).toBe(true);
      expect(stateMachine.canTransition('active', 'paused')).toBe(true);
      expect(stateMachine.canTransition('active', 'blocked')).toBe(true);
      expect(stateMachine.canTransition('active', 'error')).toBe(true);
      expect(stateMachine.canTransition('active', 'terminated')).toBe(true);
    });

    it('should not allow transitions from terminated state', () => {
      for (const state of AGENT_STATES) {
        if (state !== 'terminated') {
          expect(stateMachine.canTransition('terminated', state)).toBe(false);
        }
      }
    });

    it('should allow recovery from error to idle', () => {
      expect(stateMachine.canTransition('error', 'idle')).toBe(true);
      expect(stateMachine.canTransition('error', 'terminated')).toBe(true);
    });

    it('should allow escape and return', () => {
      expect(stateMachine.canTransition('blocked', 'escaped')).toBe(true);
      expect(stateMachine.canTransition('escaped', 'active')).toBe(true);
      expect(stateMachine.canTransition('escaped', 'terminated')).toBe(true);
    });
  });

  describe('getValidTransitions', () => {
    it('should return all valid next states', () => {
      const idleTransitions = stateMachine.getValidTransitions('idle');
      expect(idleTransitions).toContain('active');
      expect(idleTransitions).toContain('paused');
      expect(idleTransitions).toContain('terminated');
      expect(idleTransitions).not.toContain('idle');
    });

    it('should return empty array for terminal state', () => {
      expect(stateMachine.getValidTransitions('terminated')).toEqual([]);
    });
  });

  describe('validateTransition', () => {
    it('should return valid for allowed transitions', () => {
      const result = stateMachine.validateTransition('idle', 'active');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for disallowed transitions', () => {
      const result = stateMachine.validateTransition('terminated', 'idle');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('terminal state');
    });

    it('should list valid transitions in error message', () => {
      const result = stateMachine.validateTransition('initializing', 'active');
      expect(result.error).toContain('idle');
      expect(result.error).toContain('error');
    });
  });

  describe('transition', () => {
    it('should execute valid transition', async () => {
      const handler = vi.fn();
      stateMachine.onStateChange(handler);

      const event = {
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        previousState: 'idle' as AgentState,
        newState: 'active' as AgentState,
        triggeredBy: 'user-1',
        timestamp: new Date()
      };

      await stateMachine.transition(event);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should throw StateTransitionError for invalid transition', async () => {
      const event = {
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        previousState: 'terminated' as AgentState,
        newState: 'idle' as AgentState,
        triggeredBy: 'user-1',
        timestamp: new Date()
      };

      await expect(stateMachine.transition(event)).rejects.toThrow(StateTransitionError);
    });

    it('should call entry handlers for new state', async () => {
      const entryHandler = vi.fn();
      stateMachine.onEnterState('active', entryHandler);

      const event = {
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        previousState: 'idle' as AgentState,
        newState: 'active' as AgentState,
        triggeredBy: 'user-1',
        timestamp: new Date()
      };

      await stateMachine.transition(event);
      expect(entryHandler).toHaveBeenCalledWith(event);
    });

    it('should call exit handlers for previous state', async () => {
      const exitHandler = vi.fn();
      stateMachine.onExitState('idle', exitHandler);

      const event = {
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        previousState: 'idle' as AgentState,
        newState: 'active' as AgentState,
        triggeredBy: 'user-1',
        timestamp: new Date()
      };

      await stateMachine.transition(event);
      expect(exitHandler).toHaveBeenCalledWith(event);
    });
  });

  describe('event handlers', () => {
    it('should support unsubscribing from state changes', () => {
      const handler = vi.fn();
      const unsubscribe = stateMachine.onStateChange(handler);
      
      unsubscribe();
      
      // After unsubscribe, handler should not be called
      const handlers = (stateMachine as any).handlers.get('global');
      expect(handlers).not.toContain(handler);
    });

    it('should support multiple handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      stateMachine.onStateChange(handler1);
      stateMachine.onStateChange(handler2);

      const event = {
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        previousState: 'idle' as AgentState,
        newState: 'active' as AgentState,
        triggeredBy: 'user-1',
        timestamp: new Date()
      };

      await stateMachine.transition(event);
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('state metadata', () => {
    it('should identify terminal states correctly', () => {
      expect(stateMachine.isTerminalState('terminated')).toBe(true);
      expect(stateMachine.isTerminalState('idle')).toBe(false);
      expect(stateMachine.isTerminalState('active')).toBe(false);
    });

    it('should identify processing states correctly', () => {
      expect(stateMachine.isProcessingState('idle')).toBe(true);
      expect(stateMachine.isProcessingState('active')).toBe(true);
      expect(stateMachine.isProcessingState('paused')).toBe(false);
      expect(stateMachine.isProcessingState('terminated')).toBe(false);
    });

    it('should return metadata for each state', () => {
      for (const state of AGENT_STATES) {
        const metadata = stateMachine.getStateMetadata(state);
        expect(metadata).toBeDefined();
        expect(metadata.description).toBeTruthy();
      }
    });

    it('should return recommended actions', () => {
      expect(stateMachine.getRecommendedAction('idle')).toContain('Assign');
      expect(stateMachine.getRecommendedAction('active')).toContain('monitor');
      expect(stateMachine.getRecommendedAction('error')).toContain('Review');
      expect(stateMachine.getRecommendedAction('terminated')).toContain('archived');
    });
  });
});

describe('Helper Functions', () => {
  describe('getPredecessorStates', () => {
    it('should return states that can transition to given state', () => {
      const predecessors = getPredecessorStates('idle');
      expect(predecessors).toContain('initializing');
      expect(predecessors).toContain('active');
      expect(predecessors).toContain('paused');
    });

    it('should return empty array for initializing', () => {
      const predecessors = getPredecessorStates('initializing');
      expect(predecessors).toEqual([]);
    });
  });

  describe('requiresParentApproval', () => {
    it('should require approval for terminating active agents', () => {
      expect(requiresParentApproval('active', 'terminated')).toBe(true);
    });

    it('should require approval for terminating paused agents', () => {
      expect(requiresParentApproval('paused', 'terminated')).toBe(true);
    });

    it('should not require approval for normal transitions', () => {
      expect(requiresParentApproval('idle', 'active')).toBe(false);
      expect(requiresParentApproval('active', 'idle')).toBe(false);
    });
  });

  describe('getTransitionPath', () => {
    it('should return direct path for valid single transition', () => {
      const path = getTransitionPath('idle', 'active');
      expect(path).toEqual(['idle', 'active']);
    });

    it('should return single state for same state', () => {
      const path = getTransitionPath('idle', 'idle');
      expect(path).toEqual(['idle']);
    });

    it('should return null for impossible transitions', () => {
      const path = getTransitionPath('terminated', 'idle');
      expect(path).toBeNull();
    });

    it('should find path through intermediate states', () => {
      // initializing -> idle -> active
      const path = getTransitionPath('initializing', 'active');
      expect(path).toEqual(['initializing', 'idle', 'active']);
    });
  });
});

describe('Singleton Instance', () => {
  it('should export singleton instance', () => {
    expect(agentStateMachine).toBeInstanceOf(AgentStateMachine);
  });

  it('singleton should work correctly', () => {
    expect(agentStateMachine.canTransition('idle', 'active')).toBe(true);
    expect(agentStateMachine.isTerminalState('terminated')).toBe(true);
  });
});
