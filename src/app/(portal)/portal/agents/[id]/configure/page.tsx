'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAgentRealtime, useUpdateAgent } from '@/lib/hooks/useAgents';
import { AgentConfigForm } from '@/components/dashboard/agents/configure';
import { DashboardLayout, PageContainer } from '@/components/dashboard/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { Agent } from '@/types';

// Demo tenant ID - in production, this would come from auth context
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export default function AgentConfigurePage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const { agent, loading, error } = useAgentRealtime(agentId, DEMO_TENANT_ID);
  const { updateAgent, loading: saving } = useUpdateAgent();

  const handleSave = async (updates: Partial<Agent>) => {
    await updateAgent(agentId, updates);
  };

  const handleCancel = () => {
    router.push('/portal/agents');
  };

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

  if (error || !agent) {
    return (
      <DashboardLayout>
        <PageContainer>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || 'Failed to load agent configuration'}
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
