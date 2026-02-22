# Webhook Endpoints Implementation

## Phase 6: Webhook System for Customer Integrations

This document summarizes the implementation of the outgoing webhook system for the ARM platform.

---

## Overview

The webhook system allows tenants to register endpoints that receive real-time event notifications when entities change in the system (agents, tasks, decisions, escalations).

---

## Database Schema

### Tables

1. **webhook_endpoints** - Stores registered webhook endpoints
   - `id` (UUID, PK)
   - `tenant_id` (UUID, FK to tenants)
   - `url` (TEXT) - Endpoint URL
   - `description` (TEXT) - Optional description
   - `events` (TEXT[]) - Array of subscribed event types
   - `secret` (TEXT) - HMAC signing secret
   - `is_active` (BOOLEAN) - Enable/disable flag
   - `metadata` (JSONB) - Custom metadata
   - `consecutive_failures` (INTEGER) - Failure tracking for auto-disable
   - `disabled_at` (TIMESTAMPTZ) - When endpoint was auto-disabled
   - `disabled_reason` (TEXT) - Reason for disabling
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **webhook_deliveries** - Logs every delivery attempt
   - `id` (UUID, PK)
   - `tenant_id` (UUID, FK)
   - `endpoint_id` (UUID, FK to webhook_endpoints)
   - `event_type` (TEXT) - Type of event
   - `event_id` (TEXT) - Unique event ID for idempotency
   - `payload` (JSONB) - Full event payload
   - `status` (TEXT) - pending, success, failed, expired
   - `response_status` (INTEGER) - HTTP status code
   - `response_body` (TEXT) - Truncated response (1KB max)
   - `response_time_ms` (INTEGER) - Request latency
   - `attempt_count` (INTEGER) - Number of delivery attempts
   - `max_attempts` (INTEGER) - Maximum attempts (default: 3)
   - `next_retry_at` (TIMESTAMPTZ) - Scheduled retry time
   - `last_attempted_at` (TIMESTAMPTZ)
   - `error_message` (TEXT)
   - `created_at`, `completed_at` (TIMESTAMPTZ)

---

## API Endpoints

### Base Path: `/api/webhooks/outgoing`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all webhook endpoints for tenant |
| POST | `/` | Register new webhook endpoint |
| GET | `/:id` | Get single webhook endpoint |
| PATCH | `/:id` | Update webhook endpoint |
| DELETE | `/:id` | Delete webhook endpoint and delivery history |
| POST | `/:id/test` | Send test webhook |
| POST | `/:id/regenerate-secret` | Regenerate signing secret |
| GET | `/deliveries` | List delivery history |

### Request/Response Examples

#### Create Webhook
```http
POST /api/webhooks/outgoing
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "https://example.com/webhook",
  "description": "Production webhook",
  "events": ["agent.created", "task.completed"],
  "metadata": { "environment": "production" }
}

Response: 201 Created
{
  "data": {
    "id": "webhook-uuid",
    "url": "https://example.com/webhook",
    "events": ["agent.created", "task.completed"],
    "is_active": true,
    "created_at": "2026-02-17T..."
  }
}
```

#### Test Webhook
```http
POST /api/webhooks/outgoing/:id/test
Authorization: Bearer {token}

Response: 200 OK
{
  "data": {
    "success": true,
    "status_code": 200,
    "response_time_ms": 150
  }
}
```

---

## Event Types

### Agent Events
- `agent.created` - New agent spawned
- `agent.updated` - Agent configuration updated
- `agent.deleted` - Agent deleted
- `agent.status_changed` - Agent status transition
- `agent.terminated` - Agent terminated

### Task Events
- `task.created` - New task created
- `task.updated` - Task updated
- `task.completed` - Task finished successfully
- `task.assigned` - Task assigned to agent
- `task.status_changed` - Task status changed
- `task.failed` - Task execution failed

### Decision Events
- `decision.proposed` - New decision pending approval
- `decision.approved` - Decision approved
- `decision.rejected` - Decision rejected

### Escalation Events
- `escalation.created` - Human intervention requested
- `escalation.resolved` - Escalation resolved

