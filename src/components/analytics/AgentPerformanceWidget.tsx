'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatCurrency, getInitials, getRoleLabel } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import type { AgentPerformanceMetrics } from '@/types/analytics';

interface AgentPerformanceWidgetProps {
  data?: AgentPerformanceMetrics[];
  summary?: {
    totalAgents: number;
    activeAgents: number;
    totalTasksCompleted: number;
    overallSuccessRate: number;
    totalCost: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function AgentPerformanceWidget({
  data,
  summary,
  isLoading,
  className,
}: AgentPerformanceWidgetProps) {
  if (isLoading) {
    return <AgentPerformanceSkeleton className={className} />;
  }

  const agents = data || [];
  const topAgents = [...agents]
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    .slice(0, 5);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Agent Performance
            </CardTitle>
            <CardDescription>
              {summary?.activeAgents ?? 0} of {summary?.totalAgents ?? 0} agents active
            </CardDescription>
          </div>
          {summary && (
            <div className="text-right">
              <div className="text-2xl font-bold">{summary.totalTasksCompleted}</div>
              <div className="text-xs text-muted-foreground">tasks completed</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {topAgents.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
            <Users className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No agent data available</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-4">
              {topAgents.map((agent) => (
                <AgentRow key={agent.agentId} agent={agent} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AgentRow({ agent }: { agent: AgentPerformanceMetrics }) {
  const totalTasks = agent.tasksCompleted + agent.tasksFailed;
  const successRate = totalTasks > 0 ? (agent.tasksCompleted / totalTasks) * 100 : 0;

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <Avatar className="h-10 w-10">
        <AvatarImage src={agent.avatarUrl} />
        <AvatarFallback className="text-xs">
          {getInitials(agent.agentName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{agent.agentName}</p>
            <p className="text-xs text-muted-foreground">{getRoleLabel(agent.agentRole)}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {agent.tasksCompleted} tasks
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-medium">{successRate.toFixed(0)}%</span>
          </div>
          <Progress value={successRate} className="h-1.5" />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {agent.tasksCompleted}
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            {agent.tasksFailed}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-500" />
            {agent.avgTaskDuration.toFixed(0)}m avg
          </span>
          {agent.totalCost > 0 && (
            <span className="ml-auto font-medium text-foreground">
              {formatCurrency(agent.totalCost)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentPerformanceSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
