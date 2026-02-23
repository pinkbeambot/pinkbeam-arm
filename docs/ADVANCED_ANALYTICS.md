# Advanced Analytics Dashboard

This document describes the ML-powered advanced analytics features added to the ARM platform.

## Overview

The Advanced Analytics Dashboard provides predictive insights, anomaly detection, and natural language querying capabilities for monitoring and optimizing your AI workforce.

## Features

### 1. Predictive Analytics

**Task Completion Predictions**
- ML-based predictions for when in-progress tasks will complete
- Confidence scores for each prediction
- Factor breakdown showing what influences predictions

**Agent Workload Forecasting**
- 7-day workload forecasts per agent
- Trend indicators (increasing/stable/decreasing)
- Load balancing recommendations

**Cost Projections**
- Daily/weekly/monthly cost forecasts
- Confidence intervals for projections
- Category breakdowns (LLM, escalations, other)

**Anomaly Detection**
- Automatic detection of unusual patterns
- Severity levels (low, medium, high, critical)
- Recommended actions for each anomaly

### 2. Enhanced Visualizations

**Time-Series Charts with Recharts**
- Area, line, and bar chart types
- Trend line overlay
- Prediction bands
- Interactive tooltips

**Activity Heatmaps**
- Hourly patterns (24 hours × 7 days)
- Daily category breakdowns
- Weekly metric comparisons
- Intensity-based coloring

### 3. Real-time Metrics

**Live Dashboard**
- Active agent counts
- Tasks in progress/queued
- Current hourly costs
- Success rates

**System Health**
- API latency monitoring
- Error rate tracking
- Queue depth indicators

### 4. Natural Language Queries

**AI-Powered Query Interface**
- Ask questions in plain English
- Example queries:
  - "Show me agents with declining performance"
  - "What are my top performing agents?"
  - "How much did I spend last week?"
  - "Which tasks are taking the longest?"

**Intelligent Responses**
- Intent detection
- Relevant visualizations
- Actionable recommendations

### 5. Automated Insights & Alerts

**Smart Insights**
- Performance trend analysis
- Cost optimization opportunities
- Bottleneck identification
- Top performer recognition

**Real-time Alerts**
- Critical escalation notifications
- Cost threshold warnings
- Performance degradation alerts
- Acknowledgment actions

## API Endpoints

### Predictions
```
GET /api/analytics/predictions?days=30&forecastDays=7
```
Returns: Task predictions, workload forecasts, cost projections, anomalies

### Heatmap
```
GET /api/analytics/heatmap?type=hourly&metric=activity&days=30
```
Returns: Activity heatmap data

### Natural Language Query
```
POST /api/analytics/nlquery
Body: { query: "Show me top agents", days: 30 }
```
Returns: Parsed intent, results, visualizations, recommendations

### Insights
```
GET /api/analytics/insights?days=30
POST /api/analytics/insights  # Acknowledge alert
```
Returns: Automated insights and smart alerts

### Realtime
```
GET /api/analytics/realtime
```
Returns: Current metrics snapshot

## React Hooks

```typescript
import { 
  usePredictions,
  useHeatmap,
  useNLQuery,
  useInsights,
  useRealtimeMetrics 
} from '@/lib/hooks';

// Predictions with 7-day forecast
const { data, isLoading } = usePredictions(dateRange, 7);

// Heatmap data
const { data } = useHeatmap('hourly', dateRange, 'activity');

// Natural language query
const { executeQuery, data } = useNLQuery(dateRange);

// Insights and alerts
const { insights, alerts, acknowledgeAlert } = useInsights(dateRange);

// Real-time metrics (30s polling)
const { data } = useRealtimeMetrics(30000);
```

## Components

```typescript
import {
  PredictiveAnalyticsWidget,
  HeatmapWidget,
  InsightsWidget,
  NaturalLanguageQuery,
  TimeSeriesChart
} from '@/components/analytics';
```

## Database Schema

### New Indexes
- `idx_tasks_completion_time` - Task completion analysis
- `idx_activities_hourly` - Heatmap queries
- `idx_agent_perf_daily_trend` - Anomaly detection
- `idx_tasks_status_tenant` - Real-time metrics

### Analytics Cache Table
```sql
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    cache_key TEXT,
    cache_type TEXT,
    data JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Navigation

The Advanced Analytics Dashboard is accessible at:
```
/portal/analytics/advanced
```

It includes tabs for:
- **Overview**: KPIs, trends, and main widgets
- **Predictions**: ML forecasts and anomaly detection
- **Insights**: Automated insights and alerts
- **Explore**: Natural language queries and deep dives

## Implementation Notes

### Caching Strategy
- API responses cached for 5 minutes
- Analytics cache table for expensive calculations
- Automatic cleanup of expired cache entries

### ML Algorithms
- Linear regression for trend lines
- Moving averages for forecasting
- Statistical analysis for anomaly detection (2-3 std dev)

### Performance
- All queries use tenant isolation (RLS)
- Indexed for fast aggregations
- Lazy loading of chart data

## Future Enhancements

- Integration with external ML models (Claude, GPT)
- Custom alert thresholds
- Scheduled report generation
- PDF export of insights
- Cohort analysis views
