/**
 * Agent Lifecycle Manager
 * 
 * Manages agent initialization, execution, pausing, resuming, and termination.
 * Based on AGENT-PROTOCOL.md specification.
 */

import { Agent, AgentStatus, Task, Activity } from '@/types';
import { Database } from '@/lib/database';
import { agentStateMachine, StateChangeEvent, StateTransitionError } from './state-machine';
import { AgentSpawner, SpawnOptions } from './spawner';

// ============================================================================
// Types
// ============================================================================

export interface LifecycleOptions {
  agentId: string;
  tenantId: string;
  triggeredBy: string;
}

export interface InitializeResult {
  success: boolean;
  agent?: Agent;
  error?: LifecycleError;
}

export interface StartResult {
  success: boolean;
  taskId?: string;
  error?: LifecycleError;
}

export interface PauseResult {
  success: boolean;
  previousStatus?: AgentStatus;
  error?: LifecycleError;
}

export interface ResumeResult {
  success: boolean;
  restoredStatus?: AgentStatus;
  error?: LifecycleError;
}

export interface TerminateResult {
  success: boolean;
  archived?: boolean;
  error?: LifecycleError;
}

export interface RecoveryResult {
  success: boolean;
  recoveredFrom?: AgentStatus;
  newStatus: AgentStatus;
  error?: LifecycleError;
}

export interface LifecycleError {
  code: LifecycleErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type LifecycleErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'INVALID_STATE'
  | 'TRANSITION_FAILED'
  | 'TASK_IN_PROGRESS'
  | 'CHILDREN_ACTIVE'
  | 'UNAUTHORIZED'
  | 'DATABASE_ERROR'
  | 'RECOVERY_FAILED'
  | 'UNKNOWN_ERROR';

export interface AgentContext {
  agent: Agent;
  tasks: Task[];
  activities: Activity[];
  decisions: unknown[];
  childAgents: Agent[];
}

export interface RecoveryStrategy {
  name: string;
  condition: (agent: Agent, error: Error) => boolean;
  action: (agent: Agent, error: Error) => Promise<AgentStatus>;
}

// ============================================================================
// Constants
// ============================================================================

export const RECOVERY_STRATEGIES: RecoveryStrategy[] = [
  {
    name: 'transient_error_recovery',
    condition: (agent, error) => {
      // Retry on transient errors
      const transientErrors = ['timeout', 'rate_limit', 'network'];
      return transientErrors.some(e => error.message.toLowerCase().includes(e));
    },
    action: async (agent) => 'active'
  },
  {
    name: 'escalation_recovery',
    condition: (agent, error) => {
      return error.message.toLowerCase().includes('escalation');
    },
    action: async (agent) => 'blocked'
  },
  {
    name: 'default_recovery',
    condition: () => true,
    action: async (agent) => 'error'
  }
];

// ============================================================================
// Lifecycle Manager Class
// ============================================================================

export class AgentLifecycleManager {
  private spawner: AgentSpawner;
  
  constructor(
    private db: Database,
    spawner?: AgentSpawner
  ) {
    this.spawner = spawner || new AgentSpawner(db);
  }
  
  // ============================================================================
  // Initialization
  // ============================================================================
  
  /**
   * Initialize a newly spawned agent
   * Loads configuration, sets up context, transitions to idle
   */
  async initialize(options: LifecycleOptions): Promise<InitializeResult> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      // Only initialize from 'initializing' state
      if (agent.status !== 'initializing') {
        return {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: `Cannot initialize agent in '${agent.status}' state. Expected 'initializing'`,
            retryable: false
          }
        };
      }
      
      // Load configuration
      await this.loadConfiguration(agent);
      
      // Set up initial context
      await this.setupContext(agent);
      
      // Transition to idle
      await this.transitionState(agent, 'idle', options.triggeredBy, 'Initialization complete');
      
      // Update agent record
      const updatedAgent = await this.getAgent(options.tenantId, options.agentId);
      
