---
title: "REST API Documentation"
type: reference
status: active
created: 2026-02-13
updated: 2026-02-15
owner: CTO
tags: [api, reference, backend, critical]
aliases: ["API Docs", "REST API"]
---

# ARM API Documentation

API endpoints for the Agent Relationship Management (ARM) platform.

## Base URL

```
https://api.pinkbeam.ai/api/v1
```

## API Versioning

All API endpoints are versioned under `/api/v1/`. See [[API_VERSIONING]] for the full versioning strategy.

- **Versioned paths** (canonical): `/api/v1/agents`, `/api/v1/tasks`, etc.
- **Unversioned paths** (deprecated): `/api/agents` still works but returns an `X-Deprecated` header
- **Non-versioned routes**: `/api/auth/*`, `/api/health`, `/api/billing/webhook`, `/api/docs/*` remain unversioned
- **Response headers**: All API responses include `X-API-Version: v1`

## Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

### Authentication Flow

1. **Login/Signup**: Use Supabase Auth to obtain a JWT token
2. **Token Usage**: Include the token in the `Authorization` header for all API requests
3. **Middleware Validation**: The `middleware.ts` validates the JWT and extracts tenant context
4. **Tenant Isolation**: API routes receive tenant context via headers and enforce RLS

### Public Routes

