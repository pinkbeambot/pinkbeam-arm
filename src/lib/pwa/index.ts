// Service Worker
export {
  registerServiceWorker,
  unregisterServiceWorker,
  updateServiceWorker,
  skipWaiting,
  cacheUrls,
  isStandalone,
  isOnline,
} from './service-worker';

// Notifications
export {
  requestNotificationPermission,
  getNotificationPermission,
  canShowNotifications,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  showLocalNotification,
  showServiceWorkerNotification,
  subscriptionToJSON,
} from './notifications';

// Install
export {
  checkStandalone,
  checkIOS,
  checkAndroid,
  checkMobile,
  triggerInstall,
  dismissInstallPrompt,
  trackInstallEvent,
  getInstallStats,
  getIOSInstallInstructions,
  getAndroidInstallInstructions,
} from './install';

// Utils
export {
  getPWAStatus,
  browserSupportsServiceWorker,
  browserSupportsWebPush,
  browserSupportsNotifications,
  browserSupportsBackgroundSync,
  browserSupportsPWA,
  registerBackgroundSync,
  cacheAPIResponse,
  getCachedAPIResponse,
  shareContent,
  copyToClipboard,
  trackPWAMetric,
  formatBytes,
  getStorageEstimate,
} from './utils';
