/// <reference lib="webworker" />

/**
 * ARM PWA Service Worker
 * Handles caching, offline support, background sync, and push notifications
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `arm-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `arm-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `arm-images-${CACHE_VERSION}`;
const API_CACHE = `arm-api-${CACHE_VERSION}`;

// Precache critical assets
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/dashboard',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('arm-') && 
                     !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Supabase realtime WebSocket connections
  if (url.pathname.includes('/realtime/') || url.protocol === 'wss:') {
    return;
  }
  
  // Handle different request types
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingTasks());
  } else if (event.tag === 'sync-activities') {
    event.waitUntil(syncPendingActivities());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'Pink Beam ARM',
    body: 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'notification',
    requireInteraction: false,
  };
  
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[SW] Push data parsing error:', e);
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      data: data.data || {},
      actions: data.actions || [],
    })
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data;
  let url = '/';
  
  if (notificationData?.url) {
    url = notificationData.url;
  } else if (event.action === 'view') {
    url = notificationData?.viewUrl || '/dashboard';
  } else if (event.action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

// Helper functions
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname === '/manifest.json';
}

function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/);
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Cache strategies
async function handleStaticAsset(request) {
  // Cache first, network fallback
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

async function handleImageRequest(request) {
  // Stale while revalidate for images
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = await caches.open(IMAGE_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

async function handleAPIRequest(request) {
  // Network first, cache fallback for API
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] API network failed, trying cache');
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ 
        error: 'offline', 
        message: 'You are offline. This action will be synced when connection is restored.' 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handlePageRequest(request) {
  // Network first, fallback to offline page
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Page network failed, trying cache');
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Simple offline fallback
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Pink Beam ARM</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              background: #f5f5f5;
            }
            .container { 
              text-align: center; 
              padding: 2rem;
            }
            h1 { color: #e91e8c; }
            button {
              background: #e91e8c;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="location.reload()">Retry</button>
          </div>
        </body>
      </html>
      `,
      { 
        status: 200, 
        headers: { 'Content-Type': 'text/html' } 
      }
    );
  }
}

// Background sync functions
async function syncPendingTasks() {
  // Get pending tasks from IndexedDB and sync
  console.log('[SW] Syncing pending tasks...');
  // Implementation would connect to IndexedDB
}

async function syncPendingActivities() {
  // Get pending activities from IndexedDB and sync
  console.log('[SW] Syncing pending activities...');
  // Implementation would connect to IndexedDB
}

// Export for TypeScript
export {};
