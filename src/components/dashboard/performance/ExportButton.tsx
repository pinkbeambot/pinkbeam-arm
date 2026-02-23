'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import type { DateRange, ExportOptions, PerformanceDashboardData } from './types';

function escapeCSV(val: unknown): string {
  let str = val == null ? '' : String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(data: PerformanceDashboardData, sections: Set<ExportSection>): string {
  const parts: string[] = [];
  const dateStr = new Date().toISOString().split('T')[0];
  parts.push(`# Performance Report — ${dateStr}`);
  parts.push(`# Date Range: ${data.dateRange}\n`);

  if (sections.has('metrics')) {
    parts.push('# Performance Metrics');
    parts.push('Metric,Value,Change (%),Period');
    const m = data.metrics;
    for (const card of [m.tasksCompleted, m.activeAgents, m.avgCompletionTime, m.successRate, m.totalEscalations, m.totalCost]) {
      parts.push([card.title, card.value, card.change.toFixed(1), card.changeLabel].map(escapeCSV).join(','));
    }
    parts.push('');
  }

  if (sections.has('leaderboard') && data.agentLeaderboard.length > 0) {
    parts.push('# Agent Leaderboard');
    parts.push('Rank,Agent,Role,Tasks Completed,Tasks Failed,Success Rate (%),Avg Completion (min),Escalation Rate (%),Total Cost ($)');
    for (const a of data.agentLeaderboard) {
      parts.push([
        a.rank, a.agent.name, a.agent.role, a.tasksCompleted, a.tasksFailed,
        a.successRate.toFixed(1), a.avgCompletionTime.toFixed(1),
        a.escalationRate.toFixed(1), a.totalCost.toFixed(2),
      ].map(escapeCSV).join(','));
    }
    parts.push('');
  }

  if (sections.has('roi')) {
    parts.push('# ROI Analysis');
    parts.push('Metric,Value');
    const r = data.roi;
    const roiRows: [string, string][] = [
      ['Tasks Completed', String(r.totalTasksCompleted)],
      ['Total Cost ($)', r.totalCost.toFixed(2)],
      ['Cost Per Task ($)', r.costPerTask.toFixed(2)],
      ['Tasks Per Dollar', r.tasksPerDollar.toFixed(2)],
      ['Estimated Human Hours Saved', r.estimatedHumanHoursSaved.toFixed(1)],
      ['Human Hourly Rate ($)', r.humanHourlyRate.toFixed(2)],
      ['Estimated Value Generated ($)', r.estimatedValueGenerated.toFixed(2)],
      ['ROI (%)', r.roiPercentage.toFixed(1)],
      ['Projected Monthly Cost ($)', r.projectedMonthlyCost.toFixed(2)],
      ['Projected Annual Cost ($)', r.projectedAnnualCost.toFixed(2)],
    ];
    for (const [label, value] of roiRows) {
      parts.push([label, value].map(escapeCSV).join(','));
    }
    parts.push('');
  }

  if (sections.has('bottlenecks') && data.bottlenecks.length > 0) {
    parts.push('# Bottlenecks');
    parts.push('Name,Type,Severity,Tasks Affected,Avg Wait (min),Description,Recommendation');
    for (const b of data.bottlenecks) {
      parts.push([
        b.name, b.type, b.severity, b.tasksAffected,
        b.avgWaitTime.toFixed(1), b.description, b.recommendation,
      ].map(escapeCSV).join(','));
    }
    parts.push('');
  }

  return parts.join('\n');
}

function buildJSON(data: PerformanceDashboardData, sections: Set<ExportSection>): string {
  const exportObj: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    date_range: data.dateRange,
  };

  if (sections.has('metrics')) {
    exportObj.metrics = data.metrics;
  }
  if (sections.has('leaderboard')) {
    exportObj.agent_leaderboard = data.agentLeaderboard.map(a => ({
      rank: a.rank,
      agent_name: a.agent.name,
      agent_role: a.agent.role,
      tasks_completed: a.tasksCompleted,
      tasks_failed: a.tasksFailed,
      success_rate: a.successRate,
      avg_completion_time_min: a.avgCompletionTime,
      escalation_rate: a.escalationRate,
      total_cost: a.totalCost,
    }));
  }
  if (sections.has('roi')) {
    exportObj.roi = data.roi;
  }
  if (sections.has('bottlenecks')) {
    exportObj.bottlenecks = data.bottlenecks;
  }

  return JSON.stringify(exportObj, null, 2);
}

type ExportSection = ExportOptions['sections'][number];

interface ExportButtonProps {
  dateRange: DateRange;
  data?: PerformanceDashboardData | null;
  className?: string;
  disabled?: boolean;
}

export function ExportButton({ dateRange, data, className, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const [selectedSections, setSelectedSections] = React.useState<Set<ExportSection>>(
    new Set<ExportSection>(['metrics', 'leaderboard', 'roi', 'bottlenecks'])
  );

  const toggleSection = (section: ExportSection) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!data) return;
    setIsExporting(true);

    try {
      const content = format === 'csv'
        ? buildCSV(data, selectedSections)
        : buildJSON(data, selectedSections);

      const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
      const blob = new Blob([content], { type: mimeType });
      const dateStr = new Date().toISOString().split('T')[0];

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${dateRange}-${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-2", className)}
          disabled={isExporting || disabled}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Sections to include:</p>
          <DropdownMenuCheckboxItem
            checked={selectedSections.has('metrics')}
            onCheckedChange={() => toggleSection('metrics')}
          >
            Performance Metrics
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={selectedSections.has('leaderboard')}
            onCheckedChange={() => toggleSection('leaderboard')}
          >
            Agent Leaderboard
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={selectedSections.has('roi')}
            onCheckedChange={() => toggleSection('roi')}
          >
            ROI Analysis
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={selectedSections.has('bottlenecks')}
            onCheckedChange={() => toggleSection('bottlenecks')}
          >
            Bottlenecks
          </DropdownMenuCheckboxItem>
        </div>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          disabled={selectedSections.size === 0 || !data}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('json')}
          disabled={selectedSections.size === 0 || !data}
          className="gap-2"
        >
          <Download className="h-4 w-4 text-blue-600" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
