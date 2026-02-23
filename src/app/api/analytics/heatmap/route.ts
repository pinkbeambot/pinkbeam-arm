import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import type { ActivityHeatmapData, HeatmapCell } from '@/types/advanced-analytics';

const querySchema = z.object({
  type: z.enum(['hourly', 'daily', 'weekly']).default('hourly'),
  metric: z.enum(['tasks', 'cost', 'activity']).default('activity'),
  days: z.string().default('30'),
});

/**
 * GET /api/analytics/heatmap
 * Returns heatmap data for activity patterns
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const validatedQuery = querySchema.parse({
      type: searchParams.get('type') || 'hourly',
      metric: searchParams.get('metric') || 'activity',
      days: searchParams.get('days') || '30',
    });

    const days = parseInt(validatedQuery.days);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    let heatmapData: ActivityHeatmapData;

    switch (validatedQuery.type) {
      case 'hourly':
        heatmapData = await generateHourlyHeatmap(supabase, tenantId, startDate, validatedQuery.metric);
        break;
      case 'daily':
        heatmapData = await generateDailyHeatmap(supabase, tenantId, startDate, validatedQuery.metric);
        break;
      case 'weekly':
        heatmapData = await generateWeeklyHeatmap(supabase, tenantId, startDate, validatedQuery.metric);
        break;
      default:
        heatmapData = await generateHourlyHeatmap(supabase, tenantId, startDate, validatedQuery.metric);
    }

    return NextResponse.json({ data: heatmapData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in GET /api/analytics/heatmap:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate hourly activity heatmap (24 hours x 7 days)
 */
async function generateHourlyHeatmap(
  supabase: any,
  tenantId: string,
  startDate: Date,
  metric: string
): Promise<ActivityHeatmapData> {
  const { data, error } = await supabase
    .from('activities')
    .select('created_at, type')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Initialize 24 hours x 7 days grid
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

  // Aggregate data
  data?.forEach((activity: any) => {
    const date = new Date(activity.created_at);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    grid[dayOfWeek][hour]++;
  });

  // Find max for normalization
  const maxValue = Math.max(...grid.flat());
  const minValue = Math.min(...grid.flat());

  // Create cells
  const cells: HeatmapCell[] = [];
  grid.forEach((dayData, dayIndex) => {
    dayData.forEach((value, hourIndex) => {
      const intensity = value === 0 ? 'low' 
        : value < maxValue * 0.25 ? 'low'
        : value < maxValue * 0.5 ? 'medium'
        : value < maxValue * 0.75 ? 'high'
        : 'critical';
      
      cells.push({
        x: hours[hourIndex],
        y: days[dayIndex],
        value,
        intensity
      });
    });
  });

  return {
    type: 'hourly',
    cells,
    xLabels: hours,
    yLabels: days,
    maxValue,
    minValue
  };
}

/**
 * Generate daily heatmap (days x categories)
 */
async function generateDailyHeatmap(
  supabase: any,
  tenantId: string,
  startDate: Date,
  metric: string
): Promise<ActivityHeatmapData> {
  const { data, error } = await supabase
    .from('activities')
    .select('created_at, category, type')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Get unique categories
  const categories = ['task', 'decision', 'agent', 'escalation', 'system'];
  const days: string[] = [];
  const daySet = new Set<string>();

  // Generate day labels
  data?.forEach((activity: any) => {
    const date = new Date(activity.created_at);
    const dayKey = date.toISOString().split('T')[0];
    daySet.add(dayKey);
  });
  daySet.forEach(d => days.push(d));
  days.sort();

  // Initialize grid
  const grid: number[][] = Array.from({ length: categories.length }, () => 
    Array.from({ length: days.length }, () => 0)
  );

  // Aggregate data
  data?.forEach((activity: any) => {
    const date = new Date(activity.created_at);
    const dayKey = date.toISOString().split('T')[0];
    const dayIndex = days.indexOf(dayKey);
    const categoryIndex = categories.indexOf(activity.category);
    
    if (dayIndex >= 0 && categoryIndex >= 0) {
      grid[categoryIndex][dayIndex]++;
    }
  });

  const maxValue = Math.max(...grid.flat());
  const minValue = Math.min(...grid.flat());

  const cells: HeatmapCell[] = [];
  grid.forEach((categoryData, catIndex) => {
    categoryData.forEach((value, dayIndex) => {
      const intensity = value === 0 ? 'low' 
        : value < maxValue * 0.25 ? 'low'
        : value < maxValue * 0.5 ? 'medium'
        : value < maxValue * 0.75 ? 'high'
        : 'critical';
      
      cells.push({
        x: days[dayIndex].slice(5), // MM-DD
        y: categories[catIndex],
        value,
        intensity
      });
    });
  });

  return {
    type: 'daily',
    cells,
    xLabels: days.map(d => d.slice(5)),
    yLabels: categories,
    maxValue,
    minValue
  };
}

/**
 * Generate weekly heatmap (weeks x metrics)
 */
async function generateWeeklyHeatmap(
  supabase: any,
  tenantId: string,
  startDate: Date,
  metric: string
): Promise<ActivityHeatmapData> {
  const { data, error } = await supabase
    .from('agent_performance_daily')
    .select('date, tasks_completed, tasks_failed, total_cost_usd, success_rate')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;

  const metrics = ['tasks_completed', 'tasks_failed', 'success_rate', 'cost'];
  const weeks: string[] = [];
  const weekData: Record<string, Record<string, number>> = {};

  // Group by week
  data?.forEach((row: any) => {
    const date = new Date(row.date);
    const weekKey = getWeekKey(date);
    
    if (!weekData[weekKey]) {
      weekData[weekKey] = { tasks_completed: 0, tasks_failed: 0, success_rate: 0, cost: 0, count: 0 };
      weeks.push(weekKey);
    }
    
    weekData[weekKey].tasks_completed += row.tasks_completed || 0;
    weekData[weekKey].tasks_failed += row.tasks_failed || 0;
    weekData[weekKey].success_rate += parseFloat(row.success_rate || '0');
    weekData[weekKey].cost += parseFloat(row.total_cost_usd || '0');
    weekData[weekKey].count++;
  });

  // Normalize
  weeks.forEach(week => {
    if (weekData[week].count > 0) {
      weekData[week].success_rate /= weekData[week].count;
    }
  });

  // Create grid
  const grid: number[][] = metrics.map(m => 
    weeks.map(w => weekData[w][m] || 0)
  );

  const maxValue = Math.max(...grid.flat());
  const minValue = Math.min(...grid.flat());

  const cells: HeatmapCell[] = [];
  grid.forEach((metricData, mIndex) => {
    metricData.forEach((value, wIndex) => {
      const intensity = value === 0 ? 'low' 
        : value < maxValue * 0.25 ? 'low'
        : value < maxValue * 0.5 ? 'medium'
        : value < maxValue * 0.75 ? 'high'
        : 'critical';
      
      cells.push({
        x: weeks[wIndex],
        y: metrics[mIndex].replace('_', ' '),
        value: Math.round(value * 100) / 100,
        intensity
      });
    });
  });

  return {
    type: 'weekly',
    cells,
    xLabels: weeks,
    yLabels: metrics.map(m => m.replace('_', ' ')),
    maxValue,
    minValue
  };
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDays = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
  return `W${weekNum}`;
}
