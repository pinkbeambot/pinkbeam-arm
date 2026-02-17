/**
 * Agent Context Manager
 * 
 * Manages agent context from tasks, decisions, activities.
 */

import { Agent, Task, Decision, Activity, AgentStatus, Capability } from '@/types';
import { Database } from '@/lib/database';

// ============================================================================
// Types
// ============================================================================

export interface AgentContext {
  agent: { id: string; name: string; role: string; capabilities: Capability[]; depth: number };
  state: { status: AgentStatus; currentTaskId?: string; currentTask?: TaskContext };
  history: { recentTasks: TaskContext[]; recentDecisions: DecisionContext[]; recentActivities: ActivityContext[] };
  parent?: ParentContext;
  metadata: { contextWindowSize: number; contextWindowLimit: number; timeRange: { from: Date; to: Date }; includesParentContext: boolean };
}

export interface TaskContext {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
  progressPercent?: number;
  result?: unknown;
}

export interface DecisionContext {
  id: string;
  title: string;
  description: string;
  status: string;
  confidence: number;
  reasoning?: string;
  createdAt: string;
  executedAt?: string;
}

export interface ActivityContext {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ParentContext {
  agentId: string;
  name: string;
  role: string;
  goal?: string;
  relevantDecisions: DecisionContext[];
  inheritedContext: Record<string, unknown>;
}

export interface ContextBuildOptions {
  tenantId: string;
  agentId: string;
  timeWindowHours?: number;
  maxTasks?: number;
  maxDecisions?: number;
  maxActivities?: number;
  includeParentContext?: boolean;
  currentTaskId?: string;
}

export interface ContextWindowConfig {
  maxTokens: number;
  maxHistoryItems: number;
  timeWindowHours: number;
  includeParentContext: boolean;
}

export interface ContextSearchOptions {
  query: string;
  types?: Array<'task' | 'decision' | 'activity'>;
  timeRange?: { from: Date; to: Date };
  limit?: number;
}

export interface ContextSearchResult {
  tasks: TaskContext[];
  decisions: DecisionContext[];
  activities: ActivityContext[];
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_CONTEXT_CONFIG: ContextWindowConfig = {
  maxTokens: 8000,
  maxHistoryItems: 50,
  timeWindowHours: 24,
  includeParentContext: true
};

export const CONTEXT_SUMMARY_TRUNCATION = {
  taskDescription: 500,
  decisionReasoning: 1000,
  activityDescription: 200
};

// ============================================================================
// Context Manager Class
// ============================================================================

export class AgentContextManager {
  private config: ContextWindowConfig;
  
  constructor(private db: Database, config?: Partial<ContextWindowConfig>) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config };
  }
  
  async buildContext(options: ContextBuildOptions): Promise<AgentContext> {
    const agent = await this.getAgent(options.tenantId, options.agentId);
    if (!agent) throw new ContextError(`Agent '${options.agentId}' not found`);
    
    const timeWindowHours = options.timeWindowHours ?? this.config.timeWindowHours;
    const from = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const to = new Date();
    
    const [currentTask, recentTasks, recentDecisions, recentActivities, parentContext] = await Promise.all([
      options.currentTaskId ? this.getTaskContext(options.tenantId, options.currentTaskId) : Promise.resolve(undefined),
      this.getRecentTasks(options.tenantId, options.agentId, options.maxTasks ?? 10, from),
      this.getRecentDecisions(options.tenantId, options.agentId, options.maxDecisions ?? 10, from),
      this.getRecentActivities(options.tenantId, options.agentId, options.maxActivities ?? 20, from),
      options.includeParentContext !== false && agent.parent_id ? this.buildParentContext(options.tenantId, agent.parent_id) : Promise.resolve(undefined)
    ]);
    
    const context: AgentContext = {
      agent: { id: agent.id, name: agent.name, role: agent.role, capabilities: agent.capabilities, depth: agent.depth },
      state: { status: agent.status, currentTaskId: agent.current_task_id || undefined, currentTask },
      history: { recentTasks, recentDecisions, recentActivities },
      parent: parentContext,
      metadata: { contextWindowSize: this.estimateContextSize(recentTasks, recentDecisions, recentActivities), contextWindowLimit: this.config.maxTokens, timeRange: { from, to }, includesParentContext: !!parentContext }
    };
    
    return this.applyContextWindow(context);
  }
  
