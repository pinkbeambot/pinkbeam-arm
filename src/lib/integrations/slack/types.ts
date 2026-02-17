/**
 * Slack Integration Types
 */

// ============================================================================
// Slack Webhook Configuration
// ============================================================================

export interface SlackWebhook {
  id: string;
  tenant_id: string;
  webhook_url: string;
  channel?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_tested_at?: string | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
  consecutive_failures: number;
}

export interface SlackWebhookInput {
  webhook_url: string;
  channel?: string;
}

// ============================================================================
// Slack Message Blocks
// ============================================================================

export interface SlackTextBlock {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackSectionBlock {
  type: 'section';
  text?: SlackTextBlock;
  fields?: SlackTextBlock[];
  accessory?: unknown;
}

export interface SlackHeaderBlock {
  type: 'header';
  text: {
    type: 'plain_text';
    text: string;
    emoji: boolean;
  };
}

export interface SlackDividerBlock {
  type: 'divider';
}

export interface SlackContextBlock {
  type: 'context';
  elements: SlackTextBlock[];
}

export interface SlackActionsBlock {
  type: 'actions';
  elements: SlackButtonElement[];
}

export interface SlackButtonElement {
  type: 'button';
  text: {
    type: 'plain_text';
    text: string;
    emoji: boolean;
  };
  url?: string;
  action_id?: string;
  style?: 'primary' | 'danger';
}

export type SlackBlock = 
  | SlackHeaderBlock 
  | SlackSectionBlock 
  | SlackDividerBlock 
  | SlackContextBlock 
  | SlackActionsBlock;

// ============================================================================
// Slack Message
// ============================================================================

export interface SlackMessage {
  text: string; // Fallback text for notifications
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  mrkdwn?: boolean;
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackAttachmentField[];
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  actions?: SlackButtonElement[];
}

export interface SlackAttachmentField {
  title: string;
  value: string;
  short: boolean;
}

// ============================================================================
// Delivery Result
// ============================================================================

export interface SlackDeliveryResult {
  success: boolean;
  error?: string;
  response_time_ms: number;
}

// ============================================================================
// Template Data Types
// ============================================================================

export interface EscalationTemplateData {
  escalation_id: string;
  title: string;
  description?: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  type: string;
  agent_name?: string;
  agent_id?: string;
  task_title?: string;
  task_id?: string;
  app_url: string;
}

export interface TaskTemplateData {
  task_id: string;
  title: string;
  status: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignee_name?: string;
  error_message?: string;
  app_url: string;
}

export interface DecisionTemplateData {
  decision_id: string;
  title: string;
  category?: string;
  proposed_action?: string;
  hours_pending: number;
  agent_name?: string;
  deadline?: string;
  app_url: string;
}

export interface DailyDigestData {
  date: string;
  tenant_name: string;
  stats: {
    tasks_completed: number;
    tasks_failed: number;
    escalations_open: number;
    escalations_resolved: number;
    decisions_pending: number;
    decisions_resolved: number;
  };
  recent_escalations: Array<{
    id: string;
    title: string;
    urgency: string;
  }>;
  pending_decisions: Array<{
    id: string;
    title: string;
    hours_pending: number;
  }>;
  app_url: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface SlackWebhookResponse {
  data?: SlackWebhook;
  error?: string;
}

export interface SlackTestResponse {
  success: boolean;
  error?: string;
}

export interface SlackStatsResponse {
  data: {
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    average_response_time_ms: number;
    last_delivery_at: string | null;
  };
}
