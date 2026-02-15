'use client';

import { Bot } from 'lucide-react';
import type { Agent, AgentStatus, ViewMode, SortField, SortOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentGridView } from './AgentGridView';
import { AgentTableView } from './AgentTableView';

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  viewMode: ViewMode;
  selectedAgentId?: string;
  onSelectAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onToggleStatus: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
}

export function AgentList({
  agents,
  loading,
  viewMode,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onToggleStatus,
  onDeleteAgent,
}: AgentListProps) {
  if (loading) {
    return <AgentListSkeleton viewMode={viewMode} />;
  }

  if (agents.length === 0) {
    return <EmptyAgentState />;
  }

  return viewMode === 'grid' ? (
    <AgentGridView
      agents={agents}
      selectedAgentId={selectedAgentId}
      onSelectAgent={onSelectAgent}
      onEditAgent={onEditAgent}
      onToggleStatus={onToggleStatus}
      onDeleteAgent={onDeleteAgent}
    />
  ) : (
    <AgentTableView
      agents={agents}
      selectedAgentId={selectedAgentId}
      onSelectAgent={onSelectAgent}
      onEditAgent={onEditAgent}
      onToggleStatus={onToggleStatus}
      onDeleteAgent={onDeleteAgent}
    />
  );
}

function AgentListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <div className="p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyAgentState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <Bot className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No agents yet
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Create your first AI agent to start building your workforce. 
        Agents can handle tasks, make decisions, and collaborate autonomously.
      </p>
    </div>
  );
}

// Re-export from AgentListHeader for backwards compatibility
export { AgentListHeader, AgentListHeader as AgentFilters, filterAndSortAgents } from './AgentListHeader';
