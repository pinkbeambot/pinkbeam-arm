/**
 * Agent Spawner
 * 
 * Handles creation of new agents with parent-child relationships.
 */

import { Agent, AgentRole, Capability, AgentStatus } from '@/types';
import { Database } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface SpawnOptions {
  name: string;
  role: AgentRole;
  description?: string;
  goal?: string;
  parentId?: string | null;
  capabilities?: Capability[];
  model?: string;
  avatarUrl?: string;
  configuration?: Record<string, unknown>;
  context?: SpawnContext;
  limits?: AgentLimits;
  triggeredBy: string;
}

export interface SpawnContext {
  taskDescription?: string;
  relevantHistory?: unknown[];
  parentContext?: Record<string, unknown>;
}

export interface AgentLimits {
  maxSubAgents: number;
  escalationThreshold: number;
  timeoutSeconds: number;
  maxTokensPerTask?: number;
  maxCostPerTaskUsd?: number;
}

export interface SpawnResult {
  success: boolean;
  agent?: Agent;
  error?: SpawnError;
  contextSnapshot?: {
    spawnedAt: Date;
    initialState: AgentStatus;
    parentAgentId?: string | null;
  };
}

export interface SpawnError {
  code: SpawnErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type SpawnErrorCode =
  | 'PARENT_NOT_FOUND'
  | 'PARENT_NOT_AUTHORIZED'
  | 'MAX_DEPTH_EXCEEDED'
  | 'INVALID_ROLE'
  | 'INVALID_CONFIGURATION'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';

export interface AgentTemplate {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  capabilities: Capability[];
  defaultModel: string;
  defaultConfiguration: Record<string, unknown>;
  defaultLimits: AgentLimits;
  systemPrompt?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const MAX_AGENT_DEPTH = 5;
export const DEFAULT_MAX_SUB_AGENTS = 10;
export const DEFAULT_ESCALATION_THRESHOLD = 0.7;
export const DEFAULT_TIMEOUT_SECONDS = 300;

export const AGENT_TEMPLATES: Record<string, AgentTemplate> = {
  worker: {
    id: 'template-worker',
    name: 'Worker Agent',
    role: 'worker',
    description: 'General purpose task execution agent',
    capabilities: ['decide', 'escalate'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    defaultConfiguration: { temperature: 0.7, max_tokens: 4096 },
    defaultLimits: { maxSubAgents: 0, escalationThreshold: 0.6, timeoutSeconds: 300 },
    systemPrompt: 'You are a worker agent focused on task execution. Work efficiently and escalate when uncertain.'
  },
  manager: {
    id: 'template-manager',
    name: 'Manager Agent',
    role: 'manager',
    description: 'Coordinates other agents and delegates tasks',
    capabilities: ['spawn', 'delegate', 'decide', 'escalate', 'modify_config'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    defaultConfiguration: { temperature: 0.5, max_tokens: 4096 },
    defaultLimits: { maxSubAgents: 5, escalationThreshold: 0.5, timeoutSeconds: 600 },
    systemPrompt: 'You are a manager agent. Delegate tasks effectively, spawn worker agents when needed.'
  },
  specialist: {
    id: 'template-specialist',
    name: 'Specialist Agent',
    role: 'specialist',
    description: 'Domain expert for specific tasks',
    capabilities: ['decide', 'escalate', 'access_external'],
    defaultModel: 'claude-3-opus-20240229',
    defaultConfiguration: { temperature: 0.3, max_tokens: 4096 },
    defaultLimits: { maxSubAgents: 2, escalationThreshold: 0.7, timeoutSeconds: 600 },
    systemPrompt: 'You are a specialist agent with domain expertise. Provide high-quality outputs.'
  }
};

const ROLE_CAPABILITIES: Record<AgentRole, Capability[]> = {
  ceo: ['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config'],
  manager: ['spawn', 'delegate', 'decide', 'escalate', 'modify_config'],
  worker: ['decide', 'escalate'],
  specialist: ['decide', 'escalate', 'access_external'],
  system: ['spawn', 'delegate', 'decide', 'escalate', 'access_external', 'modify_config']
};

// ============================================================================
// Spawner Class
// ============================================================================

export class AgentSpawner {
  constructor(private db: Database) {}
  
  async spawn(tenantId: string, options: SpawnOptions): Promise<SpawnResult> {
    try {
      const validation = await this.validateSpawn(tenantId, options);
      if (!validation.valid) return { success: false, error: validation.error! };
      
      let parentInfo: { rootId: string; depth: number } | null = null;
      if (options.parentId) parentInfo = await this.getParentInfo(tenantId, options.parentId);
      
      const agentId = this.generateAgentId();
      const depth = parentInfo ? parentInfo.depth + 1 : 0;
      const rootId = parentInfo ? parentInfo.rootId : agentId;
      
      const capabilities = this.mergeCapabilities(options.role, options.capabilities);
      const limits = this.buildLimits(options.role, options.limits);
      const configuration = this.buildConfiguration(options);
      
      const now = new Date().toISOString();
      const agent: Agent = {
        id: agentId,
        tenant_id: tenantId,
        parent_id: options.parentId || null,
        root_id: rootId,
        depth,
        name: options.name,
        role: options.role,
        status: 'initializing',
        avatar_url: options.avatarUrl,
        description: options.description,
        capabilities,
        model: options.model || this.getDefaultModel(options.role),
        configuration: { ...configuration, limits, goal: options.goal, spawnContext: options.context },
        created_at: now,
        updated_at: now,
        metadata: { spawned_by: options.triggeredBy, spawn_context: options.context }
      };
      
      await this.insertAgent(agent);
      await this.logSpawnActivity(tenantId, agent, options.triggeredBy);
      
      return {
        success: true,
        agent,
        contextSnapshot: { spawnedAt: new Date(), initialState: 'initializing', parentAgentId: options.parentId || null }
      };
    } catch (error) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error', retryable: false, details: { error } }
      };
    }
  }
  
  async spawnFromTemplate(tenantId: string, templateId: string, overrides: Partial<SpawnOptions>): Promise<SpawnResult> {
    const template = AGENT_TEMPLATES[templateId];
    if (!template) return { success: false, error: { code: 'INVALID_CONFIGURATION', message: `Template '${templateId}' not found`, retryable: false } };
    
    const options: SpawnOptions = {
      name: overrides.name || template.name,
      role: template.role,
      description: overrides.description || template.description,
      parentId: overrides.parentId,
      capabilities: [...template.capabilities, ...(overrides.capabilities || [])],
      model: overrides.model || template.defaultModel,
      configuration: { ...template.defaultConfiguration, ...overrides.configuration, systemPrompt: template.systemPrompt },
      limits: { ...template.defaultLimits, ...overrides.limits },
      triggeredBy: overrides.triggeredBy!
    };
    
    if (!options.triggeredBy) return { success: false, error: { code: 'INVALID_CONFIGURATION', message: 'triggeredBy is required', retryable: false } };
    
    return this.spawn(tenantId, options);
  }
  
  getTemplates(): AgentTemplate[] { return Object.values(AGENT_TEMPLATES); }
  getTemplate(templateId: string): AgentTemplate | undefined { return AGENT_TEMPLATES[templateId]; }
  registerTemplate(template: AgentTemplate): void { AGENT_TEMPLATES[template.id] = template; }
  generateAgentId(): string { return `agent-${uuidv4()}`; }
  
  async canSpawnChildren(tenantId: string, agentId: string): Promise<{ allowed: boolean; reason?: string }> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent) return { allowed: false, reason: 'Agent not found' };
    if (!agent.capabilities.includes('spawn')) return { allowed: false, reason: 'Agent does not have spawn capability' };
    if (agent.depth >= MAX_AGENT_DEPTH) return { allowed: false, reason: `Maximum agent depth (${MAX_AGENT_DEPTH}) reached` };
    
