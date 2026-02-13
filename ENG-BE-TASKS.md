# ENG-BE Task Assignment: Pink Beam ARM Backend

## Overview
Build API routes and database layer for the ARM platform. Work in `~/code/arm/`.

## Critical: Message CTO on Completion
When you complete these tasks, you MUST message the CTO (me) with:
1. Summary of what was built
2. Any blockers or issues encountered
3. What's ready for ENG-FE to consume

## Phase 1: API Routes (Priority: CRITICAL)

### 1.1 Agents API (`app/api/agents/route.ts`)
- [ ] GET /api/agents - List agents with filters (status, role, search)
- [ ] POST /api/agents - Create new agent
- [ ] GET /api/agents/[id] - Get agent details with parent/children relations
- [ ] PATCH /api/agents/[id] - Update agent (status, config, etc.)
- [ ] DELETE /api/agents/[id] - Soft delete agent

### 1.2 Tasks API (`app/api/tasks/route.ts`)
- [ ] GET /api/tasks - List tasks with filters (status, assignee, priority)
- [ ] POST /api/tasks - Create new task
- [ ] GET /api/tasks/[id] - Get task with dependencies
- [ ] PATCH /api/tasks/[id] - Update task (status, progress, assignee)
- [ ] DELETE /api/tasks/[id] - Delete task
- [ ] POST /api/tasks/[id]/assign - Assign task to agent

### 1.3 Decisions API (`app/api/decisions/route.ts`)
- [ ] GET /api/decisions - List decisions with filters
- [ ] POST /api/decisions - Create decision (from agent)
- [ ] GET /api/decisions/[id] - Get decision details
- [ ] POST /api/decisions/[id]/override - Override a decision

### 1.4 Escalations API (`app/api/escalations/route.ts`)
- [ ] GET /api/escalations - List escalations (open first)
- [ ] POST /api/escalations - Create escalation
- [ ] GET /api/escalations/[id] - Get escalation details
- [ ] POST /api/escalations/[id]/resolve - Resolve escalation

### 1.5 Activities API (`app/api/activities/route.ts`)
- [ ] GET /api/activities - List recent activities
- [ ] Support cursor-based pagination (before param)

## Phase 2: Database Hooks & Realtime (Priority: HIGH)

### 2.1 Activity Trigger Functions
In `supabase/migrations/003_triggers_and_functions.sql`:
- [ ] Trigger to auto-create activity records on:
  - Agent spawn, status change, terminate
  - Task create, assign, start, complete, fail
  - Decision propose, override
  - Escalation create, resolve

### 2.2 Realtime Setup
- [ ] Enable realtime for activities table
- [ ] Create broadcast function for new activities
- [ ] Set up Supabase Realtime channel config

### 2.3 Server Actions (Optional but recommended)
Create `src/lib/actions/`:
- [ ] agent-actions.ts - Server actions for agent mutations
- [ ] task-actions.ts - Server actions for task mutations
- [ ] escalation-actions.ts - Server actions for escalation mutations

## Phase 3: Helper Functions (Priority: MEDIUM)

### 3.1 Supabase Queries (`src/lib/supabase/queries.ts`)
Create typed query helpers:
- [ ] getAgents(tenantId, filters) - List agents
- [ ] getAgentById(tenantId, id) - Single agent with relations
- [ ] getTasks(tenantId, filters) - List tasks
- [ ] getTaskById(tenantId, id) - Single task with dependencies
- [ ] getDecisions(tenantId, filters) - List decisions
- [ ] getEscalations(tenantId, filters) - List escalations
- [ ] getActivities(tenantId, limit, before) - Activity feed

### 3.2 Realtime Hook (`src/lib/supabase/realtime.ts`)
- [ ] useRealtimeActivities(tenantId) - Subscribe to new activities
- [ ] useRealtimeEscalations(tenantId) - Subscribe to escalation updates

## Technical Requirements

1. **Tenant Isolation**: All queries MUST include tenant_id filter
2. **RLS Context**: Use `set_tenant_context()` in edge functions if needed
3. **Error Handling**: Return consistent error format: `{ error: { code, message } }`
4. **Validation**: Use Zod for input validation
5. **Types**: Use types from `src/types/index.ts`

## Example API Response Format

```typescript
// Success
{ data: Agent[], error: null, meta: { page, limit, total, totalPages } }

// Error
{ data: null, error: { code: 'AGENT_NOT_FOUND', message: '...' } }
```

## Database Connection

Use the Supabase client from `src/lib/supabase/client.ts`:
```typescript
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

## Testing

Test your endpoints with curl or similar:
```bash
# List agents
curl http://localhost:3000/api/agents

# Create agent
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Agent","role":"worker"}'
```

## Deliverables

1. All API routes working with proper error handling
2. Activity triggers creating records on state changes
3. Realtime subscriptions configured
4. Query helper functions for ENG-FE
5. Message CTO when complete

