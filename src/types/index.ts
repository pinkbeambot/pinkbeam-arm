// Type definitions for ARM (Agent Relationship Management) platform

// ============================================================================
// Enums (match database enum types)
// ============================================================================

export type AgentRole = 'ceo' | 'manager' | 'worker' | 'specialist' | 'system';

export type AgentStatus = 
  | 'initializing' 
  | 'idle' 
  | 'active' 
  | 'paused' 
  | 'blocked' 
  | 'error' 
  | 'escaped' 
  | 'terminated';

export type TaskStatus = 
  | 'queued' 
  | 'in_progress' 
  | 'blocked' 
  | 'review' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DecisionStatus = 'proposed' | 'approved' | 'rejected' | 'overridden' | 'executed';
export type DecisionCategory = 'action' | 'resource' | 'escalation' | 'strategy' | 'system';

export type EscalationType = 'clarification' | 'approval' | 'error' | 'edge_case' | 'policy_violation';
export type EscalationStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';
export type EscalationUrgency = 'low' | 'normal' | 'high' | 'critical';

export type ActivityType = 
  | 'agent.spawned' 
  | 'agent.status_changed' 
  | 'agent.terminated'
  | 'task.created' 
  | 'task.assigned' 
  | 'task.started' 
  | 'task.progress' 
  | 'task.completed' 
  | 'task.failed'
  | 'decision.proposed' 
  | 'decision.made' 
  | 'decision.overridden'
  | 'escalation.created' 
  | 'escalation.resolved'
  | 'message.sent' 
  | 'message.received'
  | 'system.error' 
  | 'system.config_changed';

export type MessageType = 
  | 'spawn.request' | 'spawn.response'
  | 'task.assign' | 'task.accept' | 'task.reject' | 'task.progress' | 'task.complete' | 'task.fail'
  | 'decision.propose' | 'decision.confirm' | 'decision.override'
  | 'escalate.request' | 'escalate.response'
  | 'message.direct' | 'message.broadcast'
  | 'system.ping' | 'system.pong' | 'system.config.update' | 'system.error';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Core Database Models
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  config: Record<string, unknown>;
  limits: {
    max_agents: number;
    max_tasks: number;
    max_storage_mb: number;
  };
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  auth_id?: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  preferences: Record<string, unknown>;
  notification_settings: {
    email_escalations: boolean;
    email_digest: string;
    push_enabled: boolean;
  };
  status: 'active' | 'inactive' | 'suspended';
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  slug?: string;
  role: AgentRole;
  avatar_url?: string;
  description?: string;
  parent_id?: string;
  root_id?: string;
  depth: number;
  status: AgentStatus;
  status_reason?: string;
  capabilities: string[];
  config: Record<string, unknown>;
  llm_config: {
    provider: string;
    model: string;
    temperature?: number;
    max_tokens?: number;
  };
  limits: {
    max_sub_agents: number;
    escalation_threshold: number;
    timeout_seconds: number;
    max_tokens_per_task: number;
    max_cost_per_task_usd: number;
  };
  stats: {
    tasks_completed: number;
    tasks_failed: number;
    escalations_raised: number;
    avg_task_duration_seconds: number;
    total_cost_usd: number;
  };
  session_id?: string;
  current_task_id?: string;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  terminated_at?: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  type: string;
  assignee_id?: string;
  assigner_id?: string;
  status: TaskStatus;
  priority: TaskPriority;
  parent_task_id?: string;
  depth: number;
  inputs: Record<string, unknown>;
  expected_outputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  deadline_at?: string;
  started_at?: string;
  completed_at?: string;
  progress_percent: number;
  current_step?: string;
  cost_usd: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  tenant_id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'requires' | 'optional';
  created_at: string;
}

export interface Decision {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_id?: string;
  category: DecisionCategory;
  title: string;
  description?: string;
  proposed_action: Record<string, unknown>;
  executed_action?: Record<string, unknown>;
  reasoning: {
    context: string;
    analysis: string;
    options_considered: Array<{
      description: string;
      pros: string[];
      cons: string[];
      estimated_outcome: string;
      confidence: number;
    }>;
    confidence: number;
    risks: Array<{
      description: string;
      likelihood: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
      mitigation?: string;
    }>;
  };
  self_authorized: boolean;
  required_approval_from?: string;
  status: DecisionStatus;
  overridden_by?: string;
  override_reason?: string;
  overridden_at?: string;
  outcome?: Record<string, unknown>;
  proposed_at: string;
  decided_at?: string;
  executed_at?: string;
}

