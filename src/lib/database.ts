// Generated database types for ARM (Agent Relationship Management)
// Based on Supabase schema migrations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// Enums
// ============================================================================

export type AgentRole = 'ceo' | 'manager' | 'worker' | 'specialist' | 'system'
export type AgentStatus = 'initializing' | 'idle' | 'active' | 'paused' | 'blocked' | 'error' | 'escaped' | 'terminated'
export type TaskStatus = 'queued' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'failed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type DecisionStatus = 'proposed' | 'approved' | 'rejected' | 'overridden' | 'executed'
export type DecisionCategory = 'action' | 'resource' | 'escalation' | 'strategy' | 'system'
export type EscalationType = 'clarification' | 'approval' | 'error' | 'edge_case' | 'policy_violation'
export type EscalationStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed'
export type EscalationUrgency = 'low' | 'normal' | 'high' | 'critical'
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
  | 'system.config_changed'
export type MessageType =
  | 'spawn.request'
  | 'spawn.response'
  | 'task.assign'
  | 'task.accept'
  | 'task.reject'
  | 'task.progress'
  | 'task.complete'
  | 'task.fail'
  | 'decision.propose'
  | 'decision.confirm'
  | 'decision.override'
  | 'escalate.request'
  | 'escalate.response'
  | 'message.direct'
  | 'message.broadcast'
  | 'system.ping'
  | 'system.pong'
  | 'system.config.update'
  | 'system.error'
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationType = 'task_assigned' | 'escalation_received' | 'decision_required' | 'system_alert' | 'info' | 'success' | 'warning' | 'error'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type ChatMessageRole = 'user' | 'agent' | 'system'
export type MetaAgentIntent = 'status' | 'assign' | 'create_issue' | 'query' | 'spawn' | 'terminate' | 'pause' | 'resume' | 'escalate' | 'broadcast' | 'unknown'
export type MetaAgentCommandStatus = 'processing' | 'completed' | 'failed' | 'rejected' | 'pending_confirmation'

