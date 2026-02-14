# ARM API Documentation

API endpoints for the Agent Relationship Management (ARM) platform.

## Base URL

```
https://api.pinkbeam.ai/api
```

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
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Internal server error | 500 |

## Authentication Middleware

### Overview

The ARM platform uses a multi-layer authentication system:

1. **Middleware Layer** (`src/middleware.ts`):
   - Validates JWT tokens via Supabase Auth
   - Extracts `tenant_id` from JWT claims or user metadata
   - Sets `x-tenant-id` and `x-user-id` headers for downstream routes
   - Handles token refresh automatically
   - Returns 401/403 for invalid/missing credentials

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
GET /api/agents
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `initializing`, `idle`, `active`, `paused`, `blocked`, `error`, `escaped`, `terminated` |
| `role` | string | Filter by role: `ceo`, `manager`, `worker`, `specialist`, `system` |
| `search` | string | Search in name and description |
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
POST /api/agents
```

**Request Body:**

```json
{
  "name": "New Agent",
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
    "escalation_threshold": 0.8,
    "timeout_seconds": 300
  }
}
```

**Response:** 201 Created

```json
{
  "data": {
    "id": "uuid",
    "name": "New Agent",
    "slug": "new-agent",
    "status": "initializing",
    ...
  }
}
```

### Get Single Agent

```
GET /api/agents/:id
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "name": "Agent Name",
    "parent": { ... },
    "children": [...],
    "current_task": { ... },
    "stats": {
      "tasks_completed": 42,
      "success_rate": 0.95,
      ...
    }
  }
}
```

### Update Agent

```
PATCH /api/agents/:id
```

**Request Body:**

```json
{
  "name": "Updated Name",
  "status": "active",
  "capabilities": ["delegate", "decide", "spawn"]
}
```

### Delete Agent

```
DELETE /api/agents/:id
```

**Response:** 204 No Content

## Tasks API

### List Tasks

```
GET /api/tasks
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
POST /api/tasks
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
GET /api/decisions
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
POST /api/decisions
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
GET /api/decisions/:id
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
PATCH /api/decisions/:id
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
GET /api/escalations
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
POST /api/escalations
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
POST /api/escalations/:id/resolve
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
GET /api/messages
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
POST /api/messages
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
PATCH /api/messages/:id/read
```

## Activities API

### List Activities

```
GET /api/activities
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
GET /api/analytics/overview
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
GET /api/analytics/leaderboard
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Analysis period |
| `sortBy` | string | `tasksCompleted`, `successRate`, `avgDuration`, `cost` |
| `limit` | number | Number of agents to return |

### ROI Analysis

```
GET /api/analytics/roi
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

### Rate Limiting

API requests are rate limited per tenant:

- 100 requests per minute for standard endpoints
- 10 requests per minute for analytics endpoints
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

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
