'use client';

import { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { EscalationList, EscalationFilters } from '@/components/dashboard/escalations/EscalationList';
import { EscalationDetailPanel } from '@/components/dashboard/escalations/EscalationDetailPanel';
import { EscalationStatsView } from '@/components/dashboard/escalations/EscalationStats';
import { useEscalations, useEscalationStats } from '@/lib/hooks/useEscalations';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { Escalation, EscalationUrgency, EscalationType } from '@/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function EscalationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Filters state
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [urgencyFilter, setUrgencyFilter] = useState<EscalationUrgency | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EscalationType | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string | 'all'>('all');
  
  // Detail panel state
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch escalations and stats
  const { escalations, loading, error, refetch, resolveEscalation } = useEscalations({
    status: statusFilter,
    urgency: urgencyFilter,
    type: typeFilter,
    agentId: agentFilter,
  });
  
  const { stats, loading: statsLoading } = useEscalationStats();

  // Get unique agents for filter dropdown
  const agents = useMemo(() => {
    const agentMap = new Map<string, string>();
    escalations.forEach(e => {
      if (e.agent) {
        agentMap.set(e.agent_id, e.agent.name);
      }
    });
    return Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }));
  }, [escalations]);

  // Handlers
  const handleSelectEscalation = useCallback((escalation: Escalation) => {
    setSelectedEscalation(escalation);
    setDetailOpen(true);
  }, []);

  const handleResolve = useCallback(async (escalation: Escalation) => {
    try {
      await resolveEscalation(escalation.id, 'Resolved from list view', user?.id ?? '');
      toast({
        title: 'Escalation Resolved',
        description: `${escalation.title} has been marked as resolved.`,
      });
      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to resolve escalation.',
        variant: 'destructive',
      });
    }
  }, [resolveEscalation, refetch, toast]);

  const handleResolveFromPanel = useCallback(async (id: string, resolution: string) => {
    try {
      await resolveEscalation(id, resolution, user?.id ?? '');
      toast({
        title: 'Response Sent',
        description: 'Your response has been sent to the agent.',
      });
      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send response.',
        variant: 'destructive',
      });
    }
  }, [resolveEscalation, refetch, toast]);

  const handleTakeOver = useCallback(async (escalation: Escalation) => {
    try {
      await resolveEscalation(escalation.id, 'Taken over by user', user?.id ?? '');
      toast({
        title: 'Task Taken Over',
        description: `You have taken over ${escalation.title}.`,
      });
      setDetailOpen(false);
      refetch();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to take over escalation.',
        variant: 'destructive',
      });
    }
  }, [resolveEscalation, refetch, toast, user?.id]);

  const handleMarkAllRead = useCallback(() => {
    toast({
      title: 'Marked as Read',
      description: 'All escalations have been marked as read.',
    });
  }, [toast]);

  const handleEnableNotifications = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({ title: 'Not Supported', description: 'Browser notifications are not supported.', variant: 'destructive' });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast({ title: 'Notifications Enabled', description: 'You will receive browser notifications for critical escalations.' });
    } else {
      toast({ title: 'Permission Denied', description: 'Notification permission was denied. You can enable it in browser settings.', variant: 'destructive' });
    }
  }, [toast]);

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Escalation Inbox"
          description={`Manage escalations requiring your attention. ${stats.totalOpen} open escalations.`}
        >
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEnableNotifications}
            >
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          </div>
        </PageHeader>

        {/* Stats Overview */}
        <div className="mb-8">
          <EscalationStatsView stats={stats} loading={statsLoading} />
        </div>

        {/* Critical Alert Banner */}
        {stats.critical > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-200">
                {stats.critical} Critical {stats.critical === 1 ? 'Escalation' : 'Escalations'} Requiring Immediate Attention
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Critical escalations involve high-stakes decisions or urgent issues.
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                setStatusFilter('open');
                setUrgencyFilter('critical');
              }}
            >
              View Critical
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <EscalationFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            urgencyFilter={urgencyFilter}
            onUrgencyFilterChange={setUrgencyFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
            agents={agents}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              Failed to load escalations: {error.message}
            </p>
            <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* Escalation List */}
        <EscalationList
          escalations={escalations}
          loading={loading}
          selectedEscalationId={selectedEscalation?.id}
          onSelectEscalation={handleSelectEscalation}
          onResolve={handleResolve}
          onTakeOver={handleTakeOver}
        />

        {/* Detail Panel */}
        <EscalationDetailPanel
          escalation={selectedEscalation}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onResolve={handleResolveFromPanel}
          onTakeOver={handleTakeOver ? (id) => {
            const escalation = escalations.find(e => e.id === id);
            if (escalation) handleTakeOver(escalation);
          } : undefined}
        />
      </PageContainer>
    </DashboardLayout>
  );
}
