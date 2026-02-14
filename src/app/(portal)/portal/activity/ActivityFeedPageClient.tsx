'use client';

import { PortalLayout, PageContainer, PageHeader } from "@/components/dashboard/layout";
import { ActivityFeed } from "@/components/dashboard/activity";

export function ActivityFeedPageClient() {
  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Activity Feed"
          description="Real-time stream of everything happening in your AI workforce"
        />
        
        <ActivityFeed
          className="w-full"
          showFilters={true}
          maxHeight="calc(100vh - 280px)"
          realtime={true}
          autoScroll={true}
          onEventClick={(event) => {
            // Navigate to the related entity based on event type
            if (event.target) {
              switch (event.target.type) {
                case 'task':
                  // Navigate to task detail
                  window.location.href = `/portal/tasks/${event.target.id}`;
                  break;
                case 'decision':
                  // Navigate to decision detail
                  window.location.href = `/portal/decisions/${event.target.id}`;
                  break;
                case 'escalation':
                  // Navigate to escalation detail
                  window.location.href = `/portal/escalations/${event.target.id}`;
                  break;
                case 'agent':
                  // Navigate to agent profile
                  window.location.href = `/portal/agents/${event.target.id}`;
                  break;
              }
            }
          }}
        />
      </PageContainer>
    </PortalLayout>
  );
}
