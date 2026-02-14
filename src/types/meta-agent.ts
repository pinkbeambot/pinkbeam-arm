/**
 * VALIS Meta-Agent Types
 * Issue: #17 - Meta-Agent / Natural Language Interface
 * 
 * VALIS (Vast Active Living Intelligence System) is the natural language
 * interface that lets the CEO communicate with the entire agent workforce.
 */

import type { Agent, Task, Escalation, Decision, Activity } from './index';

// ============================================================================
// Intent Types
// ============================================================================

export type MetaAgentIntent =
  | 'status'           // Get workforce/agent status
  | 'assign'           // Assign task to agent
  | 'create_issue'     // Create GitHub issue
  | 'query'            // Answer questions about system state
  | 'spawn'            // Spawn a new agent
  | 'terminate'        // Terminate an agent
  | 'pause'            // Pause an agent
  | 'resume'           // Resume an agent
  | 'escalate'         // Create escalation
  | 'broadcast'        // Send message to multiple agents
  | 'unknown';         // Could not determine intent

export type MetaAgentCommandStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'pending_confirmation';

// ============================================================================
// Entity Extraction Types
// ============================================================================

export interface ExtractedEntities {
  // Agent references
  agent_names?: string[];
  agent_ids?: string[];
  agent_roles?: string[];
  
  // Task references
  task_descriptions?: string[];
  task_ids?: string[];
  task_types?: string[];
  
  // Parameters
  priorities?: ('low' | 'normal' | 'high' | 'urgent')[];
  deadlines?: string[];
  time_ranges?: string[];
  
  // Issue creation
  issue_title?: string;
  issue_body?: string;
  issue_labels?: string[];
  
  // Filters
  status_filters?: string[];
  role_filters?: string[];
  
  // Context flags
  scope?: 'tenant' | 'agent' | 'task' | 'system';
  include_subagents?: boolean;
  
  // Action modifiers
  dry_run?: boolean;
  force?: boolean;
  
  // Raw NLP output for debugging
  raw_entities?: Record<string, unknown>;
}

// ============================================================================
// Session Types
// ============================================================================