export interface Escalation {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_id?: string;
  type: EscalationType;
  urgency: EscalationUrgency;
  status: EscalationStatus;
  title: string;
  description: string;
  situation_context: Record<string, unknown>;
  question: {
    title: string;
    details: string;
    options?: string[];
  };
  agent_analysis: {
    what_i_know: string;
    what_i_dont_know: string;
    what_i_tried: string[];
    suggested_resolution?: string;
  };
  resolved_by?: string;
  resolution_type?: string;
  resolution_answer?: string;
  resolution_resources?: Record<string, unknown>;
  learning_notes?: string;
  sla_deadline_at?: string;
  resolved_at?: string;
  time_to_resolve_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  tenant_id: string;
  type: ActivityType;
  category: string;
  actor_type: 'agent' | 'user' | 'system';
  actor_id: string;
  target_type?: string;
  target_id?: string;
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
  agent_id?: string;
  task_id?: string;
  sequence_number: number;
  created_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  protocol_version: string;
  message_type: MessageType;
  from_agent_id?: string;
  to_agent_id?: string;
  to_broadcast: boolean;
  thread_id?: string;
  correlation_id?: string;
  payload: Record<string, unknown>;
  priority: MessagePriority;
  requires_ack: boolean;
  acked_at?: string;
  trace: Record<string, unknown>;
  expires_at?: string;
  created_at: string;
  processed_at?: string;
}

// ============================================================================
// Extended Models (with relations)
// ============================================================================

export interface AgentWithRelations extends Agent {
  parent?: Agent;
  children?: Agent[];
  current_task?: Task;
}

export interface TaskWithRelations extends Task {
  assignee?: Agent;
  assigner?: Agent;
  dependencies?: TaskDependency[];
  blocked_by?: Task[];
  blocking?: Task[];
}

export interface DecisionWithRelations extends Decision {
  agent?: Agent;
  task?: Task;
  overridden_by_user?: User;
}

export interface EscalationWithRelations extends Escalation {
  agent?: Agent;
  task?: Task;
  resolved_by_user?: User;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: PaginationMeta;
}

export interface ApiListResponse<T> {
  data: T[];
  error: null;
  meta: PaginationMeta;
}

// ============================================================================
// Request/Response Types
// ============================================================================

// Agents
export interface ListAgentsQuery {
  status?: AgentStatus;
  role?: AgentRole;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateAgentInput {
  name: string;
  slug?: string;
  role: AgentRole;
  description?: string;
  parent_id?: string;
  capabilities?: string[];
  llm_config?: Partial<Agent['llm_config']>;
  limits?: Partial<Agent['limits']>;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  capabilities?: string[];
  llm_config?: Partial<Agent['llm_config']>;
  limits?: Partial<Agent['limits']>;
}

// Tasks
export interface ListTasksQuery {
  status?: TaskStatus;
  assignee_id?: string;
  priority?: TaskPriority;
  page?: number;
  limit?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: string;
  assignee_id?: string;
  priority?: TaskPriority;
  parent_task_id?: string;
  inputs?: Record<string, unknown>;
  expected_outputs?: Record<string, unknown>;
  deadline_at?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignee_id?: string;
  priority?: TaskPriority;
  progress_percent?: number;
  current_step?: string;
  outputs?: Record<string, unknown>;
}

// Decisions
export interface ListDecisionsQuery {
  agent_id?: string;
  status?: DecisionStatus;
  category?: DecisionCategory;
  page?: number;
  limit?: number;
}

export interface CreateDecisionInput {
  agent_id: string;
  task_id?: string;
  category: DecisionCategory;
  title: string;
  description?: string;
  proposed_action: Record<string, unknown>;
  reasoning: Decision['reasoning'];
  self_authorized?: boolean;
}

export interface OverrideDecisionInput {
  reason: string;
  correct_action?: Record<string, unknown>;
}

// Escalations
export interface ListEscalationsQuery {
  status?: EscalationStatus;
  urgency?: EscalationUrgency;
  page?: number;
  limit?: number;
}

export interface ResolveEscalationInput {
  status: 'resolved' | 'dismissed';
  resolution_type?: string;
  resolution_answer: string;
  resolution_resources?: Record<string, unknown>;
  learning_notes?: string;
}

// Activities
export interface ListActivitiesQuery {
  type?: ActivityType;
  agent_id?: string;
  limit?: number;
  before?: string; // cursor for pagination
}

// ============================================================================
// UI Types
// ============================================================================

export type ViewMode = 'grid' | 'list';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface FilterState {
  status?: string;
  role?: string;
  search?: string;
}

export type StatusColor = 'green' | 'yellow' | 'gray' | 'red' | 'blue';

export const statusColors: Record<string, StatusColor> = {
  active: 'green',
  idle: 'yellow',
  paused: 'gray',
  error: 'red',
  initializing: 'blue',
  blocked: 'red',
  escaped: 'red',
  terminated: 'gray',
  queued: 'gray',
  in_progress: 'blue',
  review: 'yellow',
  completed: 'green',
  failed: 'red',
  cancelled: 'gray',
  open: 'red',
  in_progress_escalation: 'yellow',
  resolved: 'green',
  dismissed: 'gray',
};
