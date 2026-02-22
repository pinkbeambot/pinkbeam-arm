'use client';

import { useOnlineStatus } from '@/hooks/pwa/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Offline Indicator Component
 * Shows a banner when the user goes offline
 */
export function OfflineIndicator() {
  const { isOnline, isOffline, wentOnlineAt } = useOnlineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  // Show toast when coming back online
  useEffect(() => {
    if (wentOnlineAt && !isOnline) {
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wentOnlineAt, isOnline]);

  if (isOnline && !showOnlineToast) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            <span>You're offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      {/* Online Toast */}
      {showOnlineToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wifi className="w-4 h-4" />
            <span>Back online!</span>
          </div>
        </div>
      )}
    </>
  );
}
