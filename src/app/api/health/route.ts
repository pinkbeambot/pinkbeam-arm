import { NextResponse } from 'next/server';
import { getConnectionMetrics } from '@/lib/supabase/service-role';

export async function GET() {
  const metrics = getConnectionMetrics();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      pooling: 'supabase-pgbouncer',
      clientSingleton: metrics.isInitialized,
      clientCreatedAt: metrics.clientCreatedAt?.toISOString() ?? null,
      requestCount: metrics.requestCount,
    },
  });
}
