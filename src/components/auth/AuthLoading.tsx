'use client';

import { Loader2 } from 'lucide-react';

interface AuthLoadingProps {
  message?: string;
}

export function AuthLoading({ message = 'Loading...' }: AuthLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
