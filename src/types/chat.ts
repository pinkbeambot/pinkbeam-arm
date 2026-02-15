/**
 * Chat Interface Types
 * Issue: #48 - Chat Interface
 */

// ============================================================================
// Core Chat Types
// ============================================================================

export type ChatMessageRole = 'user' | 'agent' | 'system';

export interface Chat {
  id: string;
  tenant_id: string;
  user_id: string;
  agent_id: string;
  title?: string;
  metadata: ChatMetadata;
  created_at: string;
  updated_at: string;
  // Extended fields from get_user_chats
  agent?: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
    status: string;
  };
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: ChatMessageRole;
  content: string;
  metadata: MessageMetadata;
  is_bookmarked?: boolean;
  created_at: string;
  updated_at?: string;
  // Extended fields from get_chat_messages
  agent_name?: string;
  agent_avatar?: string;
}

export interface ChatSearchResult {
  id: string;
  chat_id: string;
  role: ChatMessageRole;
  content: string;
  snippet: string;
  is_bookmarked: boolean;
  created_at: string;
  agent_name: string;
  agent_avatar: string | null;
}

// ============================================================================
// Metadata Types
// ============================================================================

export interface ChatMetadata {
  [key: string]: unknown;
}

export interface MessageMetadata {
  intent?: 'query' | 'action' | 'clarification';
  context_refs?: {
    tasks?: string[];
    decisions?: string[];
    escalations?: string[];
  };
  action_result?: {
    success: boolean;
    action: string;
    data?: unknown;
  };
  processing_time_ms?: number;
  model_used?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateChatRequest {
  agent_id: string;
}

export interface CreateChatResponse {
  chat: Chat;
}

export interface GetChatMessagesRequest {
  limit?: number;
  before?: string; // ISO timestamp for pagination
}

export interface GetChatMessagesResponse {
  messages: ChatMessage[];
  has_more: boolean;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  agent_response?: ChatMessage;
}

export interface ListChatsResponse {
  chats: Chat[];
}

// ============================================================================
// Context Types (for agent response building)
// ============================================================================

export interface ChatContext {
  activities: ContextActivity[];
  tasks: ContextTask[];
  decisions: ContextDecision[];
  escalations: ContextEscalation[];
  agent: ContextAgent;
}

export interface ContextActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface ContextTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress_percent?: number;
}

export interface ContextDecision {
  id: string;
  title: string;
  status: string;
  confidence: number;
  created_at: string;
}

export interface ContextEscalation {
  id: string;
  title: string;
  urgency: string;
  status: string;
  created_at: string;
}

export interface ContextAgent {
  id: string;
  name: string;
  role: string;
  description?: string;
  status: string;
}

// ============================================================================
// UI Types
// ============================================================================

export interface ChatPanelProps {
  chatId: string | null;
  agentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ChatMessageProps {
  message: ChatMessage;
  isUser: boolean;
  agentName?: string;
  agentAvatar?: string;
  onDelete?: () => void;
}

export interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string | null;
  onSelectChat: (chatId: string) => void;
}

// ============================================================================
// Realtime Types
// ============================================================================

export interface ChatRealtimeMessage {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'chat_messages';
  record: ChatMessage;
  old_record?: ChatMessage;
}

export interface TypingIndicator {
  chat_id: string;
  is_typing: boolean;
  agent_id?: string;
}
