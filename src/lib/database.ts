// Placeholder database types
// In a real implementation, this would be generated from the Supabase schema

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      tasks: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      activities: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      escalations: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      decisions: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      users: {
        Row: { auth_id: string; tenant_id: string } & Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      tenants: {
        Row: { id: string } & Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      agent_performance_daily: {
        Row: {
          tenant_id: string;
          agent_id: string;
          date: string;
          agent_name: string;
          agent_role: string;
          agent_status: string;
          tasks_created: number;
          tasks_completed: number;
          tasks_failed: number;
          tasks_cancelled: number;
          success_rate: number;
          avg_task_duration_seconds: number | null;
          total_cost_usd: number;
          total_tokens_used: number;
          decisions_made: number;
          decisions_overridden: number;
          override_rate: number;
          avg_confidence: number | null;
          escalations_raised: number;
          escalations_resolved_same_day: number;
          avg_resolution_time_seconds: number | null;
          refreshed_at: string;
        };
      };
      task_metrics_hourly: {
        Row: {
          tenant_id: string;
          hour: string;
          avg_queued_duration_seconds: number | null;
          avg_processing_duration_seconds: number | null;
          avg_total_duration_seconds: number | null;
          blocked_tasks_count: number;
          avg_blocked_duration_seconds: number | null;
          status_breakdown: Record<string, unknown> | null;
          hourly_total_cost_usd: number;
          hourly_total_tasks: number;
          refreshed_at: string;
        };
      };
    };
    Functions: {
      set_tenant_context: {
        Args: { tenant_id: string };
        Returns: void;
      };
      refresh_agent_performance_daily: {
        Args: Record<string, never>;
        Returns: void;
      };
      refresh_task_metrics_hourly: {
        Args: Record<string, never>;
        Returns: void;
      };
      refresh_all_analytics_views: {
        Args: Record<string, never>;
        Returns: void;
      };
      get_agent_performance_summary: {
        Args: {
          p_tenant_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Array<{
          agent_id: string;
          agent_name: string;
          agent_role: string;
          total_tasks_completed: number;
          total_tasks_failed: number;
          success_rate: number;
          avg_task_duration_seconds: number;
          total_cost_usd: number;
          total_escalations: number;
          override_rate: number;
          trend_direction: string;
        }>;
      };
      get_roi_metrics: {
        Args: {
          p_tenant_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Array<{
          total_tasks_completed: number;
          total_cost_usd: number;
          cost_per_task: number;
          tasks_per_dollar: number;
          estimated_hours_saved: number;
          avg_human_cost_per_hour: number;
          estimated_value_generated: number;
          roi_percentage: number;
        }>;
      };
      identify_bottlenecks: {
        Args: {
          p_tenant_id: string;
          p_hours_back: number;
        };
        Returns: Array<{
          bottleneck_type: string;
          description: string;
          affected_count: number;
          avg_wait_time_seconds: number;
          severity: string;
          recommendation: string;
        }>;
      };
      get_workload_heatmap: {
        Args: {
          p_tenant_id: string;
          p_days: number;
        };
        Returns: Array<{
          day_of_week: number;
          hour_of_day: number;
          tasks_created: number;
          tasks_completed: number;
          avg_active_agents: number;
        }>;
      };
    };
  };
}
