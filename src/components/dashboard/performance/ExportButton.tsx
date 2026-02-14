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
  FileText,
  Check,
  Loader2,
} from 'lucide-react';
import type { DateRange, ExportOptions } from './types';

interface ExportButtonProps {
  dateRange: DateRange;
  className?: string;
  disabled?: boolean;
}

export function ExportButton({ dateRange, className, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const [selectedSections, setSelectedSections] = React.useState<Set<string>>(
    new Set(['metrics', 'leaderboard', 'roi', 'bottlenecks'])
  );

  const toggleSection = (section: string) => {
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

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const exportData: ExportOptions = {
      format,
      sections: Array.from(selectedSections) as any,
      dateRange,
    };

    // In a real implementation, this would call an API endpoint
    console.log('Exporting:', exportData);

    // Create a mock download
    const blob = format === 'csv' 
      ? new Blob(['Performance Report\nDate Range: ' + dateRange], { type: 'text/csv' })
      : new Blob(['Performance Report PDF'], { type: 'application/pdf' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${dateRange}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
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
          disabled={selectedSections.size === 0}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={selectedSections.size === 0}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-red-600" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
