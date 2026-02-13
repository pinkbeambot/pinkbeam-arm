# ARM-001: Agent Runtime Core

**Status:** ✅ COMPLETE  
**Due:** 2026-02-15  
**Completed:** 2026-02-13  
**Assignee:** ENG-BE  
**Branch:** `eng-be/arm-001-agent-runtime`

---

## Summary

Implementation of the core agent runtime for ARM (Agent Relationship Management). This enables agents to spawn other agents, manage lifecycle states, and communicate via messages according to the AAP (ARM Agent Protocol) specification.

---

## Deliverables

### 1. Supabase Edge Functions ✅

**Location:** `supabase/functions/agent-runtime/`

| File | Description |
|------|-------------|
| `spawn.ts` | Agent spawning with hierarchy support, capability validation |
| `lifecycle.ts` | State machine management (idle, active, paused, terminated, etc.) |
| `executor.ts` | Task execution pipeline with decision logging |
| `messaging.ts` | A2A (agent-to-agent) message routing and delivery |
| `_shared/utils.ts` | Shared utilities, types, and helpers |

**Key Features:**
- Hierarchical agent spawning (agents create agents)
- Capability-based permissions
- State transition validation
- Message routing (direct, parent, children, broadcast)
- Task queue management
- LLM integration for reasoning

### 2. LLM Router ✅

**Location:** `src/lib/llm/`

| File | Description |
|------|-------------|
| `router.ts` | Main router with fallback, cost optimization |
| `claude.ts` | Anthropic Claude provider implementation |
| `types.ts` | TypeScript type definitions |
| `index.ts` | Module exports |

**Key Features:**
- Multi-provider support (Anthropic, extensible for OpenAI, Google)
- Intelligent routing based on task requirements
- Cost estimation and tracking
- Automatic fallback on provider failure
- Model selection based on context length, vision, function support

### 3. Database Migrations ✅

**File:** `supabase/migrations/006_agent_runtime_extensions.sql`

**New Tables:**
- `agent_task_queue` - Task distribution queue
- `agent_decision_log` - Detailed decision audit trail
- `agent_execution_history` - Execution tracking
- `message_delivery` - Message delivery status
- `agent_lifecycle_events` - Lifecycle event history

**Features:**
- Row-level security (RLS) policies
- Realtime publication setup
- Helper functions for claiming tasks, capability checks
- Trigger-based lifecycle event logging

### 4. Tests ✅

**Unit Tests:** `src/__tests__/unit/llm/`
- `router.test.ts` - LLM Router unit tests
- `claude.test.ts` - Claude provider unit tests

**Integration Tests:** `src/__tests__/integration/agent-runtime/`
- `runtime.test.ts` - End-to-end agent runtime tests

**Test Configuration:**
- `src/__tests__/setup.ts` - Test utilities and mocks
- `vitest.config.ts` - Vitest configuration

---

## Architecture Highlights

### Agent Spawning Flow
1. Parent agent requests spawn via `spawn.ts`
2. Runtime validates parent permissions (capability check)
3. New agent record created with `parent_id` reference
4. Agent enters "initializing" state
5. Session created in `agent_sessions`
6. Activity logged via trigger
7. Agent transitions to "idle"

### State Machine
```
INITIALIZING → IDLE → ACTIVE → COMPLETED
     ↓           ↓       ↓
  ERROR ←── PAUSED ←── BLOCKED
     ↓
TERMINATED
```

### Message Routing Patterns
- `to: "broadcast"` - All agents in tenant
- `to: "parent"` - Direct to parent agent
- `to: "children"` - All child agents
- `to: AgentIdentity` - Direct message

---

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Coverage Areas:**
- LLM routing logic
- Provider implementations
- Database operations
- Edge function handlers

---

## API Endpoints

### Spawn Agent
```
POST /functions/v1/agent-runtime/spawn
{
  "tenant_id": "uuid",
  "parent_agent_id": "uuid | null",
  "payload": {
    "name": "Agent Name",
    "role": "manager | worker | specialist",
    "goal": "Agent's purpose",
    "config": { ... }
  }
}
```

### Lifecycle Management
```
POST /functions/v1/agent-runtime/lifecycle
{
  "action": "pause | resume | terminate | error | escape | block | unblock",
  "agent_id": "uuid",
  "tenant_id": "uuid",
  "reason": "optional"
}
```

### Task Execution
```
POST /functions/v1/agent-runtime/executor
{
  "type": "task | decision | reasoning",
  "task_id": "uuid",
  "agent_id": "uuid",
  "action": "claim | start | progress | complete | fail",
  "payload": { ... }
}
```

### Messaging
```
POST /functions/v1/agent-runtime/messaging
{
  "action": "route | broadcast | ack | status",
  "tenant_id": "uuid",
  "message": { ... }
}

GET /functions/v1/agent-runtime/messaging?agent_id=uuid&tenant_id=uuid
```

---

## Environment Variables Required

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## Compliance

- ✅ All tables have RLS policies
- ✅ Service role bypass for Edge Functions
- ✅ Zod validation on all inputs
- ✅ Audit trail via activities table
- ✅ Cost tracking for LLM calls
- ✅ No secrets committed

---

## PR Link

https://github.com/pinkbeam/arm/pull/XXX

---

## Next Steps (Post-Merge)

1. Deploy Edge Functions to Supabase
2. Run database migrations
3. Configure environment variables
4. Test with sample agent workflows
5. Monitor agent spawn/execution metrics

---

## Notes

- All code follows the ARM Agent Protocol specification
- Multi-tenancy enforced at database level (RLS)
- Hierarchical agent model supports unlimited nesting
- Event-driven architecture with Supabase Realtime
- Cost-conscious LLM routing with fallback support
