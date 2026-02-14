'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Users, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { AgentList, AgentFilters, filterAndSortAgents } from '@/components/dashboard/agents/AgentList';
import { AgentDetailPanel } from '@/components/dashboard/agents/AgentDetailPanel';
import { CreateAgentModal } from '@/components/dashboard/agents/CreateAgentModal';
import { AgentHierarchy } from '@/components/agents';
import { ChatPanel } from '@/components/chat';
import { useAgentsRealtime, useUpdateAgent, useDeleteAgent, useCreateAgent } from '@/lib/hooks/useAgents';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Agent, AgentStatus, AgentRole, ViewMode, SortField, SortOrder, CreateAgentInput } from '@/types';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export default function AgentsPage() {
  const { toast } = useToast();
  const { agents, loading, error, refetch } = useAgentsRealtime(DEMO_TENANT_ID);
  const { updateAgent, loading: updateLoading } = useUpdateAgent();
  const { deleteAgent, loading: deleteLoading } = useDeleteAgent();
  const { createAgent, loading: createLoading } = useCreateAgent();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<AgentRole | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);

  const filteredAgents = useMemo(() => 
    filterAndSortAgents(agents, searchQuery, statusFilter, roleFilter, sortField, sortOrder),
    [agents, searchQuery, statusFilter, roleFilter, sortField, sortOrder]
  );

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setDetailOpen(true);
  }, []);

  const handleCreateAgent = useCallback(async (data: CreateAgentInput) => {
    try {
      await createAgent({ ...data, tenant_id: DEMO_TENANT_ID });
      toast({ title: 'Agent Created', description: `${data.name} has been created.` });
      setCreateModalOpen(false);
      refetch();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create agent.', variant: 'destructive' });
      throw err;
    }
  }, [createAgent, refetch, toast]);

  const stats = useMemo(() => ({
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    idle: agents.filter(a => a.status === 'idle').length,
    paused: agents.filter(a => a.status === 'paused').length,
    error: agents.filter(a => a.status === 'error').length,
  }), [agents]);

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Agent Roster"
          description={`Manage your AI workforce. ${stats.total} agent${stats.total !== 1 ? 's' : ''} total.`}
        >
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </PageHeader>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} icon={Users} />
          <StatCard label="Active" value={stats.active} color="emerald" />
          <StatCard label="Idle" value={stats.idle} color="amber" />
          <StatCard label="Paused" value={stats.paused} color="slate" />
          <StatCard label="Error" value={stats.error} color="red" />
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-flex">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agent List
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Hierarchy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <AgentFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortField={sortField}
              onSortFieldChange={setSortField}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">Failed to load agents: {error.message}</p>
                <Button variant="outline" size="sm" onClick={refetch} className="mt-2">Retry</Button>
              </div>
            )}
            <AgentList
              agents={filteredAgents}
              loading={loading}
              viewMode={viewMode}
              selectedAgentId={selectedAgent?.id}
              onSelectAgent={handleSelectAgent}
            />
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">Failed to load agents: {error.message}</p>
                <Button variant="outline" size="sm" onClick={refetch} className="mt-2">Retry</Button>
              </div>
            )}
            <div className="border rounded-lg bg-card" style={{ height: '600px' }}>
              <AgentHierarchy agents={agents} selectedAgentId={selectedAgent?.id} onSelectAgent={handleSelectAgent} showStats={true} />
            </div>
          </TabsContent>
        </Tabs>

        <AgentDetailPanel
          agent={selectedAgent}
          loading={updateLoading || deleteLoading}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />

        <CreateAgentModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreate={handleCreateAgent}
          loading={createLoading}
          existingAgents={agents}
        />

        <ChatPanel chatId={null} agentId={chatAgentId || undefined} open={chatOpen} onOpenChange={setChatOpen} />
      </PageContainer>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon: Icon, color = 'gray' }: { label: string; value: number; icon?: React.ElementType; color?: 'gray' | 'emerald' | 'amber' | 'slate' | 'red'; }) {
  const colorClasses = {
    gray: 'bg-card border-border',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    slate: 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800',
    red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  };
  const textColors = {
    gray: 'text-foreground',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    slate: 'text-slate-600 dark:text-slate-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={cn('border rounded-lg p-4', colorClasses[color])}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn('h-4 w-4', textColors[color])} />}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold mt-1', textColors[color])}>{value}</p>
    </div>
  );
}
