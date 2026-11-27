const SHELL_CACHE = 'iris-shell-v1';
const ASSETS_CACHE = 'iris-assets-v1';
const API_CACHE = 'iris-api-offline-v1';
const ACTIVE_CACHES = [SHELL_CACHE, ASSETS_CACHE, API_CACHE];

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/icons/icon-192.png',
];

const OFFLINE_API_PATHS = new Set([
  '/api/actualites',
  '/api/actualites/publiques',
  '/api/eleve/devoirs',
  '/api/prof/devoirs',
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !ACTIVE_CACHES.includes(key))
          .map(key => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_API_CACHE') {
    event.waitUntil(caches.delete(API_CACHE));
  }
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/icons/') ||
    /\.(?:js|css|svg|png|jpe?g|webp|gif|ttf|woff2?)$/i.test(pathname)
  );
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) return cachedIndex;
    const cachedRoot = await caches.match('/');
    if (cachedRoot) return cachedRoot;
    return caches.match('/offline.html');
  }
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Hors ligne : aucune donnée en cache' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.status === 200) {
    const cache = await caches.open(ASSETS_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (OFFLINE_API_PATHS.has(url.pathname)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
  }
});
