'use client';

import { useEffect, useState } from 'react';
import { usePWA } from '@/hooks/pwa/usePWA';
import { Button } from '@/components/ui';
import { RefreshCw, X } from 'lucide-react';

/**
 * PWA Update Prompt Component
 * Shows when a new service worker version is available
 */
export function UpdatePrompt() {
  const { updateAvailable, skipWaiting } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setIsVisible(true);
    }
  }, [updateAvailable]);

  const handleUpdate = () => {
    skipWaiting();
    setIsVisible(false);
    
    // Reload the page after a short delay to activate new service worker
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              Update Available
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              A new version of Pink Beam ARM is available. Update now for the latest features and improvements.
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleUpdate}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                Later
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
