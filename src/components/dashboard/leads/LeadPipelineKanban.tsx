'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { LeadCard, LeadCardSkeleton } from './LeadCard';
import type { Lead, LeadStage } from '@/types';

// ============================================================================
// Stage Configuration
// ============================================================================

const STAGE_CONFIG: Record<LeadStage, { label: string; color: string; bgColor: string }> = {
  prospect: { 
    label: 'Prospect', 
    color: 'text-slate-600 dark:text-slate-400', 
    bgColor: 'bg-slate-100 dark:bg-slate-800/50' 
  },
  contacted: { 
    label: 'Contacted', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20' 
  },
  responded: { 
    label: 'Responded', 
    color: 'text-yellow-600 dark:text-yellow-400', 
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' 
  },
  qualified: { 
    label: 'Qualified', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-50 dark:bg-purple-900/20' 
  },
  meeting_booked: { 
    label: 'Meeting Booked', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-50 dark:bg-green-900/20' 
  },
  closed_won: { 
    label: 'Closed Won', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' 
  },
  closed_lost: { 
    label: 'Closed Lost', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-50 dark:bg-red-900/20' 
  },
  nurture: { 
    label: 'Nurture', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-50 dark:bg-orange-900/20' 
  },
};

const PIPELINE_STAGES: LeadStage[] = [
  'prospect',
  'contacted',
  'responded',
  'qualified',
  'meeting_booked',
];

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  stage: LeadStage;
  leads: Lead[];
  isLoading?: boolean;
  onLeadClick: (lead: Lead) => void;
}

function KanbanColumn({ stage, leads, isLoading, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { stage },
  });

  const config = STAGE_CONFIG[stage];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-lg border transition-colors',
        config.bgColor,
        isOver ? 'ring-2 ring-primary ring-offset-2' : 'border-border'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h3 className={cn('font-semibold text-sm', config.color)}>
            {config.label}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {leads.length}
          </Badge>
        </div>
      </div>

      {/* Lead Cards */}
      <div className="flex-1 p-3 space-y-3 min-h-[200px]">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {isLoading ? (
            <>
              <LeadCardSkeleton />
              <LeadCardSkeleton />
              <LeadCardSkeleton />
            </>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyPipelineState({ onAskMike }: { onAskMike: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-pink-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No leads in your pipeline
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Your pipeline is empty. Ask Mike to find leads for you, or add leads manually to get started.
      </p>
      <button
        onClick={onAskMike}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg shadow-pink-500/25"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        Ask Mike to find leads
      </button>
    </div>
  );
}

// ============================================================================
// Lead Pipeline Kanban Component
// ============================================================================

interface LeadPipelineKanbanProps {
  leads: Lead[];
  isLoading?: boolean;
  onLeadClick: (lead: Lead) => void;
  onLeadMove?: (leadId: string, newStage: LeadStage) => void;
  onAskMike: () => void;
}

export function LeadPipelineKanban({
  leads,
  isLoading,
  onLeadClick,
  onLeadMove,
  onAskMike,
}: LeadPipelineKanbanProps) {
  const leadsByStage = React.useMemo(() => {
    const grouped: Record<LeadStage, Lead[]> = {
      prospect: [],
      contacted: [],
      responded: [],
      qualified: [],
      meeting_booked: [],
      closed_won: [],
      closed_lost: [],
      nurture: [],
    };

    leads.forEach((lead) => {
      if (grouped[lead.stage]) {
        grouped[lead.stage].push(lead);
      }
    });

    // Sort each stage by score (highest first) then by created_at (newest first)
    Object.keys(grouped).forEach((stage) => {
      grouped[stage as LeadStage].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    return grouped;
  }, [leads]);

  const hasLeads = leads.length > 0;

  if (!isLoading && !hasLeads) {
    return <EmptyPipelineState onAskMike={onAskMike} />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          leads={leadsByStage[stage]}
          isLoading={isLoading}
          onLeadClick={onLeadClick}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Loading
// ============================================================================

export function LeadPipelineKanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => (
        <div
          key={stage}
          className="flex flex-col min-w-[280px] max-w-[320px] rounded-lg border border-border bg-muted/50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-5 w-8 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex-1 p-3 space-y-3 min-h-[200px]">
            <LeadCardSkeleton />
            <LeadCardSkeleton />
            <LeadCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}
