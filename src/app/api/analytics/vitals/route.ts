/**
 * Web Vitals API Route
 * 
 * Receives performance metrics from the client for monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();

    // Validate metric structure
    if (!metric.name || typeof metric.value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric format' },
        { status: 400 }
      );
    }

    // Log metric (in production, send to analytics service)
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to DataDog, New Relic, etc.
      // await sendToAnalytics(metric);
      
      // For now, log to console in structured format
      console.log(JSON.stringify({
        type: 'web-vital',
        timestamp: new Date().toISOString(),
        ...metric,
      }));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing web vital:', error);
    return NextResponse.json(
      { error: 'Failed to process metric' },
      { status: 500 }
    );
  }
}
