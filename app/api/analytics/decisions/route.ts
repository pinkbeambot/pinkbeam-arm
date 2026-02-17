import { NextRequest } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { z } from 'zod';

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  categories: z.string().optional(),
});

const DECISION_CATEGORIES = ['action', 'resource', 'escalation', 'strategy'];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isErrorResponse(auth)) return auth;

  const { tenantId, supabase } = auth;

  try {
    const { searchParams } = new URL(request.url);
    
    const validationResult = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.format());
    }

    const { from, to, categories } = validationResult.data;
    
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;

    const categoryList = categories ? categories.split(',').filter(c => DECISION_CATEGORIES.includes(c)) : [];

    let decisionQuery = supabase
      .from('decisions')
      .select('status, category, confidence, created_at, executed_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (categoryList.length > 0) {
      decisionQuery = decisionQuery.in('category', categoryList);
    }

    const { data: decisions, error: decisionsError } = await decisionQuery;

    if (decisionsError) {
      console.error('Decision analytics fetch error:', decisionsError);
      return apiError('Failed to fetch decision data', 500, decisionsError.message);
    }

    const decisionList = decisions || [];

    const categoriesMetrics = DECISION_CATEGORIES.map(category => {
      const categoryDecisions = decisionList.filter(d => d.category === category);
      const total = categoryDecisions.length;
      const approved = categoryDecisions.filter(d => d.status === 'approved' || d.status === 'executed').length;
      const rejected = categoryDecisions.filter(d => d.status === 'rejected').length;
      const overridden = categoryDecisions.filter(d => d.status === 'overridden').length;
      
      const decidedCount = approved + rejected + overridden;
      
      return {
        category,
        total,
        approved,
        rejected,
        overridden,
        approvalRate: decidedCount > 0 ? Math.round((approved / decidedCount) * 1000) / 10 : 0,
      };
    }).filter(c => c.total > 0 || categoryList.length === 0);

    const dateMap = new Map<string, { proposed: number; approved: number; rejected: number; overridden: number }>();
    
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dateMap.set(dateKey, { proposed: 0, approved: 0, rejected: 0, overridden: 0 });
    }

    decisionList.forEach(decision => {
      const dateKey = new Date(decision.created_at).toISOString().split('T')[0];
      const dayData = dateMap.get(dateKey);
      if (dayData) {
        dayData.proposed++;
        if (decision.status === 'approved' || decision.status === 'executed') {
          dayData.approved++;
        } else if (decision.status === 'rejected') {
          dayData.rejected++;
        } else if (decision.status === 'overridden') {
          dayData.overridden++;
        }
      }
    });

    const trends = Array.from(dateMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalDecisions = decisionList.length;
    const approvedCount = decisionList.filter(d => d.status === 'approved' || d.status === 'executed').length;
    const rejectedCount = decisionList.filter(d => d.status === 'rejected').length;
    const overriddenCount = decisionList.filter(d => d.status === 'overridden').length;
    const pendingCount = decisionList.filter(d => d.status === 'proposed').length;
    
    const decidedCount = approvedCount + rejectedCount + overriddenCount;
    const overallApprovalRate = decidedCount > 0 ? (approvedCount / decidedCount) * 100 : 0;
    
    const confidenceScores = decisionList
      .filter(d => d.confidence !== null && d.confidence !== undefined)
      .map(d => d.confidence);
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    return apiSuccess({
      categories: categoriesMetrics,
      trends,
      summary: {
        totalDecisions,
        approvedCount,
        rejectedCount,
        overriddenCount,
        pendingCount,
        overallApprovalRate: Math.round(overallApprovalRate * 100) / 100,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      },
    });
  } catch (err) {
    console.error('Decision analytics exception:', err);
    return apiError('Internal server error', 500);
  }
}
