const CACHE_NAME = 'weekly-planner-v3-sqlite';
const urlsToCache = [
  '/',
  '/public/manifest.json',
  '/public/auth.js',
  '/public/auth-ui.js',
  '/public/icons/icon-72x72.png',
  '/public/icons/icon-96x96.png',
  '/public/icons/icon-128x128.png',
  '/public/icons/icon-144x144.png',
  '/public/icons/icon-152x152.png',
  '/public/icons/icon-192x192.png',
  '/public/icons/icon-384x384.png',
  '/public/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js',
  'https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.min.js'
];

self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Try to cache each URL individually to avoid failing if one fails
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(err => {
            console.log('Failed to cache:', url, err);
          }))
        );
      })
  );
});

self.addEventListener('fetch', event => {
  // Skip caching for non-HTTP schemes (chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Network-first strategy for HTML files and API requests to ensure fresh content
  if (event.request.headers.get('accept')?.includes('text/html') || event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Only cache successful responses
          if (response.ok && !event.request.url.includes('/api/')) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails (for HTML only, not API)
          if (!event.request.url.includes('/api/')) {
            return caches.match(event.request);
          }
          // For API requests, return a network error
          return new Response('Network error', { status: 503 });
        })
    );
    return;
  }

  // Cache-first for other resources (CSS, JS, images)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

self.addEventListener('activate', event => {
  // Take control of all clients immediately
  event.waitUntil(
    clients.claim().then(() => {
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
}); 
