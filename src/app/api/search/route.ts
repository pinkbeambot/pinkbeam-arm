import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { z } from 'zod';
import { escapeIlike } from '@/lib/utils';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(10).default(5),
});

interface SearchResult {
  id: string;
  type: 'agent' | 'task' | 'decision' | 'activity';
  title: string;
  subtitle: string;
  url: string;
  metadata?: Record<string, string>;
}

interface SearchResponse {
  query: string;
  results: {
    agents: SearchResult[];
    tasks: SearchResult[];
    decisions: SearchResult[];
    activities: SearchResult[];
  };
  total: number;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;
  const { tenantId, supabase } = auth;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = searchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid search query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { q, limit } = parsed.data;
  const searchTerm = escapeIlike(q);

  // Run all four queries in parallel
  const [agentsResult, tasksResult, decisionsResult, activitiesResult] = await Promise.all([
    // Agents: search by name and role
    supabase
      .from('agents')
      .select('id, name, role, status')
      .eq('tenant_id', tenantId)
      .or(`name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`)
      .limit(limit),

    // Tasks: search by title and description
    supabase
      .from('tasks')
      .select('id, title, status, priority')
      .eq('tenant_id', tenantId)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit),

    // Decisions: search by title and description
    supabase
      .from('decisions')
      .select('id, title, status, category')
      .eq('tenant_id', tenantId)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit),

    // Activities: search by description and type
    supabase
      .from('activities')
      .select('id, type, description, target_type, target_id, created_at')
      .eq('tenant_id', tenantId)
      .or(`description.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const agents: SearchResult[] = (agentsResult.data || []).map((a) => ({
    id: a.id,
    type: 'agent',
    title: a.name,
    subtitle: `${a.role} agent`,
    url: `/portal/agents/${a.id}/configure`,
    metadata: { status: a.status, role: a.role },
  }));

  const tasks: SearchResult[] = (tasksResult.data || []).map((t) => ({
    id: t.id,
    type: 'task',
    title: t.title,
    subtitle: `${t.priority} priority - ${t.status}`,
    url: `/portal/tasks?highlight=${t.id}`,
    metadata: { status: t.status, priority: t.priority },
  }));

  const decisions: SearchResult[] = (decisionsResult.data || []).map((d) => ({
    id: d.id,
    type: 'decision',
    title: d.title,
    subtitle: `${d.category || 'decision'} - ${d.status}`,
    url: `/portal/decisions?highlight=${d.id}`,
    metadata: { status: d.status },
  }));

  const activities: SearchResult[] = (activitiesResult.data || []).map((a) => ({
    id: a.id,
    type: 'activity',
    title: a.description || a.type,
    subtitle: `${a.target_type} activity`,
    url: `/portal/activity`,
    metadata: { type: a.type },
  }));

  const response: SearchResponse = {
    query: q,
    results: { agents, tasks, decisions, activities },
    total: agents.length + tasks.length + decisions.length + activities.length,
  };

  return NextResponse.json(response);
}
