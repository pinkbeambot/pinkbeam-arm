/**
 * Task Executor
 * 
 * Handles task execution with LLM integration for agent reasoning
 */

import {
  createAdminClient,
  createLogger,
  nowISO,
  logActivity,
  updateAgentStatus,
  ANTHROPIC_API_KEY,
  RuntimeResponse,
} from '../_shared/utils.ts';
import {
  AgentReasoning,
  ExecutionResult,
  TaskContext,
} from './schemas.ts';
import { CostTracker } from './cost-tracker.ts';
import { EscalationManager } from './escalation.ts';

const logger = createLogger('task-executor');

interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  inputs: Record<string, unknown>;
  expected_outputs: Record<string, unknown>;
  assignee_id: string | null;
}

interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  role: string;
  capabilities: string[];
  llm_config: {
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  limits: {
    escalation_threshold?: number;
    max_tokens_per_task?: number;
    max_cost_per_task_usd?: number;
    timeout_seconds?: number;
  };
  status: string;
}

export class TaskExecutor {
  private supabase: ReturnType<typeof createAdminClient>;
  private costTracker: CostTracker;
  private escalationManager: EscalationManager;

  constructor(
    supabase: ReturnType<typeof createAdminClient>,
    costTracker: CostTracker,
    escalationManager: EscalationManager
  ) {
    this.supabase = supabase;
    this.costTracker = costTracker;
    this.escalationManager = escalationManager;
  }

