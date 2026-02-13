/**
 * ARM Type Definitions
 * Based on AGENT-PROTOCOL.md and PRD
 */

// Enums
export type AgentStatus = 
  | 'initializing' 
  | 'idle' 
  | 'active' 
  | 'paused' 
  | 'blocked' 
  | 'error' 
  | 'escaped' 
  | 'terminated';

export type AgentRole = 
  | 'ceo' 
  | 'manager' 
  | 'worker' 
  | 'specialist' 
  | 'system';

export type Capability = 
  | 'spawn' 
  | 'delegate' 
  | 'decide' 
  | 'escalate' 
  | 'access_external' 
  | 'modify_config';

export type TaskStatus = 
  | 'queued' 
  | 'in_progress' 
  | 'blocked' 
  | 'review' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type TaskPriority = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'urgent';

export type EscalationUrgency = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'critical';

export type DecisionStatus = 
  | 'proposed' 
  | 'approved' 
  | 'rejected' 
  | 'overridden' 
  | 'executed';

// Core Agent Types
export interface Agent {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  root_id: string;
  depth: number;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  avatar_url?: string;
  description?: string;
  capabilities: Capability[];
  model?: string;
  configuration?: Record<string, unknown>;
  current_task_id?: string;
  current_task?: Task;
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentWithStats extends Agent {
  tasks_completed: number;
  success_rate: number;
  avg_task_duration: number;
  escalation_count: number;
}

// Task Types
export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_agent_id?: string;
  assigned_agent?: Agent;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  estimated_duration?: number;
  actual_duration?: number;
  acceptance_criteria?: string[];
  metadata?: Record<string, unknown>;
}

// Activity Types
export type ActivityType = 
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'decision_made'
  | 'escalation_raised'
  | 'escalation_resolved'
  | 'handoff'
  | 'error'
  | 'agent_spawned'
  | 'agent_status_changed'
  | 'message';

export interface Activity {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent?: Agent;
  type: ActivityType | string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  related_task_id?: string;
  related_decision_id?: string;
  related_escalation_id?: string;
  created_at: string;
  // Extended fields for activity feed
  actor_id?: string;
  actor_type?: 'agent' | 'user' | 'system';
  target_id?: string;
  target_type?: 'task' | 'decision' | 'escalation' | 'agent';
}

// Decision Types
export interface Decision {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent?: Agent;
  task_id?: string;
  status: DecisionStatus;
  title: string;
  description: string;
  reasoning?: string;
  alternatives_considered?: string[];
  confidence: number;
  proposed_action?: Record<string, unknown>;
  overridden_by?: string;
  override_reason?: string;
  executed_at?: string;
  created_at: string;
}

// Escalation Types
export interface Escalation {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent?: Agent;
  task_id?: string;
  type: 'clarification' | 'approval' | 'error' | 'edge_case';
  urgency: EscalationUrgency;
  title: string;
  description: string;
  context?: string;
  agent_recommendation?: string;
  agent_confidence?: number;
  status: 'open' | 'resolved';
  resolved_by?: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

// UI Types
export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'status' | 'last_active' | 'tasks_completed';
export type SortOrder = 'asc' | 'desc';

// Form Types
export interface CreateAgentInput {
  name: string;
  role: AgentRole;
  description: string;
  avatar_url?: string;
  model?: string;
  capabilities?: Capability[];
  parent_id?: string;
}

// Realtime Types
export interface RealtimeChangePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}
