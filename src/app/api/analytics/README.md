# Analytics API

Performance Dashboard backend API for analytics and ROI metrics.

## Endpoints

### GET /api/analytics/overview
Key performance metrics with trends for the dashboard overview.

**Query Parameters:**
- `days` (number, optional): Number of days to look back (default: 30, max: 90)

**Response:**
```json
{
  "data": {
    "summary": {
      "tasksCompleted": { "value": 150, "trend": 12.5, "trendDirection": "up" },
      "tasksCreated": { "value": 180, "trend": 8.3, "trendDirection": "up" },
      "successRate": { "value": 94.5, "trend": 2.1, "trendDirection": "up" },
      "activeAgents": { "value": 5, "trend": 0, "trendDirection": "stable" },
      "totalCost": { "value": 12.34, "trend": -5.2, "trendDirection": "down" },
      "openEscalations": { "value": 3, "trend": -25, "trendDirection": "down" }
    },
    "dailyBreakdown": [...],
    "avgTaskDuration": 120.5,
    "period": { "days": 30, "startDate": "2026-01-14", "endDate": "2026-02-13" }
  }
}
```

### GET /api/analytics/leaderboard
Agent performance rankings.

**Query Parameters:**
- `days` (number, optional): Number of days to look back (default: 30, max: 90)
- `sortBy` (string, optional): Sort field - `tasksCompleted`, `successRate`, `avgDuration`, `cost` (default: `tasksCompleted`)
- `limit` (number, optional): Number of results (default: 20, max: 100)

**Response:**
```json
{
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "medal": "gold",
        "agentId": "...",
        "name": "Writer Agent",
        "role": "worker",
        "tasksCompleted": 45,
        "successRate": 98.5,
        "avgTaskDuration": 180,
        "totalCost": 5.23,
        "escalationCount": 2,
        "trendDirection": "improving"
      }
    ],
    "period": { "days": 30 },
    "sortBy": "tasksCompleted",
    "generatedAt": "2026-02-13T05:00:00Z"
  }
}
```

### GET /api/analytics/agents/[id]
Detailed analytics for a specific agent.

**Query Parameters:**
- `days` (number, optional): Number of days to look back (default: 30, max: 90)

**Response:**
```json
{
  "data": {
    "agent": { "id": "...", "name": "...", "role": "...", ... },
    "summary": {
      "totalTasksCompleted": 45,
      "totalTasksFailed": 2,
      "successRate": 95.7,
      "totalCost": 5.23,
      "totalEscalations": 3,
      ...
    },
    "taskTypeBreakdown": [...],
    "workloadDistribution": [...],
    "dailyTrend": [...],
    "decisionConfidenceTrend": [...],
    "escalationResolutionTrend": [...]
  }
}
```

### GET /api/analytics/roi
ROI metrics and cost analysis.

**Query Parameters:**
- `days` (number, optional): Number of days to look back (default: 30, max: 90)
- `hourlyRate` (number, optional): Average human cost per hour for comparison (default: 50)

**Response:**
```json
{
  "data": {
    "summary": {
      "totalTasksCompleted": 150,
      "totalCost": 12.34,
      "costPerTask": 0.08,
      "tasksPerDollar": 12.5,
      "estimatedHoursSaved": 25.5,
      "estimatedValueGenerated": 1275.00,
      "roiPercentage": 10240
    },
    "agentCostBreakdown": [...],
    "taskTypeBreakdown": [...],
    "dailyTrend": [...],
    "projections": {
      "monthlyCost": 12.34,
      "annualCost": 148.08,
      "monthlyValue": 1275.00,
      "annualValue": 15300.00
    },
    "comparison": {
      "vsHumanLabor": {
        "humanCost": 1275.00,
        "aiCost": 12.34,
        "savings": 1262.66
      }
    }
  }
}
```

### GET /api/analytics/bottlenecks
Identify workflow bottlenecks and delays.

**Query Parameters:**
- `hours` (number, optional): Hours to look back (default: 24, max: 168)

**Response:**
```json
{
  "data": {
    "summary": {
      "totalBottlenecks": 3,
      "highSeverityCount": 1,
      "totalBlockedTasks": 5,
      "avgWaitTime": 1800
    },
    "bottlenecks": [
      {
        "type": "blocked_tasks",
        "description": "Tasks stuck in blocked state",
        "affectedCount": 5,
        "avgWaitTimeSeconds": 3600,
        "severity": "high",
        "recommendation": "Review task dependencies and resolve blockers"
      }
    ],
    "pipelineSnapshot": { "queued": 10, "in_progress": 5, "blocked": 5, "review": 2 },
    "timeInStage": { ... },
    "tasksWaitingLongest": [...],
    "agentWorkload": [...],
    "dependencyDelays": [...],
    "recommendations": [...]
  }
}
```

## Caching

All endpoints implement in-memory caching with the following TTLs:

- **Overview**: 5 minutes
- **Leaderboard**: 5 minutes
- **Agent**: 5 minutes
- **ROI**: 10 minutes (less frequent updates)
- **Bottlenecks**: 2 minutes (more dynamic)

Cached responses include a `cached: true` flag.

## Database Materialized Views

### agent_performance_daily
Aggregated daily metrics per agent including:
- Task counts (created, completed, failed, cancelled)
- Success rate
- Average task duration
- Cost and token usage
- Decision metrics
- Escalation metrics

### task_metrics_hourly
Hourly task pipeline metrics including:
- Average time in each stage
- Blocked task counts
- Status breakdown
- Cost and task volume

## Scheduled Refresh

Materialized views are automatically refreshed via pg_cron:

- **agent_performance_daily**: Daily at 1:00 AM UTC
- **task_metrics_hourly**: Every hour at 5 minutes past

## Manual Refresh

To manually refresh the analytics views, use the database functions:

```sql
-- Refresh individual views
SELECT refresh_agent_performance_daily();
SELECT refresh_task_metrics_hourly();

-- Refresh all views
SELECT refresh_all_analytics_views();
```

## Error Handling

All endpoints return standard HTTP status codes:

- `200`: Success
- `400`: Validation error (invalid query parameters)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (tenant not found)
- `404`: Not found (agent not found for agent-specific endpoint)
- `500`: Internal server error

Error responses follow the format:
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```