### System Events
- `system.alert` - System-level notification

---

## Security

### HMAC-SHA256 Signature Verification

Each webhook includes headers for verification:

```
X-Webhook-Id: {event_uuid}
X-Webhook-Timestamp: {unix_timestamp}
X-Webhook-Signature: v1={hex_hmac}
Content-Type: application/json
User-Agent: PinkBeam-ARM/1.0
```

Signature format:
```
signed_content = "{event_id}.{timestamp}.{body}"
signature = HMAC-SHA256(secret, signed_content)
```

### Verification Code Example
```typescript
import { verifySignature } from '@/lib/webhooks';

const isValid = verifySignature(
  eventId,
  timestamp,
  body,
  webhookSecret,
  signatureHeader
);
```

---

## Retry Logic

### Configuration
- **Max Attempts**: 3
- **Timeout**: 10 seconds per request
- **Retry Delays**: 10s, 60s, 300s (exponential backoff)
- **Auto-disable**: After 10 consecutive failures

### Delivery States
1. `pending` - Initial state
2. `failed` - Failed, will retry
3. `success` - Delivered successfully
4. `expired` - Max retries reached or endpoint disabled

---

## Edge Function: Webhook Retry Processor

**Location**: `supabase/functions/webhook-retry-processor/`

Processes failed deliveries with retries via:
- Scheduled cron job
- Manual HTTP invocation
- Database trigger

Endpoints:
- `GET /health` - Health check
- `POST /process` - Process pending retries
- `GET /stats` - Delivery statistics

---

## Files Created/Modified

### API Routes
- `src/app/api/webhooks/outgoing/route.ts` - List/Create
- `src/app/api/webhooks/outgoing/[id]/route.ts` - Get/Update/Delete
- `src/app/api/webhooks/outgoing/[id]/test/route.ts` - Test endpoint
- `src/app/api/webhooks/outgoing/[id]/regenerate-secret/route.ts` - Secret rotation
- `src/app/api/webhooks/outgoing/deliveries/route.ts` - Delivery history

### Service Layer
- `src/lib/webhooks/index.ts` - Barrel exports
- `src/lib/webhooks/signature.ts` - HMAC signing/verification
- `src/lib/webhooks/delivery.ts` - Delivery with retries
- `src/lib/webhooks/triggers.ts` - Event trigger helpers

### Types
- `src/types/webhook.ts` - TypeScript definitions

### Edge Functions
- `supabase/functions/webhook-retry-processor/index.ts` - Background retry worker

### Tests
- `src/__tests__/lib/webhooks/service.test.ts` - Service tests
- `src/__tests__/api/webhooks/outgoing.test.ts` - API validation tests

### Database
- Migration `031_outbound_webhooks.sql` already exists

---

## Usage Examples

### Registering a Webhook
```typescript
const response = await fetch('/api/webhooks/outgoing', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    url: 'https://my-app.com/webhooks/arm',
    events: ['task.completed', 'escalation.created'],
    description: 'My integration webhook'
  })
});
```

### Receiving Webhooks
```typescript
// Express example
app.post('/webhooks/arm', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const eventId = req.headers['x-webhook-id'];
  const timestamp = req.headers['x-webhook-timestamp'];
  
  // Verify signature
  const isValid = verifySignature(
    eventId,
    parseInt(timestamp),
    JSON.stringify(req.body),
    process.env.WEBHOOK_SECRET,
    signature
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process event
  const { type, data } = req.body;
  console.log(`Received ${type}:`, data);
  
  res.status(200).send('OK');
});
```

---

## Test Coverage

- ✅ Signature generation and verification
- ✅ Timestamp tolerance (5 minute window)
- ✅ Event type validation
- ✅ API request/response validation
- ✅ Webhook endpoint CRUD operations
- ✅ Delivery retry logic

Total: 22+ tests passing

---

## Future Enhancements

1. **Webhook UI** - Management interface in dashboard
2. **Retry Metrics** - Delivery success rate analytics
3. **IP Allowlist** - Restrict webhook sources
4. **Payload Filtering** - Selective field inclusion
5. **Bulk Operations** - Batch webhook management
