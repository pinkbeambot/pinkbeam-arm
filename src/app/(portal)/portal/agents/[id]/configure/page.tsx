'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAgentRealtime, useUpdateAgent } from '@/lib/hooks/useAgents';
import { useTenant } from '@/lib/hooks/useTenant';
import { AgentConfigForm } from '@/components/dashboard/agents/configure';
import { DashboardLayout, PageContainer } from '@/components/dashboard/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { Agent } from '@/types';

export default function AgentConfigurePage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenant();

  const { agent, loading: agentLoading, error } = useAgentRealtime(agentId, tenantId);
  const { updateAgent, loading: saving } = useUpdateAgent();

  const handleSave = async (updates: Partial<Agent>) => {
    await updateAgent(agentId, updates);
  };

  const handleCancel = () => {
    router.push('/portal/agents');
  };

  const loading = agentLoading || tenantLoading;

  if (loading) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-[600px] w-full" />
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  if (tenantError || error || !agent) {
    return (
      <DashboardLayout>
        <PageContainer>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {tenantError?.message || error?.message || 'Failed to load agent configuration'}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/agents')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
        </PageContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)]">
        <AgentConfigForm
          agent={agent}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={saving}
        />
      </div>
    </DashboardLayout>
  );
}
