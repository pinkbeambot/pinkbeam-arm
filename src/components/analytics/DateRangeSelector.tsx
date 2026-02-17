'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRange, DateRangePreset } from '@/types/analytics';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setIsCustomOpen(true);
      return;
    }

    const now = new Date();
    let from: Date;

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    onChange({ from, to: now, preset });
  };

  const handleCustomDateChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      onChange({ from: range.from, to: range.to, preset: 'custom' });
    }
  };

  const currentPreset = value.preset || '30d';
  const displayText = currentPreset === 'custom' 
    ? `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d')}`
    : presets.find(p => p.value === currentPreset)?.label || 'Last 30 days';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={currentPreset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom...</SelectItem>
        </SelectContent>
      </Select>

      {currentPreset === 'custom' && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[240px] justify-start text-left font-normal',
                !value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.from}
              selected={{
                from: value.from,
                to: value.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  handleCustomDateChange({ from: range.from, to: range.to });
                  setIsCustomOpen(false);
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
