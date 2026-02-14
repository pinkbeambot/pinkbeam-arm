'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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
import type { AgentPerformance } from './types';

interface AgentAnalyticsProps {
  agent: AgentPerformance;
  onClose?: () => void;
  className?: string;
  onClick?: () => void;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

export function AgentAnalytics({ agent, onClose, className, onClick }: AgentAnalyticsProps) {
  // Task completion data (last 7 days)
  const taskCompletionData = [
    { day: 'Mon', completed: 45, failed: 2 },
    { day: 'Tue', completed: 52, failed: 1 },
    { day: 'Wed', completed: 38, failed: 3 },
    { day: 'Thu', completed: 61, failed: 0 },
    { day: 'Fri', completed: 48, failed: 2 },
    { day: 'Sat', completed: 32, failed: 1 },
    { day: 'Sun', completed: 28, failed: 0 },
  ];

  // Completion time distribution
  const timeDistributionData = [
    { range: '< 5m', count: 45 },
    { range: '5-15m', count: 89 },
    { range: '15-30m', count: 67 },
    { range: '30-60m', count: 34 },
    { range: '> 60m', count: 12 },
  ];

  // Task type breakdown
  const taskTypeData = [
    { name: 'Research', value: 35 },
    { name: 'Writing', value: 28 },
    { name: 'Analysis', value: 22 },
    { name: 'Review', value: 15 },
  ];

  // Hourly activity
  const hourlyActivityData = [
    { hour: '00:00', tasks: 2 },
    { hour: '04:00', tasks: 1 },
    { hour: '08:00', tasks: 12 },
    { hour: '12:00', tasks: 18 },
    { hour: '16:00', tasks: 15 },
    { hour: '20:00', tasks: 8 },
    { hour: '23:59', tasks: 3 },
  ];

  return (
    <Card className={cn("w-full", className)} onClick={onClick} role={onClick ? "button" : undefined}>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={agent.agent.avatar_url} alt={agent.agent.name} />
              <AvatarFallback className="text-lg">{agent.agent.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{agent.agent.name}</CardTitle>
              <CardDescription>{agent.agent.description}</CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{agent.agent.model}</Badge>
                <Badge variant={agent.agent.status === 'active' ? 'default' : 'secondary'}>
                  {agent.agent.status}
                </Badge>
              </div>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox 
            label="Tasks Completed" 
            value={agent.tasksCompleted}
            subtext={`${agent.tasksFailed} failed`}
          />
          <MetricBox 
            label="Success Rate" 
            value={`${agent.successRate.toFixed(1)}%`}
            subtext={agent.successRate >= 95 ? 'Excellent' : agent.successRate >= 90 ? 'Good' : 'Needs Attention'}
            subtextColor={agent.successRate >= 95 ? 'text-green-600' : agent.successRate >= 90 ? 'text-blue-600' : 'text-amber-600'}
          />
          <MetricBox 
            label="Avg Completion" 
            value={`${agent.avgCompletionTime.toFixed(1)}m`}
            subtext="per task"
          />
          <MetricBox 
            label="Total Cost" 
            value={`$${agent.totalCost.toFixed(2)}`}
            subtext={`$${(agent.totalCost / agent.tasksCompleted).toFixed(2)} per task`}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Completion Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Task Completion (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={taskCompletionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Completed"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="failed" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Failed"
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Completion Time Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                      {timeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 2 ? '#22c55e' : index < 4 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Type Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Task Type Breakdown</CardTitle>
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
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hourly Activity Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="tasks" fill="#8884d8" radius={[4, 4, 0, 0]}>
                      {hourlyActivityData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.tasks > 10 ? '#22c55e' : entry.tasks > 5 ? '#f59e0b' : '#94a3b8'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricBoxProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
}

function MetricBox({ label, value, subtext, subtextColor = 'text-muted-foreground' }: MetricBoxProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtext && <p className={cn("text-xs mt-1", subtextColor)}>{subtext}</p>}
    </div>
  );
}
