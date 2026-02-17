'use client';

import { Bot } from 'lucide-react';
import type { Agent, ViewMode } from '@/types';
import { AgentGridView } from './AgentGridView';
import { AgentTableView } from './AgentTableView';
import { AgentCardSkeleton, SkeletonList } from '@/components/loading';
import { EmptyState } from '@/components/empty';

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  viewMode: ViewMode;
  selectedAgentId?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (agentId: string) => void;
  onSelectAll?: () => void;
  onSelectAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onToggleStatus?: (agent: Agent) => void;
  onDeleteAgent?: (agent: Agent) => void;
  onCloneAgent: (agent: Agent) => void;
  onCreateAgent?: () => void;
  canCreate?: boolean;
}

/**
 * AgentList - Displays a list of agents with loading and empty states
 * 
 * Features:
 * - Grid and table view modes
 * - Skeleton loading states that match the UI layout
 * - Empty state with CTA for creating first agent
 * - Selection support for bulk actions
 */
export function AgentList({
  agents,
  loading,
  viewMode,
  selectedAgentId,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onSelectAgent,
  onEditAgent,
  onToggleStatus,
  onDeleteAgent,
  onCloneAgent,
  onCreateAgent,
  canCreate = false,
}: AgentListProps) {
  if (loading) {
    return <AgentListSkeleton viewMode={viewMode} />;
  }

  if (agents.length === 0) {
    return (
      <EmptyAgentState 
        onCreateAgent={onCreateAgent} 
        canCreate={canCreate} 
      />
    );
  }

  return viewMode === 'grid' ? (
    <AgentGridView
      agents={agents}
      selectedAgentId={selectedAgentId}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAgent={onSelectAgent}
      onEditAgent={onEditAgent}
      onToggleStatus={onToggleStatus ?? undefined}
      onDeleteAgent={onDeleteAgent ?? undefined}
      onCloneAgent={onCloneAgent}
    />
  ) : (
    <AgentTableView
      agents={agents}
      selectedAgentId={selectedAgentId}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
      onSelectAgent={onSelectAgent}
      onEditAgent={onEditAgent}
      onToggleStatus={onToggleStatus ?? undefined}
      onDeleteAgent={onDeleteAgent ?? undefined}
      onCloneAgent={onCloneAgent}
    />
  );
}

/**
 * AgentListSkeleton - Loading placeholder that matches agent list layout
 * Prevents layout shift during loading
 */
function AgentListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <SkeletonList count={6} />
  );
}

/**
 * EmptyAgentState - Displayed when no agents exist
 * Provides helpful copy and CTA to create first agent
 */
interface EmptyAgentStateProps {
  onCreateAgent?: () => void;
  canCreate?: boolean;
}

function EmptyAgentState({ onCreateAgent, canCreate }: EmptyAgentStateProps) {
  return (
    <EmptyState
      icon={Bot}
      title="No agents yet"
      description="Create your first AI agent to start building your workforce. Agents can handle tasks, make decisions, and collaborate autonomously."
      action={
        canCreate && onCreateAgent
          ? {
              label: 'Create Agent',
              onClick: onCreateAgent,
            }
          : undefined
      }
    />
  );
}

// Re-export from AgentListHeader for backwards compatibility
export { AgentListHeader, AgentListHeader as AgentFilters, filterAndSortAgents } from './AgentListHeader';
