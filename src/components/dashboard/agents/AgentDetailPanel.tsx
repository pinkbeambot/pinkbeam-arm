'use client';

import { X, Bot, Calendar, Activity, CheckCircle2, Clock, AlertCircle, Settings, MessageSquare, Play, Pause } from 'lucide-react';
import { cn, formatDateTime, getAgentStatusColor, getAgentStatusLabel, getRoleLabel, getRoleBadgeColor, getInitials, getAvatarColor, formatRelativeTime } from '@/lib/utils';
import type { Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentDetailPanelProps {
  agent: Agent | null;
  loading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onChat: () => void;
  onToggleStatus: () => void;
}

export function AgentDetailPanel({
  agent,
  loading,
  open,
  onOpenChange,
  onEdit,
  onChat,
  onToggleStatus,
}: AgentDetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        {loading || !agent ? (
          <AgentDetailSkeleton />
        ) : (
          <AgentDetailContent
            agent={agent}
            onEdit={onEdit}
            onChat={onChat}
            onToggleStatus={onToggleStatus}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function AgentDetailContent({
  agent,
  onEdit,
  onChat,
  onToggleStatus,
  onClose,
}: {
  agent: Agent;
  onEdit: () => void;
  onChat: () => void;
  onToggleStatus: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="px-6 py-4 border-b space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={agent.avatar_url} />
                <AvatarFallback className={cn('text-white text-lg', getAvatarColor(agent.name))}>
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background',
                getAgentStatusColor(agent.status)
              )} />
            </div>
            <div>
              <SheetTitle className="text-xl">{agent.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn('text-xs', getRoleBadgeColor(agent.role))}>
                  {getRoleLabel(agent.role)}
                </Badge>
                <StatusBadge status={agent.status} />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
          <Button variant="outline" size="sm" onClick={onChat} className="flex-1">
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Button>
          <Button 
            variant={agent.status === 'paused' ? 'default' : 'outline'} 
            size="sm" 
            onClick={onToggleStatus}
            className="flex-1"
          >
            {agent.status === 'paused' ? (
              <>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            )}
          </Button>
        </div>
      </SheetHeader>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="px-6 py-2 border-b rounded-none bg-transparent justify-start gap-4">
          <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
            Performance
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
            Activity
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="m-0 px-6 py-4">
            <OverviewTab agent={agent} />
          </TabsContent>

          <TabsContent value="performance" className="m-0 px-6 py-4">
            <PerformanceTab agent={agent} />
          </TabsContent>

          <TabsContent value="activity" className="m-0 px-6 py-4">
            <ActivityTab agent={agent} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function OverviewTab({ agent }: { agent: Agent }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {agent.description && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
          <p className="text-sm text-foreground">{agent.description}</p>
        </div>
      )}

      {/* Current Task */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Task</h4>
        {agent.current_task ? (
          <div className="bg-muted rounded-lg p-3">
            <p className="font-medium text-sm">{agent.current_task.title}</p>
            <Badge variant="secondary" className="mt-2 text-xs">
              {agent.current_task.status}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No active task</p>
        )}
      </div>

      {/* Capabilities */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Capabilities</h4>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities?.map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs capitalize">
              {cap.replace('_', ' ')}
            </Badge>
          )) || <span className="text-sm text-muted-foreground">No capabilities configured</span>}
        </div>
      </div>

      {/* Configuration */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Configuration</h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Model</dt>
            <dd className="font-medium">{agent.model || 'Default'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Agent ID</dt>
            <dd className="font-mono text-xs">{agent.id.slice(0, 8)}...</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Depth</dt>
            <dd className="font-medium">{agent.depth}</dd>
          </div>
          {agent.parent_id && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Parent Agent</dt>
              <dd className="font-mono text-xs">{agent.parent_id.slice(0, 8)}...</dd>
            </div>
          )}
        </dl>
      </div>

      <Separator />

      {/* Timestamps */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Created {formatDateTime(agent.created_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>Last updated {formatRelativeTime(agent.updated_at)}</span>
        </div>
        {agent.last_active_at && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last active {formatRelativeTime(agent.last_active_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PerformanceTab({ agent }: { agent: Agent }) {
  const stats = [
    { label: 'Tasks Completed', value: (agent.metadata?.tasks_completed as number) || 0, icon: CheckCircle2 },
    { label: 'Success Rate', value: `${(((agent.metadata?.success_rate as number) || 0) * 100).toFixed(0)}%`, icon: Activity },
    { label: 'Escalations', value: (agent.metadata?.escalation_count as number) || 0, icon: AlertCircle },
    { label: 'Avg Response Time', value: (agent.metadata?.avg_response_time as number) ? `${agent.metadata?.avg_response_time}s` : 'N/A', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-muted rounded-lg p-4">
        <h4 className="text-sm font-medium mb-4">Recent Performance</h4>
        <p className="text-sm text-muted-foreground text-center py-8">
          Performance charts will appear here once the agent has completed more tasks.
        </p>
      </div>
    </div>
  );
}

function ActivityTab({ agent }: { agent: Agent }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center py-8">
        Activity feed for this agent will appear here.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    idle: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    paused: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    initializing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    blocked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    escaped: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <Badge className={cn('text-xs', colors[status as keyof typeof colors])}>
      {getAgentStatusLabel(status)}
    </Badge>
  );
}

function AgentDetailSkeleton() {
  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-start gap-4 mb-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
