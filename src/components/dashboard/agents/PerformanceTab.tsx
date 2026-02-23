'use client';

import * as React from 'react';
import { CheckCircle2, Activity, Clock, AlertCircle, TrendingUp, DollarSign, Brain } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { AgentAnalyticsData } from '@/lib/hooks/useAgentAnalytics';

// ============================================================================
// Types
// ============================================================================

interface PerformanceTabProps {
  data?: AgentAnalyticsData | null;
  isLoading?: boolean;
  error?: Error | null;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

// ============================================================================
// Colors
// ============================================================================

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

// ============================================================================
// Performance Tab Component
// ============================================================================

export function PerformanceTab({ data, isLoading, error }: PerformanceTabProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load performance data: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <PerformanceTabSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No performance data available</p>
      </div>
    );
  }

  const { summary, dailyTrend, taskTypeBreakdown, workloadDistribution } = data;

  // Calculate trend direction
  const recentDays = dailyTrend.slice(-7);
  const previousDays = dailyTrend.slice(-14, -7);
  const recentAvg = recentDays.length > 0 
    ? recentDays.reduce((sum, d) => sum + d.tasksCompleted, 0) / recentDays.length 
    : 0;
  const previousAvg = previousDays.length > 0 
    ? previousDays.reduce((sum, d) => sum + d.tasksCompleted, 0) / previousDays.length 
    : 0;
  const trendChange = previousAvg > 0 
    ? ((recentAvg - previousAvg) / previousAvg) * 100 
    : 0;

  // Format daily trend data for charts
  const trendData = dailyTrend.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completed: d.tasksCompleted,
    failed: d.tasksFailed,
    successRate: Math.round(d.successRate * 100),
    cost: d.cost,
    avgDuration: Math.round((d.avgDuration || 0) / 60), // Convert to minutes
  }));

  // Format task type data
  const taskTypeData = taskTypeBreakdown.map(t => ({
    name: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    value: t.count,
    completed: t.completed,
    failed: t.failed,
    successRate: t.successRate,
  }));

  // Format workload distribution (show only hours with activity)
  const workloadData = workloadDistribution
    .filter(w => w.tasks > 0)
    .map(w => ({
      hour: `${w.hour}:00`,
      tasks: w.tasks,
    }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Tasks Completed"
          value={summary.totalTasksCompleted}
          subtext={summary.totalTasksFailed > 0 ? `${summary.totalTasksFailed} failed` : 'All successful'}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Success Rate"
          value={`${(summary.successRate * 100).toFixed(1)}%`}
          subtext={summary.successRate >= 0.95 ? 'Excellent' : summary.successRate >= 0.90 ? 'Good' : 'Needs Attention'}
          subtextColor={summary.successRate >= 0.95 ? 'text-green-600' : summary.successRate >= 0.90 ? 'text-blue-600' : 'text-amber-600'}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Response Time"
          value={summary.avgTaskDuration > 0 ? formatDuration(Math.round(summary.avgTaskDuration)) : 'N/A'}
          subtext="per task"
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Cost"
          value={`$${summary.totalCost.toFixed(2)}`}
          subtext={summary.totalTasksCompleted > 0 ? `$${(summary.totalCost / summary.totalTasksCompleted).toFixed(3)} per task` : 'No tasks'}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Task Completion Trend */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Task Completion Trend</CardTitle>
                <CardDescription>Last {trendData.length} days</CardDescription>
              </div>
              {trendChange !== 0 && (
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  trendChange > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  <TrendingUp className={cn('h-3 w-3', trendChange < 0 && 'rotate-180')} />
                  {Math.abs(trendChange).toFixed(1)}%
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Completed"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Failed"
                    dot={false}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Rate Trend */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate Trend</CardTitle>
            <CardDescription>Daily success percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(v) => [`${v}%`, 'Success Rate']}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Success Rate"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Type Breakdown */}
      {taskTypeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Task Type Breakdown</CardTitle>
            <CardDescription>Distribution by task type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {taskTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workload Distribution */}
      {workloadData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hourly Activity Pattern</CardTitle>
            <CardDescription>Tasks created by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="tasks" fill="#ec4899" radius={[4, 4, 0, 0]}>
                    {workloadData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.tasks > 5 ? '#ec4899' : entry.tasks > 2 ? '#8b5cf6' : '#94a3b8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Escalations"
          value={summary.totalEscalations}
          subtext="raised"
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <MetricCard
          label="Decisions"
          value={summary.totalDecisions}
          subtext={summary.totalOverridden > 0 ? `${summary.totalOverridden} overridden` : 'All accepted'}
          icon={<Brain className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({ label, value, subtext, subtextColor = 'text-muted-foreground', icon, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className={cn('text-xs mt-1', subtextColor)}>{subtext}</p>}
    </div>
  );
}

// ============================================================================
// Skeleton Loading State
// ============================================================================

function PerformanceTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-muted rounded-lg p-4">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-3 w-24 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      ))}
    </div>
  );
}

export default PerformanceTab;
