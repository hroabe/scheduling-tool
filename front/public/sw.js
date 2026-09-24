/* Service Worker for 日程調整ツール (docs/02_architecture.md §5)
 * - Static assets (/_next/static, icons, images): stale-while-revalidate
 * - Page navigations: network-first, falling back to cache, then /offline
 * - API requests (any origin, /api/): network-only (never cached)
 */
const VERSION = 'v2';
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/', '/create', '/manifest.json', '/icon.svg', '/icons/icon-192x192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(PAGE_CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names.filter((name) => name !== STATIC_CACHE && name !== PAGE_CACHE).map((name) => caches.delete(name))
                )
            )
            .then(() => self.clients.claim())
    );
});

function isStaticAsset(url) {
    return (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/icons/') ||
        /\.(?:png|svg|ico|webp|jpg|jpeg|woff2?)$/.test(url.pathname)
    );
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then((response) => {
            if (response && response.ok && response.type === 'basic') {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);
    return cached || network;
}

async function networkFirstPage(request) {
    const cache = await caches.open(PAGE_CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error();
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // API calls (same or cross origin): always go to the network
    if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstPage(request));
        return;
    }

    if (isStaticAsset(url)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});
