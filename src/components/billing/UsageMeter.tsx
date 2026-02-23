'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number | null;
  unit?: string;
  className?: string;
}

export function UsageMeter({ label, current, limit, unit, className }: UsageMeterProps) {
  const isUnlimited = limit === null;
  const percent = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percent >= 80;
  const isAtLimit = !isUnlimited && percent >= 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          'font-medium',
          isAtLimit && 'text-red-600',
          isNearLimit && !isAtLimit && 'text-amber-600',
        )}>
          {current}{unit ? ` ${unit}` : ''} / {isUnlimited ? 'Unlimited' : `${limit}${unit ? ` ${unit}` : ''}`}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percent}
          className={cn(
            'h-2',
            isAtLimit && '[&>div]:bg-red-500',
            isNearLimit && !isAtLimit && '[&>div]:bg-amber-500',
          )}
        />
      )}
      {isUnlimited && (
        <div className="h-2 w-full rounded-full bg-secondary">
          <div className="h-full rounded-full bg-green-500/30" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}
