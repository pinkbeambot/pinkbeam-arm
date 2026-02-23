# PWA Implementation Guide

## Overview

Pink Beam ARM is now a fully-featured Progressive Web App (PWA) with offline support, push notifications, and install capabilities.

## Features

### 1. PWA Configuration

- **Manifest**: `/public/manifest.json` - App metadata, icons, and configuration
- **Service Worker**: `/public/sw.js` - Handles caching, offline support, and push notifications
- **App Icons**: `/public/icons/` - All required sizes for iOS, Android, and Desktop
- **Theme Colors**: Dynamic light/dark theme support with Pink Beam branding

### 2. Offline Support

- **Caching Strategy**:
  - Static assets: Cache first, network fallback
  - Images: Stale while revalidate
  - API calls: Network first, cache fallback
  - Pages: Network first, offline page fallback

- **Background Sync**: Automatic sync when connection is restored
- **Offline Page**: User-friendly offline experience at `/offline`

### 3. Mobile Optimizations

- **Viewport**: Optimized for mobile devices with safe area support
- **Touch Actions**: Smooth scrolling and touch interactions
- **Install Prompts**: 
  - Android/Desktop: Native install prompt
  - iOS: Step-by-step instructions

### 4. Push Notifications

- **Permission Management**: Request and check notification permissions
- **Subscription**: VAPID-based push subscription
- **Display**: Both local and service worker notifications

### 5. Installation Flow

- **Detection**: Automatic detection of install capability
- **Prompt**: Non-intrusive install prompt with dismiss option
- **Tracking**: LocalStorage-based install event tracking

## Usage

### Hooks

```typescript
import { usePWA, useInstallPrompt, usePushNotifications, useOnlineStatus } from '@/hooks/pwa';

// Get PWA status
const { status, updateAvailable, skipWaiting } = usePWA();

// Handle install prompt
const { canInstall, showPrompt, isInstalled } = useInstallPrompt();

// Push notifications
const { isSubscribed, subscribe, showNotification } = usePushNotifications(VAPID_PUBLIC_KEY);

// Online status
const { isOnline, isOffline } = useOnlineStatus();
```

### Components

```tsx
import { PWAManager, InstallPrompt, UpdatePrompt, OfflineIndicator } from '@/components/pwa';

// Include in root layout (already done)
<PWAManager />

// Or use individually
<InstallPrompt />  // Shows install prompt
<UpdatePrompt />   // Shows when update available
<OfflineIndicator /> // Shows offline status
```

### Utilities

```typescript
import { 
  registerBackgroundSync, 
  shareContent, 
  getStorageEstimate,
  isStandalone,
  canShowNotifications 
} from '@/lib/pwa';

// Register background sync
await registerBackgroundSync('sync-tasks');

// Share content
await shareContent({ title: 'Check out ARM', url: window.location.href });

// Check storage
const estimate = await getStorageEstimate();
```

## Generating Icons

### Option 1: Using Sharp (Recommended)

```bash
npm install -D sharp
node scripts/generate-pwa-icons.js
```

### Option 2: Manual Conversion

1. Use Figma or Sketch to export `/public/icons/icon.svg` to PNG
2. Create sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
3. Save to `/public/icons/`

### Option 3: Online Tools

- [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
- [Maskable.app Editor](https://maskable.app/editor)

## Testing

### Local Testing

```bash
npm run build
npm run start
```

Then use Chrome DevTools:
1. Application tab → Service Workers
2. Check "Offline" to test offline mode
3. Lighthouse tab → PWA audit

### Mobile Testing

1. Deploy to preview URL
2. Open on Android/iOS device
3. Add to home screen
4. Test offline by enabling airplane mode

### Push Notification Testing

```bash
# Start dev server
npm run dev

# Generate VAPID keys
npx web-push generate-vapid-keys

# Add to .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

## Environment Variables

```bash
# Optional: For push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key

# Server-side only
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Install Prompt | ✅ | ✅ | ⚠️ (manual) | ✅ |
| Offline Cache | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ (iOS 16.4+) | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

## Troubleshooting

### Service Worker Not Registering

1. Check browser console for errors
2. Ensure `sw.js` is accessible at `/sw.js`
3. Check `Service-Worker-Allowed` header is set

### Icons Not Showing

1. Verify all PNG files exist in `/public/icons/`
2. Check manifest.json paths are correct
3. Clear browser cache and reload

### Install Prompt Not Showing

1. Must be served over HTTPS (or localhost)
2. User must interact with page first
3. Check Chrome DevTools → Application → Manifest

### Push Notifications Not Working

1. Check notification permission is granted
2. Verify VAPID keys are correct
3. Check service worker is active
4. Test with `web-push` CLI:
   ```bash
   npx web-push send-notification --endpoint="..." --key="..." --auth="..."
   ```

## Resources

- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Workbox](https://developer.chrome.com/docs/workbox/) (if we need more advanced caching)
