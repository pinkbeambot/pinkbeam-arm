'use client';

import { Pause, Play, Trash2, X, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onPauseSelected: () => void;
  onResumeSelected: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  loading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onPauseSelected,
  onResumeSelected,
  onDeleteSelected,
  onSelectAll,
  onDeselectAll,
  loading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 bg-background border border-border rounded-xl shadow-lg px-4 py-3">
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDeselectAll}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          disabled={loading}
          className="text-muted-foreground"
        >
          {allSelected ? (
            <>
              <Square className="mr-1.5 h-4 w-4" />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="mr-1.5 h-4 w-4" />
              Select All ({totalCount})
            </>
          )}
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          onClick={onPauseSelected}
          disabled={loading}
        >
          <Pause className="mr-1.5 h-4 w-4" />
          Pause
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onResumeSelected}
          disabled={loading}
        >
          <Play className="mr-1.5 h-4 w-4" />
          Resume
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSelected}
          disabled={loading}
          className="text-red-600 hover:text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
