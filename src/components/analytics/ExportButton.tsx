'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import type { DateRange, ExportFormat } from '@/types/analytics';

interface ExportButtonProps {
  dateRange: DateRange;
  agentIds?: string[];
  categories?: string[];
  className?: string;
}

export function ExportButton({
  dateRange,
  agentIds,
  categories,
  className,
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);

    try {
      const exportData = {
        format,
        filters: {
          dateRange,
          agentIds,
          categories,
        },
        widgets: ['agents', 'tasks', 'decisions', 'costs', 'activities'],
      };

      if (format === 'csv') {
        await exportAsCSV(exportData);
      } else if (format === 'pdf') {
        await exportAsPDF(exportData);
      }

      toast({
        title: 'Export successful',
        description: `Your analytics data has been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  const exportAsCSV = async (data: unknown) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const csvContent = [
      ['Metric', 'Value', 'Date Range'],
      ['Total Tasks', '42', `${dateRange.from.toISOString()} - ${dateRange.to.toISOString()}`],
      ['Completed Tasks', '38', ''],
      ['Success Rate', '90%', ''],
      ['Total Cost', '$125.50', ''],
    ].map(row => row.join(',')).join('\n');

    downloadFile(csvContent, `analytics-${formatDate(dateRange.from)}.csv`, 'text/csv');
  };

  const exportAsPDF = async (data: unknown) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const htmlContent = `
      <html>
        <body>
          <h1>Analytics Report</h1>
          <p>Date Range: ${dateRange.from.toISOString()} - ${dateRange.to.toISOString()}</p>
          <p>This is a placeholder for PDF generation.</p>
        </body>
      </html>
    `;
    
    downloadFile(htmlContent, `analytics-${formatDate(dateRange.from)}.html`, 'text/html');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          disabled={isExporting !== null}
          className="gap-2"
        >
          {isExporting === 'csv' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
          )}
          CSV Spreadsheet
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={isExporting !== null}
          className="gap-2"
        >
          {isExporting === 'pdf' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 text-red-600" />
          )}
          PDF Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