  async buildTaskContext(tenantId: string, agentId: string, taskId: string): Promise<AgentContext> {
    return this.buildContext({ tenantId, agentId, currentTaskId: taskId, timeWindowHours: 48, maxTasks: 5, maxDecisions: 10, maxActivities: 15 });
  }
  
  async buildMinimalContext(tenantId: string, agentId: string): Promise<Pick<AgentContext, 'agent' | 'state'>> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent) throw new ContextError(`Agent '${agentId}' not found`);
    return { agent: { id: agent.id, name: agent.name, role: agent.role, capabilities: agent.capabilities, depth: agent.depth }, state: { status: agent.status, currentTaskId: agent.current_task_id || undefined } };
  }
  
  private applyContextWindow(context: AgentContext): AgentContext {
    const estimatedSize = context.metadata.contextWindowSize;
    if (estimatedSize <= this.config.maxTokens) return context;
    
    const truncated = { ...context };
    const targetItems = Math.floor(this.config.maxHistoryItems * (this.config.maxTokens / estimatedSize));
    
    truncated.history = {
      recentTasks: truncated.history.recentTasks.slice(0, Math.max(1, Math.floor(targetItems * 0.2))),
      recentDecisions: truncated.history.recentDecisions.slice(0, Math.max(1, Math.floor(targetItems * 0.3))),
      recentActivities: truncated.history.recentActivities.slice(0, Math.max(1, Math.floor(targetItems * 0.5)))
    };
    
    truncated.metadata = { ...truncated.metadata, contextWindowSize: this.estimateContextSize(truncated.history.recentTasks, truncated.history.recentDecisions, truncated.history.recentActivities) };
    return truncated;
  }
  
  estimateContextSize(tasks: TaskContext[], decisions: DecisionContext[], activities: ActivityContext[]): number {
    let size = 0;
    for (const task of tasks) size += Math.ceil((task.title.length + (task.description?.length || 0)) / 4);
    for (const decision of decisions) size += Math.ceil((decision.title.length + (decision.reasoning?.length || 0)) / 4);
    for (const activity of activities) size += Math.ceil((activity.title.length + (activity.description?.length || 0)) / 4);
    return size;
  }
  
  isWithinLimits(context: AgentContext): boolean {
    return context.metadata.contextWindowSize <= context.metadata.contextWindowLimit;
  }
  
  private async buildParentContext(tenantId: string, parentId: string): Promise<ParentContext | undefined> {
    const parent = await this.getAgent(tenantId, parentId);
    if (!parent) return undefined;
    
    const parentDecisions = await this.getRecentDecisions(tenantId, parentId, 5, new Date(Date.now() - 48 * 60 * 60 * 1000));
    const relevantDecisions = parentDecisions.filter(d => d.status === 'executed' || d.confidence > 0.8);
    
    return { agentId: parent.id, name: parent.name, role: parent.role, goal: parent.configuration?.goal as string, relevantDecisions, inheritedContext: parent.configuration?.inheritedContext as Record<string, unknown> || {} };
  }
  
  async inheritContext(tenantId: string, parentId: string, childId: string, contextKeys?: string[]): Promise<void> {
    const parent = await this.getAgent(tenantId, parentId);
    const child = await this.getAgent(tenantId, childId);
    if (!parent || !child) throw new ContextError('Parent or child agent not found');
    
    const parentConfig = parent.configuration || {};
    const inheritedContext: Record<string, unknown> = {};
    
    if (contextKeys) {
      for (const key of contextKeys) if (parentConfig[key] !== undefined) inheritedContext[key] = parentConfig[key];
    } else {
      for (const key of ['goal', 'constraints', 'preferences', 'escalationRules']) {
        if (parentConfig[key] !== undefined) inheritedContext[key] = parentConfig[key];
      }
    }
    
    await this.db.from('agents').update({ configuration: { ...child.configuration, inheritedContext, inheritedFrom: parentId, inheritedAt: new Date().toISOString() } }).eq('id', childId).eq('tenant_id', tenantId);
  }
  
  async getInheritedContext(tenantId: string, agentId: string): Promise<Record<string, unknown> | null> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent?.configuration?.inheritedContext) return null;
    return agent.configuration.inheritedContext as Record<string, unknown>;
  }
  
  async searchContext(tenantId: string, agentId: string, options: ContextSearchOptions): Promise<ContextSearchResult> {
    const results: ContextSearchResult = { tasks: [], decisions: [], activities: [] };
    const timeRange = options.timeRange || { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() };
    const types = options.types || ['task', 'decision', 'activity'];
    
    if (types.includes('task')) results.tasks = await this.searchTasks(tenantId, agentId, options.query, timeRange, options.limit ?? 10);
    if (types.includes('decision')) results.decisions = await this.searchDecisions(tenantId, agentId, options.query, timeRange, options.limit ?? 10);
    if (types.includes('activity')) results.activities = await this.searchActivities(tenantId, agentId, options.query, timeRange, options.limit ?? 10);
    
    return results;
  }
  
  async getContextForTimeRange(tenantId: string, agentId: string, from: Date, to: Date): Promise<Pick<AgentContext, 'history'>> {
    const [tasks, decisions, activities] = await Promise.all([
      this.getRecentTasks(tenantId, agentId, 100, from, to),
      this.getRecentDecisions(tenantId, agentId, 100, from, to),
      this.getRecentActivities(tenantId, agentId, 100, from, to)
    ]);
    return { history: { recentTasks: tasks, recentDecisions: decisions, recentActivities: activities } };
  }
  
  async getRelatedContext(tenantId: string, agentId: string, entityType: 'task' | 'decision', entityId: string): Promise<Partial<AgentContext['history']>> {
    let relatedIds: string[] = [];
    
    if (entityType === 'task') {
      const { data } = await this.db.from('tasks').select('metadata').eq('id', entityId).eq('tenant_id', tenantId).single();
      relatedIds = data?.metadata?.related_decisions || [];
    } else {
      const { data } = await this.db.from('decisions').select('metadata').eq('id', entityId).eq('tenant_id', tenantId).single();
      relatedIds = data?.metadata?.related_tasks || [];
    }
    
    const results: Partial<AgentContext['history']> = {};
    
    if (entityType === 'task') {
      const { data } = await this.db.from('decisions').select('*').in('id', relatedIds).eq('tenant_id', tenantId).order('created_at', { ascending: false });
      results.recentDecisions = (data || []).map(d => this.mapDecisionToContext(d));
    } else {
      const { data } = await this.db.from('tasks').select('*').in('id', relatedIds).eq('tenant_id', tenantId).order('created_at', { ascending: false });
      results.recentTasks = (data || []).map(t => this.mapTaskToContext(t));
    }
    
    return results;
  }
  
  private async getAgent(tenantId: string, agentId: string): Promise<Agent | null> {
    const { data, error } = await this.db.from('agents').select('*').eq('tenant_id', tenantId).eq('id', agentId).single();
    if (error || !data) return null;
    return data as Agent;
  }
  
  private async getTaskContext(tenantId: string, taskId: string): Promise<TaskContext | undefined> {
    const { data, error } = await this.db.from('tasks').select('*').eq('id', taskId).eq('tenant_id', tenantId).single();
    if (error || !data) return undefined;
    return this.mapTaskToContext(data);
  }
  
  private async getRecentTasks(tenantId: string, agentId: string, limit: number, from: Date, to?: Date): Promise<TaskContext[]> {
    let query = this.db.from('tasks').select('*').eq('tenant_id', tenantId).eq('assigned_agent_id', agentId).gte('created_at', from.toISOString()).order('created_at', { ascending: false }).limit(limit);
    if (to) query = query.lte('created_at', to.toISOString());
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((t: Task) => this.mapTaskToContext(t));
  }
  
  private async getRecentDecisions(tenantId: string, agentId: string, limit: number, from: Date, to?: Date): Promise<DecisionContext[]> {
    let query = this.db.from('decisions').select('*').eq('tenant_id', tenantId).eq('agent_id', agentId).gte('created_at', from.toISOString()).order('created_at', { ascending: false }).limit(limit);
    if (to) query = query.lte('created_at', to.toISOString());
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((d: Decision) => this.mapDecisionToContext(d));
  }
  
  private async getRecentActivities(tenantId: string, agentId: string, limit: number, from: Date, to?: Date): Promise<ActivityContext[]> {
    let query = this.db.from('activities').select('*').eq('tenant_id', tenantId).eq('agent_id', agentId).gte('created_at', from.toISOString()).order('created_at', { ascending: false }).limit(limit);
    if (to) query = query.lte('created_at', to.toISOString());
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((a: Activity) => this.mapActivityToContext(a));
  }
  
  private async searchTasks(tenantId: string, agentId: string, query: string, timeRange: { from: Date; to: Date }, limit: number): Promise<TaskContext[]> {
    const { data, error } = await this.db.from('tasks').select('*').eq('tenant_id', tenantId).eq('assigned_agent_id', agentId).or(`title.ilike.%${query}%,description.ilike.%${query}%`).gte('created_at', timeRange.from.toISOString()).lte('created_at', timeRange.to.toISOString()).order('created_at', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data.map((t: Task) => this.mapTaskToContext(t));
  }
  
  private async searchDecisions(tenantId: string, agentId: string, query: string, timeRange: { from: Date; to: Date }, limit: number): Promise<DecisionContext[]> {
    const { data, error } = await this.db.from('decisions').select('*').eq('tenant_id', tenantId).eq('agent_id', agentId).or(`title.ilike.%${query}%,description.ilike.%${query}%`).gte('created_at', timeRange.from.toISOString()).lte('created_at', timeRange.to.toISOString()).order('created_at', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data.map((d: Decision) => this.mapDecisionToContext(d));
  }
  
  private async searchActivities(tenantId: string, agentId: string, query: string, timeRange: { from: Date; to: Date }, limit: number): Promise<ActivityContext[]> {
    const { data, error } = await this.db.from('activities').select('*').eq('tenant_id', tenantId).eq('agent_id', agentId).or(`title.ilike.%${query}%,description.ilike.%${query}%`).gte('created_at', timeRange.from.toISOString()).lte('created_at', timeRange.to.toISOString()).order('created_at', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data.map((a: Activity) => this.mapActivityToContext(a));
  }
  
  private mapTaskToContext(task: Task): TaskContext {
    return { id: task.id, title: task.title, description: this.truncate(task.description, CONTEXT_SUMMARY_TRUNCATION.taskDescription), status: task.status, priority: task.priority, createdAt: task.created_at, completedAt: task.completed_at, progressPercent: task.progress_percent, result: task.metadata?.result };
  }
  
  private mapDecisionToContext(decision: Decision): DecisionContext {
    return { id: decision.id, title: decision.title, description: decision.description, status: decision.status, confidence: decision.confidence, reasoning: this.truncate(decision.reasoning, CONTEXT_SUMMARY_TRUNCATION.decisionReasoning), createdAt: decision.created_at, executedAt: decision.executed_at };
  }
  
  private mapActivityToContext(activity: Activity): ActivityContext {
    return { id: activity.id, type: activity.type, title: activity.title, description: this.truncate(activity.description, CONTEXT_SUMMARY_TRUNCATION.activityDescription), createdAt: activity.created_at, metadata: activity.metadata };
  }
  
  private truncate(text: string | undefined | null, maxLength: number): string | undefined {
    if (!text) return undefined;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createContextManager(db: Database, config?: Partial<ContextWindowConfig>): AgentContextManager {
  return new AgentContextManager(db, config);
}

export default AgentContextManager;
