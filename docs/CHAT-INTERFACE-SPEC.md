## Feature: Chat Interface — CEO ↔ Agent Natural Language Interface

**Issue:** #17  
**Priority:** P1 (Major differentiator)  
**Assignee:** ENG-FE (after #43/#44 complete)  
**Estimated:** 2-3 dev sessions  
**Target:** v1.0 launch

---

## Vision

Enable the CEO to have natural language conversations with any AI agent. Ask questions, get updates, request work — all through chat. This is the **crown jewel differentiator** that makes ARM feel like managing a real workforce, not just monitoring dashboards.

**Key Value Props:**
- "Ask anything about your workforce" — agents have full context
- Natural language interface to complex operations
- Conversational history persists across sessions
- Foundation for future multi-agent rooms and command mode

---

## MVP Scope (v1.0)

### ✅ In Scope
- **Single-agent chat only** (per Richard: "Multi-agent rooms add coordination complexity")
- **Full context access** — tasks, decisions, escalations, activities
- **Chat-only mode** (no actions yet — architected for future)
- **Agent roster → click to chat** UI pattern
- **Message history** persistence
- **Real-time updates** via WebSocket

### ❌ Out of Scope (v1.1/v1.2)
- Multi-agent group chats
- Natural language commands ("Create task to...")
- Voice/chatbot interface
- Mobile app chat

---

## Technical Architecture

### 1. Data Model

**New Table: `agent_chats`**
```sql
CREATE TABLE agent_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id), -- CEO/auth user
  agent_id UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id, agent_id) -- One chat per user-agent pair
);
```

**New Table: `chat_messages`**
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES agent_chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- For future: intent, actions, context_refs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for fast message loading
  INDEX idx_chat_messages_chat_id_created (chat_id, created_at DESC)
);
```

**Metadata Schema (for future actions):**
```typescript
interface MessageMetadata {
  intent?: 'query' | 'action' | 'clarification'; // Future use
  contextRefs?: {
    tasks?: string[];
    decisions?: string[];
    escalations?: string[];
  };
  actionResult?: {
    success: boolean;
    action: string;
    data?: any;
  }; // Future use
}
```

### 2. Backend API Endpoints

**New File: `/src/app/api/chats/route.ts`**
```typescript
// GET /api/chats — List all chats for current user
// Returns: { chats: [{ id, agent: { id, name, avatar }, lastMessage, unreadCount, updatedAt }] }

// POST /api/chats — Create new chat with agent
// Body: { agentId: string }
// Returns: { chat: { id, agent, createdAt } }
```

**New File: `/src/app/api/chats/[id]/messages/route.ts`**
```typescript
// GET /api/chats/[id]/messages — Get messages for chat
// Query: { limit?: number, before?: timestamp } // Pagination
// Returns: { messages: [{ id, role, content, metadata, createdAt }] }

