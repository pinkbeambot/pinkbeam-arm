// Database types placeholder
// This file should be generated from your Supabase schema

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
      users: {
        Row: {
          id: string;
          auth_id: string;
          tenant_id: string;
          email: string;
          name?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      tenants: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Functions: {
      set_tenant_context: {
        Args: { tenant_id: string };
        Returns: void;
      };
    };
  };
}
