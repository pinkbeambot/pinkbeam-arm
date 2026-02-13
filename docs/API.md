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

## Common Response Format

### Success Response

```json
{
  "data": { ... },
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
  "details": { ... }
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

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Tenant access denied |
| 404 | Not Found |
| 500 | Internal Server Error |

## RLS & Security

All endpoints enforce Row Level Security (RLS) through the `set_tenant_context(tenant_id)` RPC call. Users can only access data belonging to their tenant.
