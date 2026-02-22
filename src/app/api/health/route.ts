import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Health check endpoint for monitoring
 * Returns 200 if all systems are healthy, 503 if any check fails
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    checks: {} as Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTimeMs: number;
      error?: string;
    }>,
  };

  // Check database connectivity
  const dbStart = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (error) throw error;

    health.checks.database = {
      status: 'healthy',
      responseTimeMs: Date.now() - dbStart,
    };
  } catch (err) {
    health.checks.database = {
      status: 'unhealthy',
      responseTimeMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  // Check Supabase Auth service
  const authStart = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.auth.getSession();

    // Missing session is expected for health check
    if (error && error.message !== 'Auth session missing!') {
      throw error;
    }

    health.checks.auth = {
      status: 'healthy',
      responseTimeMs: Date.now() - authStart,
    };
  } catch (err) {
    health.checks.auth = {
      status: 'unhealthy',
      responseTimeMs: Date.now() - authStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  // Overall response time check
  const totalResponseTime = Date.now() - startTime;
  if (totalResponseTime > 1000) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${totalResponseTime}ms`,
    },
  });
}

/**
 * HEAD request for simple uptime checks
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