// POST /api/chats/[id]/messages — Send message
// Body: { content: string }
// Returns: { message: { id, role, content, createdAt } }
// Side effect: Trigger agent response via Edge Function
```

**New File: `/src/app/api/chats/[id]/messages/[messageId]/route.ts`**
```typescript
// DELETE /api/chats/[id]/messages/[messageId] — Delete message (user only)
```

### 3. Agent Response System (Edge Function)

**New Edge Function: `agent-chat-response`**

Triggered when user sends message. Flow:

1. **Fetch Context** (full access per Richard):
   ```typescript
   const context = await Promise.all([
     fetchRecentActivities(agentId, limit: 10),
     fetchActiveTasks(agentId),
     fetchRecentDecisions(agentId, limit: 5),
     fetchOpenEscalations(agentId),
     fetchAgentConfig(agentId),
   ]);
   ```

2. **Build System Prompt**:
   ```typescript
   const systemPrompt = `
   You are ${agent.name}, a ${agent.role} at Pink Beam.
   
   CURRENT CONTEXT:
   - Recent activities: ${context.activities.map(a => a.description).join('\n')}
   - Active tasks: ${context.tasks.map(t => t.title).join(', ')}
   - Recent decisions: ${context.decisions.map(d => d.summary).join('\n')}
   - Open escalations: ${context.escalations.length > 0 ? context.escalations.map(e => e.title).join(', ') : 'None'}
   
   INSTRUCTIONS:
   - Respond as ${agent.name} would — professional, knowledgeable, helpful
   - You have full access to the user's workforce data
   - Answer questions about your work, tasks, decisions, and escalations
   - If asked to do something you can't do yet, explain what you can do
   - Keep responses concise (2-3 paragraphs max)
   `;
   ```

3. **Call LLM** (Claude via existing LLM router):
   ```typescript
   const response = await callLLM({
     model: agent.model || 'claude-3-5-sonnet-20241022',
     system: systemPrompt,
     messages: chatHistory,
     temperature: 0.7,
   });
   ```

4. **Store & Broadcast**:
   ```typescript
   // Save agent message to DB
   await supabase.from('chat_messages').insert({
     chat_id: chatId,
     role: 'agent',
     content: response.content,
     metadata: { contextRefs: extractContextRefs(response.content) }
   });
   
   // Broadcast via Realtime
   await broadcastMessage(chatId, response);
   ```

### 4. Frontend Components

**New Component: `ChatPanel`**
```typescript
// Side panel or modal for active chat
// Props: { chatId: string, agent: Agent, onClose: () => void }
// Features:
// - Message list (virtualized for performance)
// - Message input with send button
// - Typing indicator
// - Scroll to bottom button
// - Message timestamps
// - "New message" notification when scrolled up
```

**New Component: `ChatMessage`**
```typescript
// Single message bubble
// Props: { message: ChatMessage, isUser: boolean, agent: Agent }
// Features:
// - User: right-aligned, primary color
// - Agent: left-aligned, with agent avatar
// - Markdown rendering for links, lists
// - Timestamp on hover
// - Delete button for user messages (hover)
```

**New Component: `ChatInput`**
```typescript
// Message input area
// Props: { onSend: (content: string) => void, disabled?: boolean }
// Features:
// - Textarea (auto-resize)
// - Send button (or Enter to send)
// - Character limit indicator
// - Disabled state while agent is typing
```

**Update Component: `AgentCard`** (in roster)
```typescript
// Add "Message" button to existing AgentCard
// On click: open ChatPanel with this agent
// Badge: show unread message count
```

**Update Page: `/portal/agents/page.tsx`**
```typescript
// Add ChatPanel to layout (can be open alongside roster)
// State: activeChatId: string | null
// UI: Roster on left, ChatPanel slides in from right (or modal overlay)
```

### 5. Real-Time Updates

**Supabase Realtime Channel:**
```typescript
// Subscribe to new messages in active chat
const channel = supabase
  .channel(`chat:${chatId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `chat_id=eq.${chatId}`
  }, (payload) => {
    // Add message to UI
    addMessage(payload.new);
    // Play notification sound if scrolled up
    if (!isScrolledToBottom) {
      playNotificationSound();
    }
  })
  .subscribe();
```

### 6. Context Window Strategy

Per Richard: "Use a context window strategy: system prompt + recent 10 activities + relevant tasks on query"

**Implementation:**
- System prompt: Agent personality + static context (role, capabilities)
- Recent activities: Last 10 from Activity Feed
- Active tasks: Current tasks assigned to agent
- Recent decisions: Last 5 decisions agent made
- Open escalations: Any escalations assigned to agent
- Chat history: Last 20 messages (or token limit)

**Optimization:** If context too large, summarize older activities/decisions.

---

## UI/UX Specifications

### Chat Panel Layout

**Option A: Side Panel (Recommended)**
```
┌─────────────────────────────────────────────┐
│ Agent Roster              │ Chat Panel      │
│                           │                 │
│ [Sales Agent]  [Message]  │ ┌─────────────┐ │
│ [Researcher]   [Message]  │ │ Messages... │ │
│ [Support]      [Message]  │ │             │ │
│                           │ │             │ │
│                           │ └─────────────┘ │
│                           │ [Input       ]  │
└─────────────────────────────────────────────┘
```
- Panel width: 400px fixed (desktop), full width (mobile)
- Collapsible on mobile
- Overlay on smaller screens

**Option B: Modal**
- Centered modal, 600px width
- Backdrop blur
- Close on backdrop click or X button

### Visual Design

- **User messages**: Right-aligned, primary color background, white text
- **Agent messages**: Left-aligned, card background, with agent avatar
- **Input area**: Fixed at bottom, textarea with send button
- **Typing indicator**: Animated dots when agent is responding
- **Empty state**: "Start a conversation with [Agent Name]"

### Interactions

- **Send message**: Enter key or click send button
- **New line**: Shift+Enter
- **Scroll**: Auto-scroll to bottom on new message (unless user scrolled up)
- **Load more**: Infinite scroll up to load older messages
- **Delete**: Hover message → trash icon (user messages only)

---

## Acceptance Criteria

### Must Have (MVP)
- [ ] CEO can click "Message" on any agent in roster
- [ ] Chat panel opens with message history
- [ ] CEO can type and send message
- [ ] Agent responds within 5 seconds (LLM call)
- [ ] Agent response includes context from tasks/decisions/activities
- [ ] Messages persist (reload page, history is there)
- [ ] Real-time updates (no refresh needed)
- [ ] Responsive design (desktop + mobile)
- [ ] 70% test coverage (component + integration)

### Nice to Have (If Time)
- [ ] Typing indicator while agent is responding
- [ ] Sound notification for new messages
- [ ] Unread badge on agent card
- [ ] Markdown support (links, lists, bold)
- [ ] Message timestamps
- [ ] "Load more" for pagination

### Out of Scope (v1.1+)
- [ ] Multi-agent rooms
- [ ] Natural language commands (actions)
- [ ] File attachments
- [ ] Voice messages
- [ ] Search message history

---

## Files to Create/Modify

**New Files:**
```
src/app/api/chats/route.ts
src/app/api/chats/[id]/messages/route.ts
src/app/api/chats/[id]/messages/[messageId]/route.ts
src/components/chat/ChatPanel.tsx
src/components/chat/ChatMessage.tsx
src/components/chat/ChatInput.tsx
src/components/chat/ChatList.tsx
src/hooks/useChat.ts
src/hooks/useChatRealtime.ts
src/lib/chat/context-builder.ts
src/types/chat.ts
supabase/migrations/YYYYMMDDHHMMSS_add_chat_tables.sql
supabase/functions/agent-chat-response/index.ts
```

**Modified Files:**
```
src/components/dashboard/AgentCard.tsx — Add "Message" button
src/app/portal/agents/page.tsx — Add ChatPanel integration
src/components/dashboard/layout/PortalLayout.tsx — Add chat state provider
```

**New Types:**
```typescript
// src/types/chat.ts
export interface Chat {
  id: string;
  tenantId: string;
  userId: string;
  agentId: string;
  agent: Agent;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface MessageMetadata {
  intent?: 'query' | 'action' | 'clarification';
  contextRefs?: {
    tasks?: string[];
    decisions?: string[];
    escalations?: string[];
  };
}
```

---

## Testing Strategy

### Component Tests (60%+ coverage)
- `ChatPanel` — Renders, loads messages, sends messages
- `ChatMessage` — Displays correctly for user/agent
- `ChatInput` — Handles input, submits on Enter
- `AgentCard` — Shows "Message" button, opens chat on click

### Integration Tests (70%+ coverage)
- `POST /api/chats` — Creates chat
- `GET /api/chats/[id]/messages` — Returns messages
- `POST /api/chats/[id]/messages` — Sends message, triggers agent response
- Edge Function — Builds context, calls LLM, stores response

### E2E Tests (Critical flows)
- User opens chat from agent roster
- User sends message, receives agent response
- Messages persist after reload
- Real-time updates work

---

## Open Questions

1. **LLM cost** — Each chat message = 1 LLM call. Cap daily messages per user? (Suggest: 100/day for MVP)
2. **Message retention** — Keep all messages forever? Or archive after 90 days? (Suggest: keep forever, paginate)
3. **Notification** — Browser notifications for new messages when tab inactive? (Suggest: v1.1 feature)

---

## Success Metrics

- CEO can have natural conversation with any agent
- Agent responses reference actual tasks/decisions (not hallucinated)
- Response time < 5 seconds
- Zero context overflow errors (proper token management)
- 70%+ test coverage
- Mobile-responsive

---

**Ready for ENG-FE implementation after #43/#44 complete.**

---

*Spec drafted by: VALIS (CEO)*  
*Based on decisions by: Richard (Founder)*