      return {
        success: true,
        agent: updatedAgent!
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during initialization',
          retryable: false,
          details: { error }
        }
      };
    }
  }
  
  // ============================================================================
  // Start
  // ============================================================================
  
  /**
   * Start agent processing
   * Transitions from idle to active
   */
  async start(
    options: LifecycleOptions,
    taskId?: string
  ): Promise<StartResult> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      // Can start from idle or paused
      if (!['idle', 'paused'].includes(agent.status)) {
        return {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: `Cannot start agent in '${agent.status}' state`,
            retryable: false
          }
        };
      }
      
      // Transition to active
      await this.transitionState(
        agent,
        'active',
        options.triggeredBy,
        taskId ? `Starting task: ${taskId}` : 'Agent activated'
      );
      
      // Update current task if provided
      if (taskId) {
        await this.updateCurrentTask(options.tenantId, options.agentId, taskId);
      }
      
      return {
        success: true,
        taskId
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during start',
          retryable: false,
          details: { error }
        }
      };
    }
  }
  
  // ============================================================================
  // Pause
  // ============================================================================
  
  /**
   * Pause agent processing
   * Suspends current work, transitions to paused
   */
  async pause(options: LifecycleOptions): Promise<PauseResult> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      const previousStatus = agent.status;
      
      // Can pause from active or idle
      if (!['active', 'idle'].includes(agent.status)) {
        return {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: `Cannot pause agent in '${agent.status}' state`,
            retryable: false
          }
        };
      }
      
      // Store previous status for resume
      await this.storePausedState(options.tenantId, options.agentId, previousStatus);
      
      // Transition to paused
      await this.transitionState(agent, 'paused', options.triggeredBy, 'Agent paused by parent');
      
      // Suspend any current task
      if (agent.current_task_id) {
        await this.suspendTask(options.tenantId, agent.current_task_id);
      }
      
      return {
        success: true,
        previousStatus
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during pause',
          retryable: false,
          details: { error }
        }
      };
    }
  }
  
  // ============================================================================
  // Resume
  // ============================================================================
  
  /**
   * Resume agent processing
   * Restores previous state, continues work
   */
  async resume(options: LifecycleOptions): Promise<ResumeResult> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      // Can only resume from paused
      if (agent.status !== 'paused') {
        return {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: `Cannot resume agent in '${agent.status}' state. Expected 'paused'`,
            retryable: false
          }
        };
      }
      
      // Get restored status
      const restoredStatus = await this.getPausedState(options.tenantId, options.agentId) || 'idle';
      
      // Transition to restored state
      await this.transitionState(agent, restoredStatus, options.triggeredBy, 'Agent resumed');
      
      // Resume suspended task if any
      const pausedState = await this.getPausedStateDetails(options.tenantId, options.agentId);
      if (pausedState?.taskId) {
        await this.resumeTask(options.tenantId, pausedState.taskId);
      }
      
      // Clear paused state
      await this.clearPausedState(options.tenantId, options.agentId);
      
      return {
        success: true,
        restoredStatus
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during resume',
          retryable: false,
          details: { error }
        }
      };
    }
  }
  
  // ============================================================================
  // Terminate
  // ============================================================================
  
  /**
   * Terminate an agent
   * Cleans up resources, archives state
   */
  async terminate(
    options: LifecycleOptions,
    force: boolean = false
  ): Promise<TerminateResult> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      // Cannot terminate from terminal state
      if (agent.status === 'terminated') {
        return {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'Agent is already terminated',
            retryable: false
          }
        };
      }
      
      // Check for active children
      if (!force) {
        const children = await this.spawner.getChildren(options.tenantId, options.agentId);
        const activeChildren = children.filter(c => c.status !== 'terminated');
        
        if (activeChildren.length > 0) {
          return {
            success: false,
            error: {
              code: 'CHILDREN_ACTIVE',
              message: `Agent has ${activeChildren.length} active children. Use force=true to terminate anyway.`,
              retryable: true,
              details: { activeChildren: activeChildren.map(c => c.id) }
            }
          };
        }
      }
      
      // Terminate children first if force is true
      if (force) {
        await this.terminateChildren(options);
      }
      
      // Cancel any active task
      if (agent.current_task_id) {
        await this.cancelTask(options.tenantId, agent.current_task_id, options.triggeredBy);
      }
      
      // Transition to terminated
      await this.transitionState(agent, 'terminated', options.triggeredBy, 'Agent terminated');
      
      // Archive agent data
      const archived = await this.archiveAgent(options.tenantId, options.agentId);
      
      return {
        success: true,
        archived
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during termination',
          retryable: false,
          details: { error }
        }
      };
    }
  }
  
  // ============================================================================
  // Error Recovery
  // ============================================================================
  
  /**
   * Handle agent error and attempt recovery
   */
  async handleError(
    options: LifecycleOptions,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          newStatus: 'error',
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      const previousStatus = agent.status;
      
      // Log the error
      await this.logError(options.tenantId, options.agentId, error, context);
      
      // Find recovery strategy
      const strategy = RECOVERY_STRATEGIES.find(s => s.condition(agent, error));
      
      if (!strategy) {
        // No strategy found, enter error state
        await this.transitionState(agent, 'error', options.triggeredBy, error.message);
        return {
          success: false,
          recoveredFrom: previousStatus,
          newStatus: 'error',
          error: {
            code: 'RECOVERY_FAILED',
            message: 'No recovery strategy found for this error',
            retryable: false
          }
        };
      }
      
      // Execute recovery
      const newStatus = await strategy.action(agent, error);
      
      // Transition to recovered state
      await this.transitionState(
        agent,
        newStatus,
        options.triggeredBy,
        `Recovered using strategy: ${strategy.name}`
      );
      
      return {
        success: newStatus !== 'error',
        recoveredFrom: previousStatus,
        newStatus
      };
      
    } catch (recoveryError) {
      return {
        success: false,
        newStatus: 'error',
        error: {
          code: 'RECOVERY_FAILED',
          message: recoveryError instanceof Error ? recoveryError.message : 'Recovery failed',
          retryable: false,
          details: { originalError: error.message, recoveryError }
        }
      };
    }
  }
  
  /**
   * Force agent into error state
   */
  async setError(
    options: LifecycleOptions,
    errorMessage: string,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult> {
    const error = new Error(errorMessage);
    return this.handleError(options, error, context);
  }
  
  // ============================================================================
  // Block / Escalation
  // ============================================================================
  
  /**
   * Block agent (waiting for escalation)
   */
  async block(
    options: LifecycleOptions,
    escalationId: string,
    reason: string
  ): Promise<{ success: boolean; error?: LifecycleError }> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      await this.transitionState(agent, 'blocked', options.triggeredBy, reason);
      
      // Store escalation reference
      await this.db
        .from('agents')
        .update({
          configuration: {
            ...agent.configuration,
            blockedByEscalation: escalationId
          }
        })
        .eq('id', options.agentId)
        .eq('tenant_id', options.tenantId);
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during block',
          retryable: false
        }
      };
    }
  }
  
  /**
   * Unblock agent (escalation resolved)
   */
  async unblock(options: LifecycleOptions): Promise<ResumeResult> {
    try {
      const agent = await this.getAgent(options.tenantId, options.agentId);
      
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${options.agentId}' not found`,
            retryable: false
          }
        };
      }
      
      if (agent.status !== 'blocked') {
        return {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: `Cannot unblock agent in '${agent.status}' state`,
            retryable: false
          }
        };
      }
      
      // Clear escalation reference
      const config = { ...agent.configuration };
      delete config.blockedByEscalation;
      
      await this.db
        .from('agents')
        .update({ configuration: config })
        .eq('id', options.agentId)
        .eq('tenant_id', options.tenantId);
      
      // Return to active
      await this.transitionState(agent, 'active', options.triggeredBy, 'Escalation resolved');
      
      return {
        success: true,
        restoredStatus: 'active'
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error during unblock',
          retryable: false
        }
      };
    }
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private async getAgent(tenantId: string, agentId: string): Promise<Agent | null> {
    const { data, error } = await this.db
      .from('agents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', agentId)
      .single();
    
    if (error || !data) return null;
    return data as Agent;
  }
  
  private async loadConfiguration(agent: Agent): Promise<void> {
    // Load agent configuration from agent_configs table
    const { data, error } = await this.db
      .from('agent_configs')
      .select('*')
      .eq('tenant_id', agent.tenant_id)
      .eq('agent_id', agent.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      // No config found, that's okay - agent will use defaults
      return;
    }
    
    // Merge config into agent
    agent.configuration = {
      ...agent.configuration,
      ...data.config
    };
  }
  
  private async setupContext(agent: Agent): Promise<void> {
    // Set up initial context
    // This could load recent activities, pending tasks, etc.
    const { data: recentActivities } = await this.db
      .from('activities')
      .select('*')
      .eq('tenant_id', agent.tenant_id)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    agent.metadata = {
      ...agent.metadata,
      initializationComplete: true,
      recentActivities: recentActivities || []
    };
  }
  
  private async transitionState(
    agent: Agent,
    newStatus: AgentStatus,
    triggeredBy: string,
    reason?: string
  ): Promise<void> {
    const event: StateChangeEvent = {
      agentId: agent.id,
      tenantId: agent.tenant_id,
      previousState: agent.status,
      newState: newStatus,
      reason,
      triggeredBy,
      timestamp: new Date()
    };
    
    // Validate transition
    const validation = agentStateMachine.validateTransition(agent.status, newStatus);
    if (!validation.valid) {
      throw new StateTransitionError(
        validation.error!,
        agent.status,
        newStatus
      );
    }
    
    // Execute transition
    await agentStateMachine.transition(event);
    
    // Update database
    const { error } = await this.db
      .from('agents')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        activated_at: newStatus === 'active' ? new Date().toISOString() : agent.metadata?.activated_at
      })
      .eq('id', agent.id)
      .eq('tenant_id', agent.tenant_id);
    
    if (error) throw error;
    
    // Log status change activity
    await this.db.from('activities').insert({
      tenant_id: agent.tenant_id,
      agent_id: agent.id,
      type: 'agent.status_changed',
      title: `Status changed: ${agent.status} → ${newStatus}`,
      description: reason || 'State transition',
      metadata: {
        previous_status: agent.status,
        new_status: newStatus,
        triggered_by: triggeredBy
      },
      actor_id: triggeredBy,
      actor_type: 'system',
      target_id: agent.id,
      target_type: 'agent'
    });
  }
  
  private async updateCurrentTask(
    tenantId: string,
    agentId: string,
    taskId: string
  ): Promise<void> {
    await this.db
      .from('agents')
      .update({ current_task_id: taskId })
      .eq('id', agentId)
      .eq('tenant_id', tenantId);
  }
  
  private async storePausedState(
    tenantId: string,
    agentId: string,
    status: AgentStatus
  ): Promise<void> {
    await this.db
      .from('agent_sessions')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        status: 'paused',
        previous_status: status,
        started_at: new Date().toISOString()
      });
  }
  
  private async getPausedState(
    tenantId: string,
    agentId: string
  ): Promise<AgentStatus | null> {
    const { data, error } = await this.db
      .from('agent_sessions')
      .select('previous_status')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .eq('status', 'paused')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return data.previous_status as AgentStatus;
  }
  
  private async getPausedStateDetails(
    tenantId: string,
    agentId: string
  ): Promise<{ status: AgentStatus; taskId?: string } | null> {
    const { data, error } = await this.db
      .from('agent_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .eq('status', 'paused')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return {
      status: data.previous_status as AgentStatus,
      taskId: data.metadata?.task_id
    };
  }
  
  private async clearPausedState(tenantId: string, agentId: string): Promise<void> {
    await this.db
      .from('agent_sessions')
      .update({ status: 'resumed', ended_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .eq('status', 'paused');
  }
  
  private async suspendTask(tenantId: string, taskId: string): Promise<void> {
    await this.db
      .from('tasks')
      .update({
        status: 'blocked',
        metadata: {
          suspended_at: new Date().toISOString()
        }
      })
      .eq('id', taskId)
      .eq('tenant_id', tenantId);
  }
  
  private async resumeTask(tenantId: string, taskId: string): Promise<void> {
    await this.db
      .from('tasks')
      .update({
        status: 'in_progress',
        metadata: {
          resumed_at: new Date().toISOString()
        }
      })
      .eq('id', taskId)
      .eq('tenant_id', tenantId);
  }
  
  private async cancelTask(
    tenantId: string,
    taskId: string,
    triggeredBy: string
  ): Promise<void> {
    await this.db
      .from('tasks')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        metadata: {
          cancelled_by: triggeredBy,
          cancelled_at: new Date().toISOString()
        }
      })
      .eq('id', taskId)
      .eq('tenant_id', tenantId);
  }
  
  private async terminateChildren(options: LifecycleOptions): Promise<void> {
    const children = await this.spawner.getChildren(options.tenantId, options.agentId);
    
    for (const child of children) {
      if (child.status !== 'terminated') {
        await this.terminate({
          tenantId: options.tenantId,
          agentId: child.id,
          triggeredBy: options.triggeredBy
        }, true); // Force terminate
      }
    }
  }
  
  private async archiveAgent(tenantId: string, agentId: string): Promise<boolean> {
    // Create archive record
    const { error } = await this.db
      .from('agent_archives')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        archived_at: new Date().toISOString()
      });
    
    return !error;
  }
  
  private async logError(
    tenantId: string,
    agentId: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.db.from('activities').insert({
      tenant_id: tenantId,
      agent_id: agentId,
      type: 'system.error',
      title: `Agent error: ${error.name}`,
      description: error.message,
      metadata: {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack,
        context
      },
      actor_type: 'system',
      target_id: agentId,
      target_type: 'agent'
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLifecycleManager(
  db: Database,
  spawner?: AgentSpawner
): AgentLifecycleManager {
  return new AgentLifecycleManager(db, spawner);
}

export default AgentLifecycleManager;
