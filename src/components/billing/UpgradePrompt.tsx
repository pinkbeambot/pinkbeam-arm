'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  resource: string;
  current: number;
  limit: number;
}

export function UpgradePrompt({ resource, current, limit }: UpgradePromptProps) {
  const isAtLimit = current >= limit;
  const isNearLimit = current >= limit * 0.8;

  if (!isNearLimit) return null;

  return (
    <Alert variant={isAtLimit ? 'destructive' : 'default'} className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5" />
        <div>
          <AlertTitle className="text-sm font-medium">
            {isAtLimit
              ? `${resource} limit reached`
              : `Approaching ${resource.toLowerCase()} limit`}
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {isAtLimit
              ? `You've used all ${limit} ${resource.toLowerCase()}. Upgrade your plan to add more.`
              : `You're using ${current} of ${limit} ${resource.toLowerCase()} (${Math.round((current / limit) * 100)}%).`}
          </AlertDescription>
        </div>
      </div>
      <Button size="sm" variant={isAtLimit ? 'default' : 'outline'} asChild>
        <Link href="/portal/settings/billing">
          Upgrade
          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </Button>
    </Alert>
  );
}