  /**
   * Start a task (transition from queued to in_progress)
   */
  async startTask(
    agentId: string,
    taskId: string,
    tenantId: string
  ): Promise<RuntimeResponse<{ task_id: string; status: string; started_at: string }>> {
    try {
      const now = nowISO();

      // Verify task exists and is assigned to agent
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .single();

      if (taskError || !task) {
        return {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found', retryable: false },
        };
      }

      if (task.assignee_id !== agentId) {
        return {
          success: false,
          error: { code: 'NOT_ASSIGNED', message: 'Task not assigned to this agent', retryable: false },
        };
      }

      if (task.status !== 'queued') {
        return {
          success: false,
          error: { code: 'INVALID_STATE', message: `Task is ${task.status}, not queued`, retryable: false },
        };
      }

      // Update task status
      const { error: updateError } = await this.supabase
        .from('tasks')
        .update({
          status: 'in_progress',
          started_at: now,
          updated_at: now,
          progress_percent: 0,
        })
        .eq('id', taskId);

      if (updateError) {
        return {
          success: false,
          error: { code: 'UPDATE_FAILED', message: updateError.message, retryable: true },
        };
      }

      // Update agent status
      await updateAgentStatus(this.supabase, agentId, 'active');
      await this.supabase
        .from('agents')
        .update({ current_task_id: taskId })
        .eq('id', agentId);

      // Log activity
      await logActivity(
        this.supabase,
        tenantId,
        'task.started',
        'task',
        'agent',
        agentId,
        `Task "${task.title}" started`,
        'Task execution begun',
        { task_id: taskId, agent_id: agentId },
        agentId,
        taskId
      );

      return {
        success: true,
        data: {
          task_id: taskId,
          status: 'in_progress',
          started_at: now,
        },
      };
    } catch (error) {
      logger.error('Start task failed', error, { agentId, taskId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Execute a task step with LLM reasoning
   */
  async executeTask(
    agentId: string,
    taskId: string,
    tenantId: string,
    context?: TaskContext
  ): Promise<RuntimeResponse<{ reasoning: AgentReasoning; cost_usd: number }>> {
    try {
      // Get task and agent info
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .single();

      if (taskError || !task) {
        return {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found', retryable: false },
        };
      }

      const { data: agent, error: agentError } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('tenant_id', tenantId)
        .single();

      if (agentError || !agent) {
        return {
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found', retryable: false },
        };
      }

      // Build LLM prompt for task execution
      const prompt = this.buildExecutionPrompt(task, agent, context);

      // Call LLM
      const llmResult = await this.callLLM(agent, prompt);

      if (!llmResult.success) {
        return {
          success: false,
          error: llmResult.error || { code: 'LLM_ERROR', message: 'LLM call failed', retryable: true },
        };
      }

      // Parse reasoning
      let reasoning: AgentReasoning;
      try {
        const parsed = JSON.parse(llmResult.data?.content || '{}');
        reasoning = {
          thought: parsed.thought || 'No thought provided',
          action: parsed.action || 'continue',
          action_params: parsed.action_params || {},
          progress_percent: Math.min(100, Math.max(0, parsed.progress_percent || 0)),
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        };
      } catch {
        reasoning = {
          thought: llmResult.data?.content || 'Failed to parse reasoning',
          action: 'continue',
          progress_percent: context?.progress_percent || 0,
          confidence: 0.5,
        };
      }

      // Check if escalation is needed based on confidence threshold
      const escalationThreshold = agent.limits?.escalation_threshold || 0.5;
      if (reasoning.confidence < escalationThreshold && reasoning.action !== 'escalate') {
        reasoning.action = 'escalate';
        reasoning.action_params = {
          reason: 'Low confidence in action',
          confidence: reasoning.confidence,
          threshold: escalationThreshold,
        };
      }

      // Record cost
      const costId = await this.costTracker.recordCost({
        tenant_id: tenantId,
        agent_id: agentId,
        task_id: taskId,
        model: agent.llm_config?.model || 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        input_tokens: llmResult.data?.input_tokens || 0,
        output_tokens: llmResult.data?.output_tokens || 0,
        request_type: 'task_execution',
      });

      return {
        success: true,
        data: {
          reasoning,
          cost_usd: llmResult.data?.cost_usd || 0,
        },
      };
    } catch (error) {
      logger.error('Execute task failed', error, { agentId, taskId });
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Update task progress
   */
  async updateProgress(
    agentId: string,
    taskId: string,
    tenantId: string,
    progressPercent?: number,
    currentStep?: string
  ): Promise<RuntimeResponse<{ task_id: string; progress_percent: number }>> {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .update({
          progress_percent: progressPercent ?? 0,
          current_step: currentStep,
          updated_at: nowISO(),
        })
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .eq('assignee_id', agentId);

      if (error) {
        return {
          success: false,
          error: { code: 'UPDATE_FAILED', message: error.message, retryable: true },
        };
      }

      return {
        success: true,
        data: { task_id: taskId, progress_percent: progressPercent ?? 0 },
      };
    } catch (error) {
      logger.error('Update progress failed', error, { agentId, taskId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Complete a task
   */
  async completeTask(
    agentId: string,
    taskId: string,
    tenantId: string,
    outputs?: Record<string, unknown>,
    costUsd?: number,
    tokensUsed?: number
  ): Promise<RuntimeResponse<ExecutionResult>> {
    try {
      const now = nowISO();

      // Get task info for the result
      const { data: task } = await this.supabase
        .from('tasks')
        .select('started_at, title')
        .eq('id', taskId)
        .single();

      // Update task
      const { error } = await this.supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: now,
          progress_percent: 100,
          outputs: outputs || {},
          cost_usd: costUsd || 0,
          tokens_used: tokensUsed || 0,
          updated_at: now,
        })
        .eq('id', taskId)
        .eq('tenant_id', tenantId);

      if (error) {
        return {
          success: false,
          error: { code: 'UPDATE_FAILED', message: error.message, retryable: true },
        };
      }

      // Update agent status
      await updateAgentStatus(this.supabase, agentId, 'idle');
      await this.supabase
        .from('agents')
        .update({ current_task_id: null })
        .eq('id', agentId);

      // Log completion
      await logActivity(
        this.supabase,
        tenantId,
        'task.completed',
        'task',
        'agent',
        agentId,
        `Task "${task?.title || taskId}" completed`,
        'Task execution completed successfully',
        { task_id: taskId, agent_id: agentId, cost_usd: costUsd },
        agentId,
        taskId
      );

      const result: ExecutionResult = {
        task_id: taskId,
        agent_id: agentId,
        status: 'completed',
        outputs: outputs || {},
        cost_usd: costUsd || 0,
        tokens_used: tokensUsed || 0,
        started_at: task?.started_at || now,
        completed_at: now,
        execution_steps: 0, // Will be tracked in future
        escalations_created: 0,
      };

      return { success: true, data: result };
    } catch (error) {
      logger.error('Complete task failed', error, { agentId, taskId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Fail a task
   */
  async failTask(
    agentId: string,
    taskId: string,
    tenantId: string,
    errorMessage: string,
    shouldEscalate?: boolean
  ): Promise<RuntimeResponse<ExecutionResult>> {
    try {
      const now = nowISO();

      // Get task info
      const { data: task } = await this.supabase
        .from('tasks')
        .select('started_at, title, description')
        .eq('id', taskId)
        .single();

      // Update task
      const { error } = await this.supabase
        .from('tasks')
        .update({
          status: 'failed',
          completed_at: now,
          current_step: errorMessage,
          updated_at: now,
        })
        .eq('id', taskId)
        .eq('tenant_id', tenantId);

      if (error) {
        return {
          success: false,
          error: { code: 'UPDATE_FAILED', message: error.message, retryable: true },
        };
      }

      // Update agent status
      await updateAgentStatus(this.supabase, agentId, 'error', errorMessage);
      await this.supabase
        .from('agents')
        .update({ current_task_id: null })
        .eq('id', agentId);

      // Create escalation if requested
      let escalationId: string | undefined;
      if (shouldEscalate) {
        const escalationResult = await this.escalationManager.createEscalation({
          tenant_id: tenantId,
          agent_id: agentId,
          task_id: taskId,
          type: 'error',
          urgency: 'high',
          title: `Task Failed: ${task?.title || taskId}`,
          description: errorMessage,
          situation_context: {
            current_task_id: taskId,
            relevant_history: [],
          },
          question: {
            title: 'Task Execution Failed',
            details: `The agent encountered an error while executing this task: ${errorMessage}`,
          },
          agent_analysis: {
            what_i_know: 'Task execution failed',
            what_i_dont_know: 'How to resolve this error',
            what_i_tried: ['Attempted task execution'],
          },
        });

        if (escalationResult.success) {
          escalationId = escalationResult.data?.escalation_id;
        }
      }

      // Log failure
      await logActivity(
        this.supabase,
        tenantId,
        'task.failed',
        'task',
        'agent',
        agentId,
        `Task "${task?.title || taskId}" failed`,
        errorMessage,
        { task_id: taskId, agent_id: agentId, escalation_id: escalationId },
        agentId,
        taskId
      );

      const result: ExecutionResult = {
        task_id: taskId,
        agent_id: agentId,
        status: 'failed',
        outputs: { error: errorMessage },
        cost_usd: 0,
        tokens_used: 0,
        started_at: task?.started_at || now,
        completed_at: now,
        execution_steps: 0,
        escalations_created: escalationId ? 1 : 0,
      };

      return { success: true, data: result };
    } catch (error) {
      logger.error('Fail task failed', error, { agentId, taskId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Execute a task autonomously (full loop)
   */
  async executeAutonomous(
    agentId: string,
    taskId: string,
    tenantId: string
  ): Promise<RuntimeResponse<ExecutionResult>> {
    const maxSteps = 10;
    let steps = 0;
    let totalCost = 0;
    let totalTokens = 0;
    let escalationsCreated = 0;
    const outputs: Record<string, unknown> = {};

    try {
      // Start the task
      const startResult = await this.startTask(agentId, taskId, tenantId);
      if (!startResult.success) {
        return startResult;
      }

      // Execution loop
      while (steps < maxSteps) {
        steps++;

        // Execute step with LLM
        const executeResult = await this.executeTask(agentId, taskId, tenantId, {
          progress_percent: Math.floor((steps / maxSteps) * 100),
        });

        if (!executeResult.success) {
          return await this.failTask(
            agentId,
            taskId,
            tenantId,
            executeResult.error?.message || 'Execution step failed',
            true
          );
        }

        totalCost += executeResult.data?.cost_usd || 0;
        totalTokens += 0; // Will be accumulated from cost tracker

        const reasoning = executeResult.data?.reasoning;

        // Handle action
        switch (reasoning.action) {
          case 'complete':
            Object.assign(outputs, reasoning.action_params?.outputs || {});
            return await this.completeTask(
              agentId,
              taskId,
              tenantId,
              outputs,
              totalCost,
              totalTokens
            );

          case 'escalate':
            escalationsCreated++;
            await this.escalationManager.createEscalation({
              tenant_id: tenantId,
              agent_id: agentId,
              task_id: taskId,
              type: 'clarification',
              urgency: 'normal',
              title: reasoning.action_params?.title || 'Task Escalation',
              description: reasoning.thought,
              situation_context: { current_task_id: taskId },
              question: {
                title: 'Agent needs guidance',
                details: reasoning.action_params?.question || 'Please provide guidance on how to proceed',
              },
              agent_analysis: {
                what_i_know: reasoning.thought,
                what_i_dont_know: reasoning.action_params?.unknown || 'How to proceed',
                what_i_tried: reasoning.action_params?.tried || [],
              },
            });
            // Continue after escalation for non-blocking
            break;

          case 'fail':
            return await this.failTask(
              agentId,
              taskId,
              tenantId,
              reasoning.action_params?.reason || 'Task execution failed',
              true
            );

          case 'continue':
          default:
            // Continue to next iteration
            break;
        }

        // Update progress
        await this.updateProgress(
          agentId,
          taskId,
          tenantId,
          reasoning.progress_percent,
          reasoning.thought.substring(0, 200)
        );
      }

      // Max steps reached - complete with current outputs
      return await this.completeTask(agentId, taskId, tenantId, outputs, totalCost, totalTokens);
    } catch (error) {
      logger.error('Autonomous execution failed', error, { agentId, taskId, steps });
      return await this.failTask(
        agentId,
        taskId,
        tenantId,
        error instanceof Error ? error.message : 'Autonomous execution failed',
        true
      );
    }
  }

  /**
   * Build LLM prompt for task execution
   */
  private buildExecutionPrompt(
    task: Task,
    agent: Agent,
    context?: TaskContext
  ): string {
    return `You are an AI agent named "${agent.name}" with role "${agent.role}".

TASK INFORMATION:
Title: ${task.title}
Description: ${task.description || 'No description provided'}
Type: ${task.type}
Priority: ${task.priority}
Current Progress: ${context?.progress_percent || 0}%

INPUTS:
${JSON.stringify(task.inputs, null, 2)}

EXPECTED OUTPUTS:
${JSON.stringify(task.expected_outputs, null, 2)}

Your capabilities: ${agent.capabilities.join(', ')}

INSTRUCTIONS:
Analyze the task and decide on the next action. You must respond with a JSON object in this exact format:

{
  "thought": "Your detailed reasoning about the task and what you should do next",
  "action": "one of: continue, complete, escalate, spawn_subtask, request_info, fail",
  "action_params": {},
  "progress_percent": 0-100,
  "confidence": 0.0-1.0
}

Actions:
- continue: Continue working on the task
- complete: Mark task as complete (include outputs in action_params)
- escalate: Request human intervention (include reason in action_params)
- spawn_subtask: Create a subtask (not implemented yet)
- request_info: Request more information
- fail: Mark task as failed

Provide high confidence (>0.7) if you're certain about your action. The system will escalate automatically if confidence is below ${agent.limits?.escalation_threshold || 0.5}.

Respond only with the JSON object, no other text.`;
  }

  /**
   * Call LLM API
   */
  private async callLLM(
    agent: Agent,
    prompt: string
  ): Promise<RuntimeResponse<{ content: string; input_tokens: number; output_tokens: number; cost_usd: number }>> {
    try {
      const model = agent.llm_config?.model || 'claude-3-5-sonnet-20241022';
      const maxTokens = agent.llm_config?.max_tokens || 4096;
      const temperature = agent.llm_config?.temperature || 0.7;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
      }

      const result = await response.json();

      // Calculate cost
      const inputTokens = result.usage?.input_tokens || 0;
      const outputTokens = result.usage?.output_tokens || 0;
      const costUsd = this.calculateCost(model, inputTokens, outputTokens);

      return {
        success: true,
        data: {
          content: result.content[0]?.text || '',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: costUsd,
        },
      };
    } catch (error) {
      logger.error('LLM call failed', error);
      return {
        success: false,
        error: {
          code: 'LLM_ERROR',
          message: error instanceof Error ? error.message : 'LLM call failed',
          retryable: true,
        },
      };
    }
  }

  /**
   * Calculate LLM cost
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
      'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
      'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
      'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
    };

    const p = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
    const inputCost = (inputTokens / 1_000_000) * p.input;
    const outputCost = (outputTokens / 1_000_000) * p.output;
    return parseFloat((inputCost + outputCost).toFixed(8));
  }
}
