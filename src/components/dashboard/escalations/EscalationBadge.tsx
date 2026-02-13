'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface EscalationBadgeProps {
  className?: string;
}

export function EscalationBadge({ className }: EscalationBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Simulate fetching escalation count
    // In real implementation, this would call an API
    const fetchCount = async () => {
      // Mock: 3 open escalations
      setCount(3);
    };

    fetchCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span className={cn(
      "bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium animate-pulse-subtle",
      className
    )}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