    const childCount = await this.getChildCount(tenantId, agentId);
    const maxSubAgents = (agent.configuration?.limits as AgentLimits)?.maxSubAgents ?? DEFAULT_MAX_SUB_AGENTS;
    if (childCount >= maxSubAgents) return { allowed: false, reason: `Maximum sub-agents (${maxSubAgents}) reached` };
    
    return { allowed: true };
  }
  
  async getAgentTree(tenantId: string, rootId: string): Promise<Agent[]> {
    const { data, error } = await this.db.rpc('get_agent_descendants', { p_root_id: rootId, p_tenant_id: tenantId });
    if (error) throw error;
    return data || [];
  }
  
  async getDescendants(tenantId: string, agentId: string): Promise<Agent[]> {
    return this.getAgentTree(tenantId, agentId);
  }
  
  async getChildren(tenantId: string, agentId: string): Promise<Agent[]> {
    const { data, error } = await this.db.from('agents').select('*').eq('tenant_id', tenantId).eq('parent_id', agentId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  
  async getAncestry(tenantId: string, agentId: string): Promise<Agent[]> {
    const ancestors: Agent[] = [];
    let currentId: string | null = agentId;
    
    while (currentId) {
      const agent = await this.getAgent(tenantId, currentId);
      if (!agent) break;
      ancestors.unshift(agent);
      currentId = agent.parent_id;
      if (ancestors.length > MAX_AGENT_DEPTH + 1) break;
    }
    
    return ancestors;
  }
  
  private async validateSpawn(tenantId: string, options: SpawnOptions): Promise<{ valid: boolean; error?: SpawnError }> {
    if (options.parentId) {
      const parent = await this.getAgent(tenantId, options.parentId);
      if (!parent) return { valid: false, error: { code: 'PARENT_NOT_FOUND', message: `Parent agent '${options.parentId}' not found`, retryable: false } };
      
      const canSpawn = await this.canSpawnChildren(tenantId, options.parentId);
      if (!canSpawn.allowed) return { valid: false, error: { code: 'PARENT_NOT_AUTHORIZED', message: canSpawn.reason!, retryable: false } };
    }
    
    if (!ROLE_CAPABILITIES[options.role]) return { valid: false, error: { code: 'INVALID_ROLE', message: `Invalid role: ${options.role}`, retryable: false } };
    if (!options.name || options.name.trim().length === 0) return { valid: false, error: { code: 'INVALID_CONFIGURATION', message: 'Agent name is required', retryable: false } };
    if (!options.triggeredBy) return { valid: false, error: { code: 'INVALID_CONFIGURATION', message: 'triggeredBy is required', retryable: false } };
    
    return { valid: true };
  }
  
  private async getParentInfo(tenantId: string, parentId: string): Promise<{ rootId: string; depth: number }> {
    const parent = await this.getAgent(tenantId, parentId);
    if (!parent) throw new Error(`Parent agent '${parentId}' not found`);
    return { rootId: parent.root_id || parentId, depth: parent.depth };
  }
  
  private async getAgent(tenantId: string, agentId: string): Promise<Agent | null> {
    const { data, error } = await this.db.from('agents').select('*').eq('tenant_id', tenantId).eq('id', agentId).single();
    if (error || !data) return null;
    return data as Agent;
  }
  
  private async getChildCount(tenantId: string, parentId: string): Promise<number> {
    const { count, error } = await this.db.from('agents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('parent_id', parentId);
    if (error) throw error;
    return count || 0;
  }
  
  private async insertAgent(agent: Agent): Promise<void> {
    const { error } = await this.db.from('agents').insert(agent);
    if (error) throw error;
  }
  
  private mergeCapabilities(role: AgentRole, customCapabilities?: Capability[]): Capability[] {
    const baseCapabilities = ROLE_CAPABILITIES[role] || [];
    return Array.from(new Set([...baseCapabilities, ...(customCapabilities || [])]));
  }
  
  private buildLimits(role: AgentRole, customLimits?: Partial<AgentLimits>): AgentLimits {
    const defaults: AgentLimits = {
      maxSubAgents: role === 'manager' ? 5 : role === 'ceo' ? 100 : 0,
      escalationThreshold: DEFAULT_ESCALATION_THRESHOLD,
      timeoutSeconds: DEFAULT_TIMEOUT_SECONDS
    };
    return { ...defaults, ...customLimits };
  }
  
  private buildConfiguration(options: SpawnOptions): Record<string, unknown> {
    return { ...options.configuration, spawnedAt: new Date().toISOString(), spawnContext: options.context };
  }
  
  private getDefaultModel(role: AgentRole): string {
    if (role === 'specialist') return 'claude-3-opus-20240229';
    return 'claude-3-5-sonnet-20241022';
  }
  
  private async logSpawnActivity(tenantId: string, agent: Agent, triggeredBy: string): Promise<void> {
    await this.db.from('activities').insert({
      tenant_id: tenantId,
      agent_id: agent.id,
      type: 'agent.spawned',
      title: `Agent spawned: ${agent.name}`,
      description: `${agent.role} agent created with ${agent.capabilities.length} capabilities`,
      metadata: { parent_id: agent.parent_id, depth: agent.depth, triggered_by: triggeredBy, capabilities: agent.capabilities },
      actor_id: triggeredBy,
      actor_type: agent.parent_id ? 'agent' : 'user',
      target_id: agent.id,
      target_type: 'agent'
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getRoleCapabilities(role: AgentRole): Capability[] {
  return [...ROLE_CAPABILITIES[role]];
}

export function canRoleSpawn(role: AgentRole): boolean {
  return ROLE_CAPABILITIES[role].includes('spawn');
}

export function validateAgentDepth(depth: number): { valid: boolean; maxDepth: number } {
  return { valid: depth <= MAX_AGENT_DEPTH, maxDepth: MAX_AGENT_DEPTH };
}

export function createAgentSpawner(db: Database): AgentSpawner {
  return new AgentSpawner(db);
}

export default AgentSpawner;
