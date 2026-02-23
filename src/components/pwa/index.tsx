'use client';

import { InstallPrompt } from './InstallPrompt';
import { UpdatePrompt } from './UpdatePrompt';
import { OfflineIndicator } from './OfflineIndicator';

/**
 * PWA Manager Component
 * Combines all PWA-related components
 */
export function PWAManager() {
  return (
    <>
      <InstallPrompt />
      <UpdatePrompt />
      <OfflineIndicator />
    </>
  );
}

export { InstallPrompt } from './InstallPrompt';
export { UpdatePrompt } from './UpdatePrompt';
export { OfflineIndicator } from './OfflineIndicator';
