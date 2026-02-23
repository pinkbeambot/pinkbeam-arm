'use client';

import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { ValisChat } from '@/components/valis/ValisChat';

export default function ValisPage() {
  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="VALIS"
          description="Your AI command interface for managing the agent workforce."
        />
        <ValisChat />
      </PageContainer>
    </PortalLayout>
  );
}
