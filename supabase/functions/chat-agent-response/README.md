# Chat Agent Response Edge Function

This Edge Function generates agent responses using Claude LLM when a user sends a message in chat.

## Environment Variables

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude access

## API

### POST /

Generates an agent response for a user message.

**Request Body:**
```json
{
  "chat_id": "uuid",
  "agent_id": "uuid",
  "tenant_id": "uuid",
  "user_message": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chat_id": "uuid",
    "processing_time_ms": 1500,
    "tokens_used": {
      "input": 500,
      "output": 150
    }
  }
}
```

The agent response is stored in the database and broadcast via Supabase Realtime.

## Features

1. **Message History Context** - Sends up to 20 previous messages to Claude for context
2. **Agent Personality** - Uses agent's name, description, role, and custom system prompt from configuration
3. **Context Awareness** - Includes recent activities, tasks, decisions, and escalations in the system prompt
4. **Realtime Updates** - Agent response is stored and automatically appears in the chat via Supabase Realtime
5. **Error Handling** - Graceful fallback if LLM call fails

## Deployment

```bash
supabase functions deploy chat-agent-response
```
