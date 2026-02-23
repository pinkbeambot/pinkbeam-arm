/**
 * useOnlineStatus Hook
 * React hook for tracking online/offline status
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseOnlineStatusReturn {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  wentOnlineAt: Date | null;
  wentOfflineAt: Date | null;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [wentOnlineAt, setWentOnlineAt] = useState<Date | null>(null);
  const [wentOfflineAt, setWentOfflineAt] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setWentOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWentOfflineAt(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    wentOnlineAt,
    wentOfflineAt,
  };
}
