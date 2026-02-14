/**
 * Real-time Metrics Page
 * 
 * Next.js page route for the real-time metrics dashboard.
 * Located at /portal/metrics
 */

import { RealtimeMetricsDashboard } from '@/components/dashboard/metrics';
import { PageContainer, PageHeader } from '@/components/dashboard/layout';
import { DashboardLayout } from '@/components/dashboard/layout';

export const metadata = {
  title: 'Real-time Metrics | Pink Beam ARM',
  description: 'Live agent performance metrics and system health monitoring',
};

export default function MetricsPage() {
  return (
    <DashboardLayout>
      <PageContainer>
        <RealtimeMetricsDashboard />
      </PageContainer>
    </DashboardLayout>
  );
}