// ============================================================================
// Database Interface
// ============================================================================

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          status: 'active' | 'suspended' | 'deleted'
          config: Json
          limits: Json
          plan: string
          billing_status: string | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_steps: Json
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          subscription_status: string
          current_tier: string
          trial_ends_at: string | null
          current_period_starts_at: string | null
          current_period_ends_at: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status?: 'active' | 'suspended' | 'deleted'
          config?: Json
          limits?: Json
          plan?: string
          billing_status?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_steps?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          subscription_status?: string
          current_tier?: string
          trial_ends_at?: string | null
          current_period_starts_at?: string | null
          current_period_ends_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          status?: 'active' | 'suspended' | 'deleted'
          config?: Json
          limits?: Json
          plan?: string
          billing_status?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_steps?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          subscription_status?: string
          current_tier?: string
          trial_ends_at?: string | null
          current_period_starts_at?: string | null
          current_period_ends_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          auth_id: string | null
          email: string
          name: string | null
          avatar_url: string | null
          role: 'owner' | 'admin' | 'member' | 'viewer'
          preferences: Json
          notification_settings: Json
          status: 'active' | 'inactive' | 'suspended'
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          auth_id?: string | null
          email: string
          name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          preferences?: Json
          notification_settings?: Json
          status?: 'active' | 'inactive' | 'suspended'
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          auth_id?: string | null
          email?: string
          name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          preferences?: Json
          notification_settings?: Json
          status?: 'active' | 'inactive' | 'suspended'
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          tenant_id: string
          name: string
          slug: string | null
          role: AgentRole
          avatar_url: string | null
          description: string | null
          parent_id: string | null
          root_id: string | null
          depth: number
          status: AgentStatus
          status_reason: string | null
          capabilities: string[]
          config: Json
          llm_config: Json
          limits: Json
          session_id: string | null
          current_task_id: string | null
          stats: Json
          created_at: string
          updated_at: string
          activated_at: string | null
          terminated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          slug?: string | null
          role?: AgentRole
          avatar_url?: string | null
          description?: string | null
          parent_id?: string | null
          root_id?: string | null
          depth?: number
          status?: AgentStatus
          status_reason?: string | null
          capabilities?: string[]
          config?: Json
          llm_config?: Json
          limits?: Json
          session_id?: string | null
          current_task_id?: string | null
          stats?: Json
          created_at?: string
          updated_at?: string
          activated_at?: string | null
          terminated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          slug?: string | null
          role?: AgentRole
          avatar_url?: string | null
          description?: string | null
          parent_id?: string | null
          root_id?: string | null
          depth?: number
          status?: AgentStatus
          status_reason?: string | null
          capabilities?: string[]
          config?: Json
          llm_config?: Json
          limits?: Json
          session_id?: string | null
          current_task_id?: string | null
          stats?: Json
          created_at?: string
          updated_at?: string
          activated_at?: string | null
          terminated_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          tenant_id: string
          title: string
          description: string | null
          type: string
          assignee_id: string | null
          assigner_id: string | null
          status: TaskStatus
          priority: TaskPriority
          parent_task_id: string | null
          depth: number
          inputs: Json
          expected_outputs: Json
          outputs: Json | null
          deadline_at: string | null
          started_at: string | null
          completed_at: string | null
          progress_percent: number
          current_step: string | null
          cost_usd: number
          tokens_used: number
          created_at: string
          updated_at: string
          search_vector: unknown | null
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          description?: string | null
          type?: string
          assignee_id?: string | null
          assigner_id?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          parent_task_id?: string | null
          depth?: number
          inputs?: Json
          expected_outputs?: Json
          outputs?: Json | null
          deadline_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          progress_percent?: number
          current_step?: string | null
          cost_usd?: number
          tokens_used?: number
          created_at?: string
          updated_at?: string
          search_vector?: unknown | null
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          description?: string | null
          type?: string
          assignee_id?: string | null
          assigner_id?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          parent_task_id?: string | null
          depth?: number
          inputs?: Json
          expected_outputs?: Json
          outputs?: Json | null
          deadline_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          progress_percent?: number
          current_step?: string | null
          cost_usd?: number
          tokens_used?: number
          created_at?: string
          updated_at?: string
          search_vector?: unknown | null
        }
      }
      task_dependencies: {
        Row: {
          id: string
          tenant_id: string
          task_id: string
          depends_on_task_id: string
          dependency_type: 'blocks' | 'requires' | 'optional'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          task_id: string
          depends_on_task_id: string
          dependency_type?: 'blocks' | 'requires' | 'optional'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          task_id?: string
          depends_on_task_id?: string
          dependency_type?: 'blocks' | 'requires' | 'optional'
          created_at?: string
        }
      }
      decisions: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          task_id: string | null
          category: DecisionCategory
          title: string
          description: string | null
          proposed_action: Json
          executed_action: Json | null
          reasoning: Json
          self_authorized: boolean
          required_approval_from: string | null
          status: DecisionStatus
          overridden_by: string | null
          override_reason: string | null
          overridden_at: string | null
          outcome: Json | null
          proposed_at: string
          decided_at: string | null
          executed_at: string | null
          immutable: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          task_id?: string | null
          category: DecisionCategory
          title: string
          description?: string | null
          proposed_action: Json
          executed_action?: Json | null
          reasoning?: Json
          self_authorized?: boolean
          required_approval_from?: string | null
          status?: DecisionStatus
          overridden_by?: string | null
          override_reason?: string | null
          overridden_at?: string | null
          outcome?: Json | null
          proposed_at?: string
          decided_at?: string | null
          executed_at?: string | null
          immutable?: boolean
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          task_id?: string | null
          category?: DecisionCategory
          title?: string
          description?: string | null
          proposed_action?: Json
          executed_action?: Json | null
          reasoning?: Json
          self_authorized?: boolean
          required_approval_from?: string | null
          status?: DecisionStatus
          overridden_by?: string | null
          override_reason?: string | null
          overridden_at?: string | null
          outcome?: Json | null
          proposed_at?: string
          decided_at?: string | null
          executed_at?: string | null
          immutable?: boolean
        }
      }
      escalations: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          task_id: string | null
          type: EscalationType
          urgency: EscalationUrgency
          status: EscalationStatus
          title: string
          description: string
          situation_context: Json
          question: Json
          agent_analysis: Json
          resolved_by: string | null
          resolution_type: string | null
          resolution_answer: string | null
          resolution_resources: Json | null
          learning_notes: string | null
          sla_deadline_at: string | null
          resolved_at: string | null
          time_to_resolve_seconds: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          task_id?: string | null
          type: EscalationType
          urgency?: EscalationUrgency
          status?: EscalationStatus
          title: string
          description: string
          situation_context?: Json
          question?: Json
          agent_analysis?: Json
          resolved_by?: string | null
          resolution_type?: string | null
          resolution_answer?: string | null
          resolution_resources?: Json | null
          learning_notes?: string | null
          sla_deadline_at?: string | null
          resolved_at?: string | null
          time_to_resolve_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          task_id?: string | null
          type?: EscalationType
          urgency?: EscalationUrgency
          status?: EscalationStatus
          title?: string
          description?: string
          situation_context?: Json
          question?: Json
          agent_analysis?: Json
          resolved_by?: string | null
          resolution_type?: string | null
          resolution_answer?: string | null
          resolution_resources?: Json | null
          learning_notes?: string | null
          sla_deadline_at?: string | null
          resolved_at?: string | null
          time_to_resolve_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          tenant_id: string
          type: ActivityType
          category: string
          actor_type: 'agent' | 'user' | 'system'
          actor_id: string
          target_type: string | null
          target_id: string | null
          title: string
          description: string | null
          metadata: Json
          agent_id: string | null
          task_id: string | null
          sequence_number: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: ActivityType
          category: string
          actor_type: 'agent' | 'user' | 'system'
          actor_id: string
          target_type?: string | null
          target_id?: string | null
          title: string
          description?: string | null
          metadata?: Json
          agent_id?: string | null
          task_id?: string | null
          sequence_number?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: ActivityType
          category?: string
          actor_type?: 'agent' | 'user' | 'system'
          actor_id?: string
          target_type?: string | null
          target_id?: string | null
          title?: string
          description?: string | null
          metadata?: Json
          agent_id?: string | null
          task_id?: string | null
          sequence_number?: number
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          tenant_id: string
          protocol_version: string
          message_type: MessageType
          from_agent_id: string | null
          to_agent_id: string | null
          to_broadcast: boolean
          thread_id: string | null
          correlation_id: string | null
          payload: Json
          priority: MessagePriority
          requires_ack: boolean
          acked_at: string | null
          trace: Json
          expires_at: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          protocol_version?: string
          message_type: MessageType
          from_agent_id?: string | null
          to_agent_id?: string | null
          to_broadcast?: boolean
          thread_id?: string | null
          correlation_id?: string | null
          payload: Json
          priority?: MessagePriority
          requires_ack?: boolean
          acked_at?: string | null
          trace?: Json
          expires_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          protocol_version?: string
          message_type?: MessageType
          from_agent_id?: string | null
          to_agent_id?: string | null
          to_broadcast?: boolean
          thread_id?: string | null
          correlation_id?: string | null
          payload?: Json
          priority?: MessagePriority
          requires_ack?: boolean
          acked_at?: string | null
          trace?: Json
          expires_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      agent_sessions: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          started_at: string
          ended_at: string | null
          context: Json
          message_history: Json
          runtime_version: string | null
          environment: string | null
          tokens_used: number
          cost_usd: number
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          started_at?: string
          ended_at?: string | null
          context?: Json
          message_history?: Json
          runtime_version?: string | null
          environment?: string | null
          tokens_used?: number
          cost_usd?: number
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          started_at?: string
          ended_at?: string | null
          context?: Json
          message_history?: Json
          runtime_version?: string | null
          environment?: string | null
          tokens_used?: number
          cost_usd?: number
        }
      }
      analytics_daily: {
        Row: {
          id: string
          tenant_id: string
          date: string
          tasks_created: number
          tasks_completed: number
          tasks_failed: number
          avg_task_duration_seconds: number | null
          active_agents: number
          agent_spawns: number
          agent_terminations: number
          decisions_made: number
          decisions_overridden: number
          escalations_created: number
          escalations_resolved: number
          avg_resolution_time_seconds: number | null
          total_cost_usd: number
          custom_metrics: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          date: string
          tasks_created?: number
          tasks_completed?: number
          tasks_failed?: number
          avg_task_duration_seconds?: number | null
          active_agents?: number
          agent_spawns?: number
          agent_terminations?: number
          decisions_made?: number
          decisions_overridden?: number
          escalations_created?: number
          escalations_resolved?: number
          avg_resolution_time_seconds?: number | null
          total_cost_usd?: number
          custom_metrics?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          date?: string
          tasks_created?: number
          tasks_completed?: number
          tasks_failed?: number
          avg_task_duration_seconds?: number | null
          active_agents?: number
          agent_spawns?: number
          agent_terminations?: number
          decisions_made?: number
          decisions_overridden?: number
          escalations_created?: number
          escalations_resolved?: number
          avg_resolution_time_seconds?: number | null
          total_cost_usd?: number
          custom_metrics?: Json
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          tenant_id: string
          uploaded_by_agent_id: string | null
          uploaded_by_user_id: string | null
          task_id: string | null
          original_name: string | null
          storage_path: string
          content_type: string | null
          size_bytes: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          uploaded_by_agent_id?: string | null
          uploaded_by_user_id?: string | null
          task_id?: string | null
          original_name?: string | null
          storage_path: string
          content_type?: string | null
          size_bytes?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          uploaded_by_agent_id?: string | null
          uploaded_by_user_id?: string | null
          task_id?: string | null
          original_name?: string | null
          storage_path?: string
          content_type?: string | null
          size_bytes?: number | null
          metadata?: Json
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          type: NotificationType
          title: string
          message: string
          action_url: string | null
          action_label: string | null
          related_entity_type: string | null
          related_entity_id: string | null
          is_read: boolean
          read_at: string | null
          metadata: Json
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          type?: NotificationType
          title: string
          message: string
          action_url?: string | null
          action_label?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          read_at?: string | null
          metadata?: Json
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          type?: NotificationType
          title?: string
          message?: string
          action_url?: string | null
          action_label?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          read_at?: string | null
          metadata?: Json
          created_at?: string
          expires_at?: string | null
        }
      }
      notification_preferences: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          notification_type: NotificationType
          channels: Json
          min_priority: NotificationPriority
          quiet_hours: Json | null
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          notification_type: NotificationType
          channels?: Json
          min_priority?: NotificationPriority
          quiet_hours?: Json | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          notification_type?: NotificationType
          channels?: Json
          min_priority?: NotificationPriority
          quiet_hours?: Json | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_performance_daily: {
        Row: {
          tenant_id: string
          agent_id: string
          date: string
          agent_name: string
          agent_role: string
          agent_status: string
          tasks_created: number
          tasks_completed: number
          tasks_failed: number
          tasks_cancelled: number
          success_rate: number
          avg_task_duration_seconds: number | null
          total_cost_usd: number
          total_tokens_used: number
          decisions_made: number
          decisions_overridden: number
          override_rate: number
          avg_confidence: number | null
          escalations_raised: number
          escalations_resolved_same_day: number
          avg_resolution_time_seconds: number | null
          refreshed_at: string
        }
        Insert: never
        Update: never
      }
      task_metrics_hourly: {
        Row: {
          tenant_id: string
          hour: string
          avg_queued_duration_seconds: number | null
          avg_processing_duration_seconds: number | null
          avg_total_duration_seconds: number | null
          blocked_tasks_count: number
          avg_blocked_duration_seconds: number | null
          status_breakdown: Json | null
          hourly_total_cost_usd: number
          hourly_total_tasks: number
          refreshed_at: string
        }
        Insert: never
        Update: never
      }
      agent_configs: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          config: Json
          version_id: string | null
          version_number: number
          is_valid: boolean
          validation_errors: Json
          last_tested_at: string | null
          last_test_result: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          config?: Json
          version_id?: string | null
          version_number?: number
          is_valid?: boolean
          validation_errors?: Json
          last_tested_at?: string | null
          last_test_result?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          config?: Json
          version_id?: string | null
          version_number?: number
          is_valid?: boolean
          validation_errors?: Json
          last_tested_at?: string | null
          last_test_result?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_config_versions: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          version_number: number
          name: string | null
          description: string | null
          config: Json
          change_type: string
          changed_by: string | null
          change_summary: Json
          is_valid: boolean
          validation_errors: Json
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          version_number: number
          name?: string | null
          description?: string | null
          config: Json
          change_type?: string
          changed_by?: string | null
          change_summary?: Json
          is_valid?: boolean
          validation_errors?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          version_number?: number
          name?: string | null
          description?: string | null
          config?: Json
          change_type?: string
          changed_by?: string | null
          change_summary?: Json
          is_valid?: boolean
          validation_errors?: Json
          created_at?: string
        }
      }
      agent_templates: {
        Row: {
          id: string
          tenant_id: string | null
          name: string
          slug: string
          description: string | null
          category: string
          icon: string | null
          color: string
          config: Json
          capabilities: string[]
          recommended_model: string | null
          recommended_tools: string[]
          is_system: boolean
          is_active: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          name: string
          slug: string
          description?: string | null
          category?: string
          icon?: string | null
          color?: string
          config: Json
          capabilities?: string[]
          recommended_model?: string | null
          recommended_tools?: string[]
          is_system?: boolean
          is_active?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          category?: string
          icon?: string | null
          color?: string
          config?: Json
          capabilities?: string[]
          recommended_model?: string | null
          recommended_tools?: string[]
          is_system?: boolean
          is_active?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      config_test_results: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          config_version_id: string | null
          test_input: string
          test_output: string | null
          success: boolean
          response_time_ms: number | null
          tokens_used: number | null
          cost_usd: number | null
          error_message: string | null
          error_details: Json | null
          model_used: string | null
          raw_response: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          config_version_id?: string | null
          test_input: string
          test_output?: string | null
          success?: boolean
          response_time_ms?: number | null
          tokens_used?: number | null
          cost_usd?: number | null
          error_message?: string | null
          error_details?: Json | null
          model_used?: string | null
          raw_response?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          config_version_id?: string | null
          test_input?: string
          test_output?: string | null
          success?: boolean
          response_time_ms?: number | null
          tokens_used?: number | null
          cost_usd?: number | null
          error_message?: string | null
          error_details?: Json | null
          model_used?: string | null
          raw_response?: Json | null
          created_at?: string
        }
      }
      tenant_settings: {
        Row: {
          id: string
          tenant_id: string
          rate_limit_requests_per_minute: number
          rate_limit_window_seconds: number
          rate_limit_enabled: boolean
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          rate_limit_requests_per_minute?: number
          rate_limit_window_seconds?: number
          rate_limit_enabled?: boolean
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          rate_limit_requests_per_minute?: number
          rate_limit_window_seconds?: number
          rate_limit_enabled?: boolean
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          agent_id: string
          title: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          agent_id: string
          title?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          agent_id?: string
          title?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          role: ChatMessageRole
          content: string
          metadata: Json
          is_bookmarked: boolean
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: ChatMessageRole
          content: string
          metadata?: Json
          is_bookmarked?: boolean
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: ChatMessageRole
          content?: string
          metadata?: Json
          is_bookmarked?: boolean
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
      }
      meta_agent_sessions: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          title: string | null
          status: string
          context: Json
          message_count: number
          command_count: number
          started_at: string
          last_activity_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          title?: string | null
          status?: string
          context?: Json
          message_count?: number
          command_count?: number
          started_at?: string
          last_activity_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          title?: string | null
          status?: string
          context?: Json
          message_count?: number
          command_count?: number
          started_at?: string
          last_activity_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meta_agent_commands: {
        Row: {
          id: string
          tenant_id: string
          session_id: string
          user_id: string
          raw_message: string
          intent: MetaAgentIntent
          intent_confidence: number
          extracted_entities: Json
          status: MetaAgentCommandStatus
          action_type: string | null
          action_target_id: string | null
          action_target_type: string | null
          action_payload: Json | null
          result: Json | null
          result_summary: string | null
          error_message: string | null
          error_details: Json | null
          response_message: string
          response_metadata: Json
          processing_time_ms: number | null
          tokens_used: number | null
          github_issue_url: string | null
          github_issue_number: number | null
          created_at: string
          processed_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          session_id: string
          user_id: string
          raw_message: string
          intent: MetaAgentIntent
          intent_confidence: number
          extracted_entities?: Json
          status?: MetaAgentCommandStatus
          action_type?: string | null
          action_target_id?: string | null
          action_target_type?: string | null
          action_payload?: Json | null
          result?: Json | null
          result_summary?: string | null
          error_message?: string | null
          error_details?: Json | null
          response_message: string
          response_metadata?: Json
          processing_time_ms?: number | null
          tokens_used?: number | null
          github_issue_url?: string | null
          github_issue_number?: number | null
          created_at?: string
          processed_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          session_id?: string
          user_id?: string
          raw_message?: string
          intent?: MetaAgentIntent
          intent_confidence?: number
          extracted_entities?: Json
          status?: MetaAgentCommandStatus
          action_type?: string | null
          action_target_id?: string | null
          action_target_type?: string | null
          action_payload?: Json | null
          result?: Json | null
          result_summary?: string | null
          error_message?: string | null
          error_details?: Json | null
          response_message?: string
          response_metadata?: Json
          processing_time_ms?: number | null
          tokens_used?: number | null
          github_issue_url?: string | null
          github_issue_number?: number | null
          created_at?: string
          processed_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      llm_costs: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          task_id: string | null
          model: string
          provider: string
          input_tokens: number
          output_tokens: number
          total_tokens: number
          input_cost_usd: number
          output_cost_usd: number
          total_cost_usd: number
          request_type: string
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          task_id?: string | null
          model: string
          provider: string
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          input_cost_usd?: number
          output_cost_usd?: number
          total_cost_usd?: number
          request_type?: string
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          task_id?: string | null
          model?: string
          provider?: string
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          input_cost_usd?: number
          output_cost_usd?: number
          total_cost_usd?: number
          request_type?: string
          status?: string
          error_message?: string | null
          created_at?: string
        }
      }
      team_invitations: {
        Row: {
          id: string
          tenant_id: string
          email: string
          role: string
          invited_by: string
          token: string
          expires_at: string
          status: string
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          role?: string
          invited_by: string
          token: string
          expires_at?: string
          status?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          role?: string
          invited_by?: string
          token?: string
          expires_at?: string
          status?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_tiers: {
        Row: {
          id: string
          name: string
          description: string | null
          stripe_price_id: string
          stripe_price_id_live: string | null
          price_monthly: number
          agent_limit: number
          task_limit: number | null
          storage_limit_mb: number | null
          features: Json
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          stripe_price_id: string
          stripe_price_id_live?: string | null
          price_monthly: number
          agent_limit: number
          task_limit?: number | null
          storage_limit_mb?: number | null
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          stripe_price_id?: string
          stripe_price_id_live?: string | null
          price_monthly?: number
          agent_limit?: number
          task_limit?: number | null
          storage_limit_mb?: number | null
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      billing_events: {
        Row: {
          id: string
          tenant_id: string
          event_type: string
          stripe_event_id: string | null
          stripe_event_type: string | null
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          event_type: string
          stripe_event_id?: string | null
          stripe_event_type?: string | null
          data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          event_type?: string
          stripe_event_id?: string | null
          stripe_event_type?: string | null
          data?: Json
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          tenant_id: string
          stripe_invoice_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          amount_due: number
          amount_paid: number
          currency: string
          status: string
          invoice_pdf_url: string | null
          hosted_invoice_url: string | null
          period_start: string | null
          period_end: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          stripe_invoice_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          amount_due: number
          amount_paid?: number
          currency?: string
          status: string
          invoice_pdf_url?: string | null
          hosted_invoice_url?: string | null
          period_start?: string | null
          period_end?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          stripe_invoice_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          amount_due?: number
          amount_paid?: number
          currency?: string
          status?: string
          invoice_pdf_url?: string | null
          hosted_invoice_url?: string | null
          period_start?: string | null
          period_end?: string | null
          paid_at?: string | null
          created_at?: string
        }
      }
      webhook_endpoints: {
        Row: {
          id: string
          tenant_id: string
          url: string
          description: string | null
          events: string[]
          secret: string
          is_active: boolean
          metadata: Json
          consecutive_failures: number
          disabled_at: string | null
          disabled_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          url: string
          description?: string | null
          events?: string[]
          secret: string
          is_active?: boolean
          metadata?: Json
          consecutive_failures?: number
          disabled_at?: string | null
          disabled_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          url?: string
          description?: string | null
          events?: string[]
          secret?: string
          is_active?: boolean
          metadata?: Json
          consecutive_failures?: number
          disabled_at?: string | null
          disabled_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_deliveries: {
        Row: {
          id: string
          tenant_id: string
          endpoint_id: string
          event_type: string
          event_id: string
          payload: Json
          status: string
          response_status: number | null
          response_body: string | null
          response_time_ms: number | null
          attempt_count: number
          max_attempts: number
          next_retry_at: string | null
          last_attempted_at: string | null
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          endpoint_id: string
          event_type: string
          event_id: string
          payload: Json
          status?: string
          response_status?: number | null
          response_body?: string | null
          response_time_ms?: number | null
          attempt_count?: number
          max_attempts?: number
          next_retry_at?: string | null
          last_attempted_at?: string | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          endpoint_id?: string
          event_type?: string
          event_id?: string
          payload?: Json
          status?: string
          response_status?: number | null
          response_body?: string | null
          response_time_ms?: number | null
          attempt_count?: number
          max_attempts?: number
          next_retry_at?: string | null
          last_attempted_at?: string | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      security_audit_log: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          ip_address: string | null
          user_agent: string | null
          details: Json
          risk_score: number
          risk_factors: string[] | null
          success: boolean
          error_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json
          risk_score?: number
          risk_factors?: string[] | null
          success?: boolean
          error_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json
          risk_score?: number
          risk_factors?: string[] | null
          success?: boolean
          error_code?: string | null
          created_at?: string
        }
      }
      agent_task_queue: {
        Row: {
          id: string
          tenant_id: string
          task_id: string
          agent_id: string | null
          status: string
          claimed_at: string | null
          started_at: string | null
          completed_at: string | null
          attempt_count: number
          max_attempts: number
          last_error: string | null
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          task_id: string
          agent_id?: string | null
          status?: string
          claimed_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          attempt_count?: number
          max_attempts?: number
          last_error?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          task_id?: string
          agent_id?: string | null
          status?: string
          claimed_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          attempt_count?: number
          max_attempts?: number
          last_error?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      agent_decision_log: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          session_id: string
          task_id: string | null
          decision_id: string | null
          category: string
          action_type: string
          action_params: Json
          reasoning: string | null
          confidence: number
          outcome: Json | null
          success: boolean | null
          latency_ms: number | null
          tokens_used: number | null
          cost_usd: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          session_id: string
          task_id?: string | null
          decision_id?: string | null
          category: string
          action_type: string
          action_params?: Json
          reasoning?: string | null
          confidence: number
          outcome?: Json | null
          success?: boolean | null
          latency_ms?: number | null
          tokens_used?: number | null
          cost_usd?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          session_id?: string
          task_id?: string | null
          decision_id?: string | null
          category?: string
          action_type?: string
          action_params?: Json
          reasoning?: string | null
          confidence?: number
          outcome?: Json | null
          success?: boolean | null
          latency_ms?: number | null
          tokens_used?: number | null
          cost_usd?: number | null
          created_at?: string
        }
      }
      agent_execution_history: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          session_id: string
          task_id: string | null
          execution_type: string
          execution_id: string
          input_payload: Json | null
          output_payload: Json | null
          status: string
          error_message: string | null
          started_at: string
          completed_at: string | null
          duration_ms: number | null
          tokens_input: number
          tokens_output: number
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          session_id: string
          task_id?: string | null
          execution_type: string
          execution_id: string
          input_payload?: Json | null
          output_payload?: Json | null
          status?: string
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          tokens_input?: number
          tokens_output?: number
          cost_usd?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          session_id?: string
          task_id?: string | null
          execution_type?: string
          execution_id?: string
          input_payload?: Json | null
          output_payload?: Json | null
          status?: string
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          tokens_input?: number
          tokens_output?: number
          cost_usd?: number
          created_at?: string
        }
      }
      message_delivery: {
        Row: {
          id: string
          tenant_id: string
          message_id: string
          status: string
          attempt_count: number
          last_attempt_at: string | null
          error_message: string | null
          acked_at: string | null
          acked_by_agent_id: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          message_id: string
          status?: string
          attempt_count?: number
          last_attempt_at?: string | null
          error_message?: string | null
          acked_at?: string | null
          acked_by_agent_id?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          message_id?: string
          status?: string
          attempt_count?: number
          last_attempt_at?: string | null
          error_message?: string | null
          acked_at?: string | null
          acked_by_agent_id?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_lifecycle_events: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          event_type: string
          previous_state: string | null
          new_state: string | null
          triggered_by: string | null
          triggered_by_type: string | null
          reason: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          event_type: string
          previous_state?: string | null
          new_state?: string | null
          triggered_by?: string | null
          triggered_by_type?: string | null
          reason?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          event_type?: string
          previous_state?: string | null
          new_state?: string | null
          triggered_by?: string | null
          triggered_by_type?: string | null
          reason?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_tenant_context: {
        Args: { tenant_id: string }
        Returns: void
      }
      refresh_agent_performance_daily: {
        Args: Record<string, never>
        Returns: void
      }
      refresh_task_metrics_hourly: {
        Args: Record<string, never>
        Returns: void
      }
      refresh_all_analytics_views: {
        Args: Record<string, never>
        Returns: void
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: Record<string, never>
        Returns: number
      }
      get_unread_notification_count: {
        Args: { p_user_id?: string }
        Returns: number
      }
      get_agent_performance_summary: {
        Args: {
          p_tenant_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Array<{
          agent_id: string
          agent_name: string
          agent_role: string
          total_tasks_completed: number
          total_tasks_failed: number
          success_rate: number
          avg_task_duration_seconds: number
          total_cost_usd: number
          total_escalations: number
          override_rate: number
          trend_direction: string
        }>
      }
      get_roi_metrics: {
        Args: {
          p_tenant_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Array<{
          total_tasks_completed: number
          total_cost_usd: number
          cost_per_task: number
          tasks_per_dollar: number
          estimated_hours_saved: number
          avg_human_cost_per_hour: number
          estimated_value_generated: number
          roi_percentage: number
        }>
      }
      identify_bottlenecks: {
        Args: {
          p_tenant_id: string
          p_hours_back: number
        }
        Returns: Array<{
          bottleneck_type: string
          description: string
          affected_count: number
          avg_wait_time_seconds: number
          severity: string
          recommendation: string
        }>
      }
      get_workload_heatmap: {
        Args: {
          p_tenant_id: string
          p_days: number
        }
        Returns: Array<{
          day_of_week: number
          hour_of_day: number
          tasks_created: number
          tasks_completed: number
          avg_active_agents: number
        }>
      }
    }
    Enums: {
      agent_role: AgentRole
      agent_status: AgentStatus
      task_status: TaskStatus
      task_priority: TaskPriority
      decision_status: DecisionStatus
      decision_category: DecisionCategory
      escalation_type: EscalationType
      escalation_status: EscalationStatus
      escalation_urgency: EscalationUrgency
      activity_type: ActivityType
      message_type: MessageType
      message_priority: MessagePriority
      notification_type: NotificationType
      notification_priority: NotificationPriority
      chat_message_role: ChatMessageRole
      meta_agent_intent: MetaAgentIntent
      meta_agent_command_status: MetaAgentCommandStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================================
// Helper Types for Supabase Client
// ============================================================================

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

// ============================================================================
// Supabase JS v2.95+ Compatibility
// ============================================================================
// The auto-generated Database type lacks `Relationships` on tables, which is
// required by GenericTable in @supabase/supabase-js v2.95+. Without it,
// Database['public'] doesn't extend GenericSchema, causing Schema to resolve
// to `never` and breaking typed .rpc() / .from() calls.
//
// TypedDatabase adds `Relationships: []` to every table so that
// SupabaseClient<TypedDatabase> resolves Schema correctly.

type AddRelationships<T> = {
  [K in keyof T]: T[K] & { Relationships: [] }
}

export type TypedDatabase = {
  public: {
    Tables: AddRelationships<Database['public']['Tables']>
    Views: Database['public']['Views']
    Functions: Database['public']['Functions']
    Enums: Database['public']['Enums']
    CompositeTypes: Database['public']['CompositeTypes']
  }
}
