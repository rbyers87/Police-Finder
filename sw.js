// Service Worker for Texas Law Enforcement Locator PWA

const CACHE_NAME = 'txle-locator-v3';

// Paths are relative to this service worker's own URL (the repo/app root),
// so they work on GitHub Pages subpath hosting (e.g. /Police-Finder/).
const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './admin.html',
    './admin.js',
    './admin.css',
    './assets/site.webmanifest',
    './assets/favicon.ico',
    './assets/favicon-16x16.png',
    './assets/favicon-32x32.png',
    './assets/apple-touch-icon.png',
    './assets/android-chrome-192x192.png',
    './assets/android-chrome-512x512.png',
    './assets/Wallpaper.jpg'
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// ── Fetch Strategies ───────────────────────────────────────────────────────

// APIs that should use network-first (stale data is useless for jurisdiction lookups)
const API_HOSTS = [
    'services.arcgis.com',
    'geocoding.geo.census.gov',
    'nominatim.openstreetmap.org'
];

// CDN resources that can use stale-while-revalidate
const CDN_HOSTS = [
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Network-first for GIS/geocoding APIs
    if (API_HOSTS.some((host) => url.hostname.includes(host))) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Stale-while-revalidate for CDN resources
    if (CDN_HOSTS.some((host) => url.hostname.includes(host))) {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    // Cache-first for app shell
    event.respondWith(cacheFirst(event.request));
});

// ── Caching Strategies ─────────────────────────────────────────────────────

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Return offline fallback for navigation requests (relative to SW location)
        if (request.mode === 'navigate') {
            return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch {
        // APIs don't work offline — return clear error
        return new Response(
            JSON.stringify({ error: 'offline', message: 'Network unavailable. GIS queries require an internet connection.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}
