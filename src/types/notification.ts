/**
 * Notification Types
 * 
 * Type definitions for the ARM notification system.
 * Supports: task_assigned, escalation_received, decision_required, system_alert
 */

// ============================================================================
// Notification Enums
// ============================================================================

export type NotificationType = 
  | 'task_assigned'
  | 'escalation_received' 
  | 'decision_required'
  | 'system_alert'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type NotificationChannel = 'in_app' | 'email' | 'webhook' | 'push';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Core Notification Interface
// ============================================================================

export interface Notification {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  
  // Notification content
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  
  // Read status
  is_read: boolean;
  read_at?: string | null;
  
  // Action links
  action_url?: string | null;
  action_label?: string | null;
  
  // Related entities
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  
  // Metadata for context
  metadata?: {
    // Task-specific
    task_id?: string;
    task_title?: string;
    assigner_name?: string;
    
    // Escalation-specific
    escalation_id?: string;
    escalation_urgency?: 'low' | 'normal' | 'high' | 'critical';
    agent_name?: string;
    
    // Decision-specific
    decision_id?: string;
    decision_title?: string;
    deadline?: string;
    
    // System alert-specific
    alert_code?: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    system_component?: string;
    
    // Generic
    [key: string]: unknown;
  };
  
  // Delivery tracking
  channels_delivered?: NotificationChannel[];
  channels_failed?: NotificationChannel[];
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  expires_at?: string | null;
}

// ============================================================================
// Notification Filters
// ============================================================================

export interface NotificationFilters {
  is_read?: boolean;
  type?: NotificationType;
  entity_type?: string;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
  since?: string; // ISO date string
}

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreference {
  id: string;
  tenant_id: string;
  user_id: string;
  
  // Notification type being configured
  notification_type: NotificationType;
  
  // Channel preferences per type
  channels: {
    in_app: boolean;
    email: boolean;
    webhook: boolean;
    push: boolean;
  };
  
  // Priority threshold (only notify if priority >= threshold)
  min_priority: NotificationPriority;
  
  // Quiet hours (for email/push)
  quiet_hours?: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
    timezone: string;
  };
  
  // Type-specific settings
  settings?: {
    // For task_assigned: notify about sub-tasks?
    include_subtasks?: boolean;
    
    // For escalation_received: minimum urgency level
    min_escalation_urgency?: 'low' | 'normal' | 'high' | 'critical';
    
    // For decision_required: deadline warning threshold (hours)
    deadline_warning_hours?: number;
    
    // For system_alert: which components to monitor
    monitored_components?: string[];
  };
  
  created_at: string;
  updated_at: string;
}

// Default preferences for new users
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationType, Omit<NotificationPreference, 'id' | 'tenant_id' | 'user_id' | 'created_at' | 'updated_at'>> = {
  task_assigned: {
    notification_type: 'task_assigned',
    channels: { in_app: true, email: true, webhook: false, push: false },
    min_priority: 'normal',
    settings: { include_subtasks: true },
  },
  escalation_received: {
    notification_type: 'escalation_received',
    channels: { in_app: true, email: true, webhook: true, push: true },
    min_priority: 'high',
    settings: { min_escalation_urgency: 'normal' },
  },
  decision_required: {
    notification_type: 'decision_required',
    channels: { in_app: true, email: true, webhook: false, push: true },
    min_priority: 'high',
    settings: { deadline_warning_hours: 24 },
  },
  system_alert: {
    notification_type: 'system_alert',
    channels: { in_app: true, email: true, webhook: true, push: true },
    min_priority: 'normal',
    settings: { monitored_components: ['all'] },
  },
  // Legacy types for backward compatibility
  info: {
    notification_type: 'info',
    channels: { in_app: true, email: false, webhook: false, push: false },
    min_priority: 'low',
  },
  success: {
    notification_type: 'success',
    channels: { in_app: true, email: false, webhook: false, push: false },
    min_priority: 'low',
  },
  warning: {
    notification_type: 'warning',
    channels: { in_app: true, email: true, webhook: false, push: false },
    min_priority: 'normal',
  },
  error: {
    notification_type: 'error',
    channels: { in_app: true, email: true, webhook: true, push: true },
    min_priority: 'high',
  },
};

// ============================================================================
// Notification Settings Form Types
// ============================================================================

export interface NotificationSettingsFormData {
  preferences: Record<NotificationType, {
    channels: {
      in_app: boolean;
      email: boolean;
      webhook: boolean;
      push: boolean;
    };
    min_priority: NotificationPriority;
    settings?: NotificationPreference['settings'];
  }>;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  webhook_url?: string;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface NotificationWebSocketMessage {
  type: 'notification:new' | 'notification:read' | 'notification:delete' | 'notification:bulk_read';
  payload: {
    notification?: Notification;
    notification_id?: string;
    notification_ids?: string[];
    unread_count?: number;
  };
  timestamp: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    unread_count: number;
    total_count: number;
    filters: NotificationFilters;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationPreferenceResponse {
  data: NotificationPreference[];
  meta: {
    updated_at: string;
  };
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface NotificationDisplayProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAction?: (notification: Notification) => void;
  compact?: boolean;
}

export interface NotificationBellProps {
  className?: string;
  maxNotifications?: number;
}

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: string) => Promise<boolean>;
  onMarkAllAsRead: () => Promise<number>;
  onDelete: (id: string) => Promise<boolean>;
  onRefresh: () => void;
  maxNotifications?: number;
}