The following routes do not require authentication:

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/refresh`
- `POST /api/auth/magic-link`
- `GET /api/health`
- `POST /api/webhooks/*`

## Common Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-13T20:00:00Z"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { ... }
}
```

#### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Authentication required | 401 |
| `INVALID_TOKEN` | Token is invalid or expired | 401 |
| `SESSION_EXPIRED` | Session has expired | 401 |
| `FORBIDDEN` | Access denied | 403 |
| `TENANT_NOT_FOUND` | Tenant context not found | 403 |
| `INSUFFICIENT_PERMISSIONS` | User lacks required capability | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Internal server error | 500 |

## Rate Limiting

API requests are rate limited per tenant using a sliding window algorithm. Rate limits are enforced via Redis/Upstash for distributed accuracy.

### Rate Limit Tiers

| Tier | Requests/Minute | Description |
|------|-----------------|-------------|
| `free` | 100 | Default for starter/free plans |
| `pro` | 1,000 | Pro and enterprise plans |
| `custom` | Configurable | Per-tenant override via tenant_settings |

### Rate Limit Headers

All API responses include rate limit information headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed per window | `100` |
| `X-RateLimit-Remaining` | Requests remaining in current window | `85` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1707868800` |
| `X-RateLimit-Tier` | Current rate limit tier | `free` |

### Rate Limit Exceeded (429)

When the rate limit is exceeded, the API returns a `429 Too Many Requests` response:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "You have exceeded the 100 requests per minute limit. Please retry after 45 seconds.",
  "retryAfter": 45
}
```

**Response Headers:**

| Header | Description | Example |
|--------|-------------|---------|
| `Retry-After` | Seconds until you can retry | `45` |
| `X-RateLimit-Limit` | Your rate limit | `100` |
| `X-RateLimit-Remaining` | Always 0 when limited | `0` |
| `X-RateLimit-Reset` | When limit resets | `1707868800` |

### Excluded Routes

The following routes are excluded from rate limiting:

- `/api/health` - Health check endpoint
- `/api/auth/*` - Authentication routes (have their own limits)
- `/api/webhooks/*` - Webhook endpoints

### Configuration

Rate limits are stored in the `tenant_settings` table and can be configured per tenant:

```sql
-- Get tenant rate limit
SELECT * FROM get_tenant_rate_limit('tenant-uuid');

-- Update tenant rate limit (requires admin)
UPDATE tenant_settings 
SET rate_limit_requests_per_minute = 500,
    rate_limit_enabled = true
WHERE tenant_id = 'tenant-uuid';
```

Default rate limit for new tenants: **100 requests/minute**

### Rate Limit Status Endpoint

Check your current rate limit status:

```
GET /api/v1/rate-limit/status
```

**Response:**

```json
{
  "tier": "free",
  "limit": 100,
  "remaining": 85,
  "resetTime": 1707868800,
  "window": 60
}
```

## Authentication Middleware

### Overview

The ARM platform uses a multi-layer authentication system:

1. **Middleware Layer** (`src/middleware.ts`):
   - Validates JWT tokens via Supabase Auth
   - Extracts `tenant_id` from JWT claims or user metadata
   - Applies per-tenant rate limiting
   - Sets `x-tenant-id` and `x-user-id` headers for downstream routes
   - Handles token refresh automatically
   - Returns 401/403/429 for invalid/missing credentials or rate limits

2. **Auth Utilities** (`src/lib/auth/`):
   - `withAuth`: Higher-order function to wrap route handlers
   - `createServerClientWithAuth`: Creates Supabase client with tenant context
   - `getTenantContextFromHeaders`: Extracts tenant context from middleware headers
   - `setTenantContext`: Sets RLS context for database queries
   - `AuthError`: Custom error class with standardized responses

3. **Database Layer**:
   - Row Level Security (RLS) policies enforce tenant isolation
   - `set_tenant_context(tenant_id)` RPC sets session context
   - All tables have `tenant_id` column

### Using withAuth in API Routes

```typescript
import { withAuth, createServerClientWithAuth, successResponse } from '@/lib/auth';
import { z } from 'zod';

// Define validation schema
const createAgentSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['ceo', 'manager', 'worker']),
});

// Wrap handler with authentication
export const POST = withAuth(async (request, context) => {
  // context.tenantId and context.userId are available
  const { supabase } = await createServerClientWithAuth(request);
  
  // Parse and validate body
  const body = await request.json();
  const validatedData = createAgentSchema.parse(body);
  
  // Database operations are automatically scoped to tenant
  const { data, error } = await supabase
    .from('agents')
    .insert({
      ...validatedData,
      tenant_id: context.tenantId,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return successResponse(data, undefined, 201);
});
```

### Error Handling

The `withAuth` HOC automatically handles errors:

```typescript
// Zod validation errors return 400
if (error instanceof z.ZodError) {
  return {
    error: 'Validation error',
    code: 'VALIDATION_ERROR',
    details: error.issues
  };
}

// AuthError instances are automatically converted
throw new AuthError('Custom error', 'FORBIDDEN', 403);
```

### Manual Auth Validation

For custom scenarios, use the lower-level utilities:

```typescript
import { 
  extractBearerToken, 
  validateAuthAndGetContext,
  createAuthClient 
} from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request);
    const { user, error, status } = await validateAuthAndGetContext(request);
    
    if (error) {
      return new Response(JSON.stringify({ error }), { status });
    }
    
    // Create client with auth
    const supabase = createAuthClient(token);
    
    // ... your logic
  } catch (error) {
    // Handle errors
  }
}
```

### Service Role Client

For admin operations that bypass RLS:

```typescript
import { createServiceClient } from '@/lib/auth';

// ⚠️ Use with extreme caution - bypasses all tenant isolation
const adminClient = createServiceClient();
```

## Tenant Context Headers

When the middleware successfully authenticates a request, it sets the following headers:

| Header | Description | Example |
|--------|-------------|---------|
| `x-tenant-id` | The user's tenant ID (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| `x-user-id` | The authenticated user's ID | `auth0\|123456789` |

These headers are consumed by the auth utilities and should not be set manually by clients.

## Agents API

### List Agents

```
GET /api/v1/agents
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `initializing`, `idle`, `active`, `paused`, `blocked`, `error`, `escaped`, `terminated` |
| `role` | string | Filter by role: `ceo`, `manager`, `worker`, `specialist`, `system` |
| `search` | string | Search in name and description (case-insensitive) |
| `parent_id` | UUID | Filter by parent agent ID for hierarchy queries |
| `include_descendants` | boolean | Include all descendants when filtering by parent_id (default: false) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Agent Name",
      "slug": "agent-name",
      "role": "worker",
      "status": "idle",
      "description": "Agent description",
      "capabilities": ["delegate", "decide"],
      "parent": { "id": "uuid", "name": "Parent Agent", ... },
      "children": [...],
      "current_task": { "id": "uuid", "title": "Task Title", ... },
      "created_at": "2026-02-13T15:00:00Z",
      "updated_at": "2026-02-13T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Create Agent

```
POST /api/v1/agents
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Agent name (1-255 chars) |
| `slug` | string | No | URL-friendly identifier (auto-generated if not provided) |
| `role` | string | No | Agent role: `ceo`, `manager`, `worker`, `specialist`, `system` (default: worker) |
| `description` | string | No | Agent description (max 2000 chars) |
| `parent_id` | UUID | No | Parent agent ID for hierarchy |
| `capabilities` | string[] | No | Array of capabilities |
| `llm_config` | object | No | LLM configuration |
| `limits` | object | No | Agent limits |
| `config` | object | No | Additional configuration |

```json
{
  "name": "New Agent",
  "slug": "new-agent",
  "role": "worker",
  "description": "Agent description",
  "parent_id": "uuid",
  "capabilities": ["delegate", "decide"],
  "llm_config": {
    "provider": "anthropic",
    "model": "claude-3-sonnet",
    "temperature": 0.7,
    "max_tokens": 2000
  },
  "limits": {
    "max_sub_agents": 5,
    "max_concurrent_tasks": 3,
    "escalation_threshold": 0.8,
    "timeout_seconds": 300,
    "max_tokens_per_task": 100000,
    "max_cost_per_task_usd": 5.00
  }
}
```

**Valid Capabilities:**
- `spawn` - Can create sub-agents
- `delegate` - Can delegate tasks
- `decide` - Can make decisions
- `escalate` - Can escalate to humans
- `access_external` - Can access external APIs
- `modify_config` - Can modify configuration
- `create_tasks` - Can create tasks
- `manage_agents` - Can manage other agents
- `execute_code` - Can execute code

**Response:** 201 Created

```json
{
  "data": {
    "id": "uuid",
    "name": "New Agent",
    "slug": "new-agent",
    "role": "worker",
    "status": "initializing",
    "depth": 0,
    "created_at": "2026-02-18T12:00:00Z",
    ...
  }
}
```

**Validation:**
- Slug auto-generated from name if not provided (lowercase, hyphenated, max 100 chars)
- Tenant agent limits are enforced (based on plan tier)
- Parent agent must exist and belong to same tenant
- Parent's `max_sub_agents` limit is enforced
- Invalid capabilities are rejected

### Get Single Agent

```
GET /api/v1/agents/:id
```

Get a single agent by ID with full details including parent info, child count, active tasks count, and recent activities.

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "Agent Name",
    "slug": "agent-name",
    "role": "worker",
    "status": "idle",
    "status_reason": "Waiting for tasks",
    "description": "Agent description",
    "capabilities": ["delegate", "decide"],
    "depth": 1,
    "parent_id": "parent-uuid",
    "root_id": "root-uuid",
    "parent": {
      "id": "parent-uuid",
      "name": "Parent Agent",
      "role": "manager",
      "status": "active"
    },
    "children": [{ "count": 3 }],
    "current_task": {
      "id": "task-uuid",
      "title": "Current Task",
      "status": "in_progress",
      "progress_percent": 45
    },
    "active_tasks_count": 5,
    "recent_activities": [
      {
        "id": "activity-uuid",
        "type": "agent.status_changed",
        "title": "Agent status changed",
        "created_at": "2026-02-18T11:00:00Z"
      }
    ],
    "llm_config": {
      "provider": "anthropic",
      "model": "claude-3-sonnet",
      "temperature": 0.7,
      "max_tokens": 4096
    },
    "limits": {
      "max_sub_agents": 5,
      "max_concurrent_tasks": 3,
      "escalation_threshold": 0.7,
      "timeout_seconds": 300,
      "max_tokens_per_task": 100000,
      "max_cost_per_task_usd": 5.00
    },
    "stats": {
      "tasks_completed": 42,
      "tasks_failed": 2,
      "escalations_raised": 5,
      "avg_task_duration_seconds": 360,
      "total_cost_usd": 125.50
    },
    "created_at": "2026-02-15T10:00:00Z",
    "updated_at": "2026-02-18T12:00:00Z",
    "activated_at": "2026-02-15T11:00:00Z"
  }
}
```

### Update Agent

```
PATCH /api/v1/agents/:id
```

Update an agent's properties. Partial updates are supported.

**Restrictions:**
- Cannot modify terminated agents
- Cannot change role of system agents
- Cannot change status to `terminated` (use DELETE endpoint)
- Setting `parent_id` is validated to prevent circular hierarchy

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Agent name (1-255 chars) |
| `description` | string | Agent description (max 2000 chars) |
| `role` | string | Agent role (cannot change from 'system') |
| `status` | string | Agent status (cannot set to 'terminated') |
| `status_reason` | string | Reason for status change (max 500 chars) |
| `parent_id` | UUID \| null | Parent agent ID (null to remove from hierarchy) |
| `capabilities` | string[] | Array of capability strings |
| `llm_config` | object | LLM configuration (partial updates supported) |
| `limits` | object | Agent limits |
| `config` | object | Additional configuration |
| `avatar_url` | string \| null | Agent avatar URL |

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "active",
  "status_reason": "Agent approved for production",
  "capabilities": ["delegate", "decide", "spawn"],
  "llm_config": {
    "temperature": 0.5
  },
  "limits": {
    "max_sub_agents": 10
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "name": "Updated Name",
    "status": "active",
    "updated_at": "2026-02-18T12:00:00Z",
    ...
  }
}
```

### Delete Agent

```
DELETE /api/v1/agents/:id
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `reason` | string | Termination reason (optional) |
| `force` | boolean | Force terminate even with active tasks (default: false) |

**Response:** 204 No Content

**Error Responses:**

- `409 Conflict` - Agent has active tasks or child agents

### Update Agent Status

```
POST /api/v1/agents/:id/status
```

Update agent status with validation. Validates status transitions and creates activity log entries.
Notifies parent agent when child is blocked or in error state.

**Request Body:**

```json
{
  "status": "active",
  "reason": "Starting task execution"
}
```

**Status Values:** `initializing`, `idle`, `active`, `paused`, `blocked`, `error`, `escaped`, `terminated`

**Valid Transitions:**

| From | To | Notes |
|------|-----|-------|
| `initializing` | `idle`, `active`, `error`, `terminated` | |
| `idle` | `active`, `paused`, `blocked`, `error`, `terminated` | |
| `active` | `idle`, `paused`, `blocked`, `error`, `terminated` | |
| `paused` | `idle`, `active`, `blocked`, `error`, `terminated` | |
| `blocked` | `idle`, `active`, `paused`, `error`, `terminated` | |
| `error` | `idle`, `active`, `paused`, `blocked`, `terminated` | |
| `escaped` | `blocked`, `terminated` | Restricted transitions |
| `terminated` | - | Terminal state |

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "status": "active",
    "status_reason": "Starting task execution",
    "updated_at": "2026-02-18T12:00:00Z"
  }
}
```

### Get Agent Children

```
GET /api/v1/agents/:id/children
```

Get child agents (direct descendants) of an agent.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `recursive` | boolean | Include all descendants as tree (default: false) |
| `include_terminated` | boolean | Include terminated agents (default: false) |

**Response (non-recursive):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Child Agent 1",
      "role": "worker",
      "status": "idle",
      "depth": 1,
      "parent_id": "parent-uuid"
    }
  ]
}
```

**Response (recursive=true):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Child Agent 1",
      "role": "worker",
      "status": "idle",
      "depth": 1,
      "children": [
        {
          "id": "uuid",
          "name": "Grandchild Agent",
          "role": "worker",
          "status": "idle",
          "depth": 2,
          "children": []
        }
      ]
    }
  ]
}
```

### Get Agent Tasks

```
GET /api/v1/agents/:id/tasks
```

Get tasks assigned to an agent. By default, returns only active tasks.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (single or comma-separated) |
| `priority` | string | Filter by priority: `low`, `normal`, `high`, `urgent` |
| `include_completed` | boolean | Include completed/failed/cancelled tasks (default: false) |
| `sort` | string | Sort field: `created_at`, `updated_at`, `deadline_at`, `priority` (default: created_at) |
| `order` | string | Sort order: `asc`, `desc` (default: desc) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Task Title",
      "status": "in_progress",
      "priority": "high",
      "progress_percent": 45,
      "deadline_at": "2026-02-20T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  },
  "meta": {
    "stats": {
      "total": 5,
      "active": 3,
      "completed": 2,
      "failed": 0
    }
  }
}
```

## Agents API Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AGENT_NOT_FOUND` | Agent does not exist or access denied | 404 |
| `AGENT_LIMIT_REACHED` | Tenant has reached max agents limit | 403 |
| `PARENT_NOT_FOUND` | Parent agent not found or access denied | 404 |
| `PARENT_MAX_SUBAGENTS` | Parent has reached max sub-agents limit | 403 |
| `CIRCULAR_HIERARCHY` | Cannot set parent to descendant (circular) | 400 |
| `INVALID_STATUS_TRANSITION` | Status change not allowed | 400 |
| `AGENT_TERMINATED` | Cannot modify terminated agent | 400 |
| `ACTIVE_TASKS_EXIST` | Cannot delete agent with active tasks | 409 |
| `ACTIVE_CHILDREN_EXIST` | Cannot delete agent with active children | 409 |
| `SYSTEM_ROLE_IMMUTABLE` | Cannot change role of system agent | 403 |
| `INVALID_CAPABILITIES` | One or more capabilities are invalid | 400 |
| `DUPLICATE_SLUG` | Agent with this slug already exists | 409 |

## Tasks API

### List Tasks

```
GET /api/v1/tasks
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `assignee_id` | UUID | Filter by assigned agent |
| `priority` | string | Filter by priority: `low`, `normal`, `high`, `urgent` |
| `page` | number | Page number |
| `limit` | number | Items per page |

### Create Task

```
POST /api/v1/tasks
```

**Request Body:**

```json
{
  "title": "Task Title",
  "description": "Task description",
  "type": "research",
  "assignee_id": "uuid",
  "priority": "high",
  "parent_task_id": "uuid",
  "deadline_at": "2026-02-20T15:00:00Z",
  "inputs": {
    "key": "value"
  },
  "expected_outputs": {
    "format": "json"
  }
}
```

## Decisions API

The decisions API provides access to the decision audit trail — all choices made by agents with their reasoning.

### List Decisions

```
GET /api/v1/decisions
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_id` | UUID | Filter by agent who made the decision |
| `status` | string | Filter by status: `proposed`, `approved`, `rejected`, `overridden`, `executed` |
| `category` | string | Filter by category: `action`, `resource`, `escalation`, `strategy`, `system` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "agent_id": "uuid",
      "agent": { "id": "uuid", "name": "Agent Name", "avatar_url": "...", "role": "worker" },
      "task_id": "uuid",
      "task": { "id": "uuid", "title": "Task Title", "status": "in_progress" },
      "category": "action",
      "status": "proposed",
      "title": "Decision Title",
      "description": "Detailed description",
      "proposed_action": { "type": "...", "parameters": {} },
      "reasoning": {
        "context": "...",
        "analysis": "...",
        "options_considered": [...],
        "confidence": 0.85,
        "risks": [...]
      },
      "self_authorized": false,
      "proposed_at": "2026-02-13T15:00:00Z",
      "decided_at": null,
      "executed_at": null
    }
  ],
  "pagination": { ... }
}
```

### Create Decision

```
POST /api/v1/decisions
```

**Request Body:**

```json
{
  "agent_id": "uuid",
  "task_id": "uuid",
  "category": "action",
  "title": "Decision Title",
  "description": "Detailed description",
  "proposed_action": {
    "type": "string",
    "parameters": {}
  },
  "reasoning": {
    "context": "string",
    "analysis": "string",
    "options_considered": [
      {
        "description": "string",
        "pros": ["string"],
        "cons": ["string"],
        "estimated_outcome": "string",
        "confidence": 0.8
      }
    ],
    "confidence": 0.85,
    "risks": [
      {
        "description": "string",
        "likelihood": "low|medium|high",
        "impact": "low|medium|high",
        "mitigation": "string"
      }
    ]
  },
  "self_authorized": false
}
```

**Response:** 201 Created

```json
{
  "data": { ...decision object... }
}
```

### Get Single Decision

```
GET /api/v1/decisions/:id
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "agent": { ... },
    "task": { ... },
    "overrider": { "id": "uuid", "name": "User Name" },
    "activity_history": [...],
    ...
  }
}
```

### Update Decision

```
PATCH /api/v1/decisions/:id
```

**Request Body (Status Update):**

```json
{
  "status": "approved",
  "outcome": { "result": "..." }
}
```

**Request Body (Override):**

```json
{
  "reason": "Override reason",
  "correct_action": { "type": "...", "parameters": {} }
}
```

**Status Transitions:**

| From | To | Notes |
|------|-----|-------|
| `proposed` | `approved` | Sets `decided_at` timestamp |
| `proposed` | `rejected` | Sets `decided_at` timestamp |
| `approved` | `executed` | Sets `executed_at` timestamp |
| Any | `overridden` | Sets `overridden_by`, `overridden_at` |

**Response:**

```json
{
  "data": { ...updated decision... }
}
```

## Escalations API

### List Escalations

```
GET /api/v1/escalations
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `open`, `in_progress`, `resolved`, `dismissed` |
| `urgency` | string | `low`, `normal`, `high`, `critical` |
| `type` | string | `clarification`, `approval`, `error`, `edge_case` |
| `agent_id` | UUID | Filter by agent |

### Create Escalation

```
POST /api/v1/escalations
```

**Request Body:**

```json
{
  "agent_id": "uuid",
  "task_id": "uuid",
  "type": "clarification",
  "urgency": "high",
  "title": "Need clarification on requirements",
  "description": "The task description is unclear about...",
  "agent_analysis": {
    "what_i_know": "I understand the general goal...",
    "what_i_dont_know": "I'm unclear about the specific requirements...",
    "what_i_tried": ["Attempted approach 1", "Attempted approach 2"]
  }
}
```

### Resolve Escalation

```
POST /api/v1/escalations/:id/resolve
```

**Request Body:**

```json
{
  "status": "resolved",
  "resolution_answer": "Clarification provided...",
  "resolution_resources": {
    "documentation_url": "..."
  }
}
```

## Messages API

### List Messages

```
GET /api/v1/messages
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from_agent_id` | UUID | Filter by sender |
| `to_agent_id` | UUID | Filter by recipient |
| `thread_id` | UUID | Filter by thread |
| `message_type` | string | Filter by message type |
| `unread_only` | boolean | Only unread messages |

### Send Message

```
POST /api/v1/messages
```

**Request Body:**

```json
{
  "message_type": "task.assign",
  "from_agent_id": "uuid",
  "to_agent_id": "uuid",
  "to_broadcast": false,
  "payload": {
    "task_id": "uuid",
    "instructions": "..."
  },
  "priority": "high",
  "requires_ack": true,
  "thread_id": "uuid",
  "correlation_id": "uuid"
}
```

### Mark as Read

```
PATCH /api/v1/messages/:id/read
```

## Activities API

### List Activities

```
GET /api/v1/activities
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_id` | UUID | Filter by agent |
| `entity_type` | string | `all`, `tasks`, `decisions`, `escalations`, `agents`, `system` |
| `time_range` | string | `1h`, `24h`, `7d`, `30d`, `all` |
| `search` | string | Search in title and description |
| `cursor` | string | Cursor for pagination |
| `limit` | number | Items per page |

## Analytics API

### Overview

```
GET /api/v1/analytics/overview
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Number of days to analyze (default: 30, max: 90) |

**Response:**

```json
{
  "data": {
    "totalTasks": 150,
    "completedTasks": 120,
    "failedTasks": 10,
    "escalations": 20,
    "avgTaskDuration": 3600,
    "totalCost": 45.50
  }
}
```

### Agent Leaderboard

```
GET /api/v1/analytics/leaderboard
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Analysis period |
| `sortBy` | string | `tasksCompleted`, `successRate`, `avgDuration`, `cost` |
| `limit` | number | Number of agents to return |

### ROI Analysis

```
GET /api/v1/analytics/roi
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Analysis period |
| `hourlyRate` | number | Hourly rate for comparison (default: 50) |

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Tenant access denied or insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Business logic error |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## RLS & Security

All endpoints enforce Row Level Security (RLS) through the `set_tenant_context(tenant_id)` RPC call. Users can only access data belonging to their tenant.

### Security Headers

API responses include the following security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Rate Limiting Implementation

Rate limiting is implemented using:

1. **Upstash Redis** - Distributed Redis for accurate counting across instances
2. **Sliding Window Algorithm** - Smooth rate limiting without burst issues
3. **Local Fallback** - In-memory fallback when Redis is unavailable
4. **Per-Tenant Configuration** - Custom limits via `tenant_settings` table

See `src/lib/rate-limit.ts` and `src/lib/middleware/rate-limit.ts` for implementation details.

## Validation

All request bodies and query parameters are validated using Zod schemas. Validation errors return a 400 status with detailed issue information:

```json
{
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": ["name"],
      "message": "Required",
      "code": "invalid_type"
    },
    {
      "path": ["priority"],
      "message": "Invalid enum value",
      "code": "invalid_enum_value"
    }
  ]
}
```

---

## Related Documentation

- [[API_VERSIONING]] — API versioning strategy and migration guide
- [[ARCHITECTURE]] — System architecture underlying the API
- [[AUTH_IMPLEMENTATION]] — Authentication middleware details
- [[AGENT-PROTOCOL]] — Agent protocol implemented by agent endpoints
- [[TESTING-STANDARDS]] — API testing requirements and coverage thresholds