export interface MetaAgentSession {
  id: string;
  tenant_id: string;
  user_id: string;
  title?: string;
  status: 'active' | 'archived' | 'closed';
  context: MetaAgentSessionContext;
  message_count: number;
  command_count: number;
  started_at: string;
  last_activity_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MetaAgentSessionContext {
  current_topic?: string;
  referenced_agents?: string[];
  referenced_tasks?: string[];
  pending_actions?: PendingAction[];
  conversation_state?: 'idle' | 'awaiting_confirmation' | 'gathering_info' | 'processing';
  last_intent?: MetaAgentIntent;
  clarification_needed?: boolean;
  clarification_question?: string;
  [key: string]: unknown;
}

export interface PendingAction {
  id: string;
  type: MetaAgentIntent;
  description: string;
  requires_confirmation: boolean;
  payload: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Command Types
// ============================================================================

export interface MetaAgentCommand {
  id: string;
  tenant_id: string;
  session_id: string;
  user_id: string;
  raw_message: string;
  intent: MetaAgentIntent;
  intent_confidence: number;
  extracted_entities: ExtractedEntities;
  status: MetaAgentCommandStatus;
  action_type?: string;
  action_target_id?: string;
  action_target_type?: string;
  action_payload?: Record<string, unknown>;
  result?: MetaAgentResult;
  result_summary?: string;
  error_message?: string;
  error_details?: Record<string, unknown>;
  response_message: string;
  response_metadata: MetaAgentResponseMetadata;
  processing_time_ms?: number;
  tokens_used?: number;
  github_issue_url?: string;
  github_issue_number?: number;
  created_at: string;
  processed_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface MetaAgentResult {
  success: boolean;
  data?: unknown;
  affected_entities?: {
    type: string;
    id: string;
    name?: string;
  }[];
  warnings?: string[];
}

export interface MetaAgentResponseMetadata {
  intent_matched: boolean;
  entities_extracted: number;
  data_sources_queried?: string[];
  actions_taken?: string[];
  suggested_followups?: string[];
  processing_stage?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ProcessMessageRequest {
  message: string;
  session_id?: string;  // Optional - will create new session if not provided
  context?: Record<string, unknown>;
}

export interface ProcessMessageResponse {
  command: MetaAgentCommand;
  session: MetaAgentSession;
  suggested_actions?: SuggestedAction[];
}

export interface SuggestedAction {
  label: string;
  action: string;
  params: Record<string, unknown>;
}

export interface ListSessionsRequest {
  status?: 'active' | 'archived' | 'closed';
  limit?: number;
  offset?: number;
}

export interface ListSessionsResponse {
  sessions: MetaAgentSession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface GetSessionHistoryRequest {
  session_id: string;
  limit?: number;
  before?: string; // ISO timestamp
}

export interface GetSessionHistoryResponse {
  commands: MetaAgentCommand[];
  has_more: boolean;
}

export interface ConfirmCommandRequest {
  command_id: string;
  confirmed: boolean;
  feedback?: string;
}

// ============================================================================
// Intent Handler Types
// ============================================================================

export interface IntentHandlerContext {
  tenant_id: string;
  user_id: string;
  session_id: string;
  command_id: string;
  supabase: unknown; // Supabase client
}

export interface IntentHandlerInput {
  intent: MetaAgentIntent;
  entities: ExtractedEntities;
  raw_message: string;
  session_context: MetaAgentSessionContext;
}

export interface IntentHandlerOutput {
  success: boolean;
  result?: unknown;
  result_summary: string;
  response_message: string;
  error?: string;
  requires_confirmation?: boolean;
  suggested_followups?: string[];
}

export type IntentHandler = (
  input: IntentHandlerInput,
  context: IntentHandlerContext
) => Promise<IntentHandlerOutput>;

// ============================================================================
// Status Intent Types
// ============================================================================

export interface StatusQueryParams {
  scope: 'workforce' | 'agent' | 'tasks' | 'escalations' | 'decisions' | 'system';
  agent_id?: string;
  agent_name?: string;
  time_range?: 'today' | 'week' | 'month' | 'all';
  status_filter?: string[];
  include_stats?: boolean;
  include_recent_activity?: boolean;
}

export interface WorkforceStatus {
  summary: {
    total_agents: number;
    active_agents: number;
    idle_agents: number;
    paused_agents: number;
    error_agents: number;
    blocked_agents: number;
  };
  agents: AgentStatusSummary[];
  recent_tasks: TaskSummary[];
  open_escalations: number;
  pending_decisions: number;
}

export interface AgentStatusSummary {
  id: string;
  name: string;
  role: string;
  status: string;
  current_task?: string;
  tasks_completed_today: number;
  recent_activity: Activity[];
}

export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee_name: string;
  created_at: string;
}

// ============================================================================
// Assign Intent Types
// ============================================================================

export interface AssignTaskParams {
  agent_name?: string;
  agent_id?: string;
  task_description: string;
  task_title?: string;
  priority?: TaskPriority;
  deadline?: string;
  parent_task_id?: string;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AssignTaskResult {
  task_id: string;
  task_title: string;
  assigned_to: {
    id: string;
    name: string;
  };
  priority: TaskPriority;
  deadline?: string;
}

// ============================================================================
// Create Issue Intent Types
// ============================================================================

export interface CreateIssueParams {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
  from_conversation?: boolean;
}

export interface CreateIssueResult {
  issue_number: number;
  issue_url: string;
  title: string;
  labels: string[];
}

// ============================================================================
// Query Intent Types
// ============================================================================

export interface QueryParams {
  query_type: 'agent_info' | 'task_status' | 'activity_history' | 'performance' | 'general';
  target_entity?: string;
  target_id?: string;
  time_range?: string;
  filters?: Record<string, unknown>;
}

export interface QueryResult {
  answer: string;
  data?: unknown;
  data_source: string;
  confidence: number;
}

// ============================================================================
// Broadcast Intent Types
// ============================================================================

export interface BroadcastParams {
  message: string;
  target_scope: 'all' | 'by_role' | 'by_status' | 'specific_agents';
  target_roles?: string[];
  target_statuses?: string[];
  target_agent_ids?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface BroadcastResult {
  recipients_count: number;
  recipients: {
    id: string;
    name: string;
    status: string;
  }[];
  message_sent: string;
}
