# Agent Execute Edge Function

## Overview

The `agent-execute` Edge Function handles real-time task execution for AI agents in the ARM platform. It provides:

- **Task picking** from the queue
- **LLM-powered reasoning** for agent decision-making
- **State transition management** (queued → in_progress → completed/failed)
- **Automatic escalation** creation when needed
- **Cost tracking** for every LLM call

## API Endpoints

### POST /agent-execute/pick

Pick the next available task from the queue for an agent.

**Request:**
```json
{
  "agent_id": "uuid",
  "tenant_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agent_id": "uuid",
    "task": {
      "id": "uuid",
      "title": "Task title",
      "description": "Task description",
      "type": "generic",
      "priority": "normal",
      "inputs": {},
      "expected_outputs": {}
    }
  }
}
```

### POST /agent-execute/execute

Execute a specific action on a task.

**Request:**
```json
{
  "agent_id": "uuid",
  "task_id": "uuid",
  "tenant_id": "uuid",
  "action": "start" | "execute" | "progress" | "complete" | "fail",
  "context": {
    "progress_percent": 50,
    "current_step": "Current step description",
    "outputs": {},
    "error_message": "Error message if failing",
    "escalate": true,
    "tokens_used": 1000,
    "cost_usd": 0.05
  }
}
```

**Actions:**
- `start`: Transition task from queued to in_progress
- `execute`: Execute a step with LLM reasoning
- `progress`: Update task progress
- `complete`: Mark task as completed
- `fail`: Mark task as failed (optionally create escalation)

### POST /agent-execute/autonomous

Execute a task autonomously (full loop with multiple LLM calls).

**Request:**
```json
{
  "agent_id": "uuid",
  "task_id": "uuid",
  "tenant_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "agent_id": "uuid",
    "status": "completed",
    "outputs": {},
    "cost_usd": 0.15,
    "tokens_used": 3000,
    "started_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:05:00Z",
    "execution_steps": 5,
    "escalations_created": 0
  }
}
```

### GET /agent-execute/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "features": ["task-pick", "task-execute", "llm-integration", "cost-tracking", "escalation"]
  }
}
```

## Architecture

### Components

1. **`index.ts`** - Main entry point, request routing, authentication
2. **`executor.ts`** - `TaskExecutor` class handles task lifecycle
3. **`cost-tracker.ts`** - `CostTracker` class records LLM costs
4. **`escalation.ts`** - `EscalationManager` class handles escalations
5. **`schemas.ts`** - Zod schemas for request validation

### Task Execution Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Pick     │────▶│   Start     │────▶│   Execute   │
│    Task     │     │    Task     │     │   (LLM)     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                 ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
                 │  Complete   │         │  Escalate   │         │    Fail     │
                 │             │         │             │         │             │
                 └─────────────┘         └─────────────┘         └─────────────┘
```

### LLM Reasoning Format

Agents respond with a structured JSON object:

```json
{
  "thought": "Detailed reasoning about the task",
  "action": "continue | complete | escalate | spawn_subtask | request_info | fail",
  "action_params": {},
  "progress_percent": 50,
  "confidence": 0.85
}
```

If `confidence` is below the agent's `escalation_threshold`, the action is automatically changed to `escalate`.

### Cost Tracking

Every LLM call is recorded in the `llm_costs` table with:
- Input/output tokens
- Cost in USD (calculated based on model pricing)
- Agent and task association
- Request type (task_execution, decision, etc.)

Pricing is defined in the code and should be updated when Anthropic changes their rates.

### Escalation Creation

Escalations are created when:
1. Agent confidence is below threshold
2. Agent explicitly requests escalation
3. Task fails and `escalate: true` is passed

SLA deadlines are calculated based on urgency:
- `critical`: 1 hour
- `high`: 4 hours
- `normal`: 24 hours
- `low`: 72 hours

## Environment Variables

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Testing

Run the test suite:

```bash
deno test --allow-all supabase/functions/agent-execute/__tests__/index.test.ts
```

Tests cover:
- Schema validation
- Cost calculations
- Task state transitions
- Escalation handling
- Edge cases and error conditions
- Performance (schema validation speed)

## Security

- JWT authentication required for all endpoints except health check
- Tenant isolation enforced on all database queries
- Input validation via Zod schemas
- No sensitive data in logs

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `UNAUTHORIZED` | Invalid or missing authentication | No |
| `TASK_NOT_FOUND` | Task doesn't exist or tenant mismatch | No |
| `AGENT_NOT_FOUND` | Agent doesn't exist or tenant mismatch | No |
| `NOT_ASSIGNED` | Task not assigned to this agent | No |
| `AGENT_BUSY` | Agent already has an active task | No |
| `INVALID_STATE` | Task not in correct state for action | No |
| `INVALID_ACTION` | Unknown action type | No |
| `VALIDATION_ERROR` | Request body validation failed | No |
| `UPDATE_FAILED` | Database update failed | Yes |
| `LLM_ERROR` | LLM API call failed | Yes |
| `ESCALATION_CREATE_FAILED` | Failed to create escalation | Yes |
| `INTERNAL_ERROR` | Unexpected error | Yes |

## Integration

This function integrates with:
- **Supabase Auth** - JWT verification
- **Supabase Database** - Tasks, agents, escalations, costs, activities
- **Anthropic API** - Claude LLM for agent reasoning
- **Supabase Realtime** - Activity logging triggers updates

## Future Enhancements

- [ ] Support for multiple LLM providers (OpenAI, Gemini)
- [ ] Tool calling support (function calling)
- [ ] Parallel subtask spawning
- [ ] Advanced retry logic with exponential backoff
- [ ] Streaming responses for real-time progress
