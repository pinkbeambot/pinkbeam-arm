'use client';

import { Gauge, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ConfidenceLevel = 'all' | 'high' | 'medium' | 'low';

interface ConfidenceFilterProps {
  confidenceFilter: ConfidenceLevel;
  onConfidenceFilterChange: (level: ConfidenceLevel) => void;
}

export const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string; color: string; min: number; max: number }[] = [
  { value: 'all', label: 'All Levels', color: 'bg-gray-500', min: 0, max: 100 },
  { value: 'high', label: 'High (>80%)', color: 'bg-green-500', min: 80, max: 100 },
  { value: 'medium', label: 'Medium (50-80%)', color: 'bg-amber-500', min: 50, max: 80 },
  { value: 'low', label: 'Low (<50%)', color: 'bg-red-500', min: 0, max: 50 },
];

export function ConfidenceFilter({ confidenceFilter, onConfidenceFilterChange }: ConfidenceFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Gauge className="h-4 w-4" />
          <span>Confidence</span>
          {confidenceFilter !== 'all' && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              1
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Filter by Confidence</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CONFIDENCE_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={confidenceFilter === option.value}
            onCheckedChange={() => onConfidenceFilterChange(option.value)}
          >
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', option.color)} />
              {option.label}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
