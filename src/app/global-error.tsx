'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full text-center space-y-6">
            <h2 className="text-2xl font-bold">Something went wrong!</h2>
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
