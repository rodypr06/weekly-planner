const CACHE_VERSION = 'v5-suggest-fix';
const CACHE_NAME = `weekly-planner-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/supabase-auth.js',
  '/public/security-utils.js',
  // Optimized local vendor assets
  '/public/vendor/tailwind.min.css',
  '/public/vendor/fontawesome.min.css',
  '/public/vendor/dompurify.min.js',
  '/public/vendor/supabase.js',
  // Lazy-loaded assets (cached but not preloaded)
  '/public/vendor/confetti.min.js',
  '/public/vendor/tone.min.js',
  // WebFonts
  '/public/webfonts/fa-solid-900.woff2',
  '/public/webfonts/fa-regular-400.woff2',
  '/public/webfonts/fa-brands-400.woff2',
  // App icons
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// External resources (fallbacks for local assets)
const externalUrlsToCache = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://unpkg.com/@supabase/supabase-js@2', // Fallback if local fails
  'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js' // Fallback if local fails
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache local resources
        return cache.addAll(urlsToCache)
          .then(() => {
            // Try to cache external resources, but don't fail installation if they fail
            return Promise.all(
              externalUrlsToCache.map(url => 
                cache.add(url).catch(err => {
                  console.warn(`Failed to cache external resource: ${url}`, err);
                })
              )
            );
          });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  // Don't cache API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Allow non-GET requests (like Supabase auth) to bypass the service worker entirely
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Don't cache non-GET requests
            if (event.request.method !== 'GET') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Only cache HTTP/HTTPS requests, not chrome-extension or other schemes
            if (event.request.url.startsWith('http')) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                })
                .catch(err => {
                  console.warn('Failed to cache response:', err);
                });
            }

            return response;
          })
          .catch(error => {
            // Offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            throw error;
          });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('weekly-planner-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Notification handling
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a task reminder',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'task-reminder',
    requireInteraction: true,
    actions: [
      { action: 'complete', title: 'Mark Complete' },
      { action: 'snooze', title: 'Snooze 10 min' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      taskId: data.taskId,
      url: data.url || '/',
      timestamp: new Date().toISOString()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Task Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  const taskId = notification.data?.taskId;

  notification.close();

  if (action === 'complete' && taskId) {
    // Send message to complete task
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Send to all clients to update task
          clientList.forEach(client => {
            client.postMessage({
              type: 'complete-task',
              taskId: taskId
            });
          });
          
          // If no client is open, open one
          if (clientList.length === 0) {
            return clients.openWindow(notification.data.url);
          }
          
          // Focus on existing client
          const client = clientList[0];
          if (client && 'focus' in client) {
            return client.focus();
          }
        })
    );
  } else if (action === 'snooze' && taskId) {
    // Send message to snooze reminder
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          clientList.forEach(client => {
            client.postMessage({
              type: 'snooze-reminder',
              taskId: taskId,
              minutes: 10
            });
          });
        })
    );
  } else if (!action) {
    // Click on notification body - open/focus app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          for (const client of clientList) {
            if ('focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(notification.data.url);
          }
        })
    );
  }
});

// Background sync for offline reminder scheduling
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(syncReminders());
  }
});

async function syncReminders() {
  try {
    // Get all pending reminders from IndexedDB or cache
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/api/reminders/pending');
    
    if (response) {
      const reminders = await response.json();
      
      // Schedule notifications for each reminder
      for (const reminder of reminders) {
        const timeDiff = new Date(reminder.reminder_time).getTime() - Date.now();
        
        if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) { // Within 24 hours
          // Schedule notification
          setTimeout(() => {
            self.registration.showNotification(
              `${reminder.task_emoji} Task Reminder`,
              {
                body: reminder.task_text,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: `reminder-${reminder.reminder_id}`,
                data: { taskId: reminder.task_id }
              }
            );
          }, timeDiff);
        }
      }
    }
  } catch (error) {
    console.error('Error syncing reminders:', error);
  }
}