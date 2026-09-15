// Service Worker for Texas Law Enforcement Locator PWA

// Bump this on every deploy that touches sw.js's own caching logic.
// (Changing CACHE_NAME forces old caches to be purged on activate.)
const CACHE_NAME = 'txle-locator-v6';

// Paths are relative to this service worker's own URL (the repo/app root),
// so they work on GitHub Pages subpath hosting (e.g. /Police-Finder/).

// App code: must always reflect the latest deploy when the user is online.
// Cached only as a fallback for when they're offline.
const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './admin.html',
    './admin.js',
    './admin.css'
];

// Truly static, rarely-changing assets — fine to serve straight from cache.
const STATIC_ASSETS = [
    './assets/site.webmanifest',
    './assets/favicon.ico',
    './assets/favicon-16x16.png',
    './assets/favicon-32x32.png',
    './assets/apple-touch-icon.png',
    './assets/android-chrome-192x192.png',
    './assets/android-chrome-512x512.png',
    './assets/Wallpaper.jpg'
];

const APP_SHELL = [...CORE_ASSETS, ...STATIC_ASSETS];

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
    'tigerweb.geo.census.gov',
    'nominatim.openstreetmap.org',
    'overpass-api.de',
    'overpass.kumi.systems',
    'overpass.private.coffee',
    'maps.dot.state.tx.us',
    'api.github.com'
];

// CDN resources that can use stale-while-revalidate
const CDN_HOSTS = [
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

// Recognize core app-shell requests regardless of query string, and
// including the root path ('/', './', '/Police-Finder/', etc).
function isCoreAsset(url) {
    return CORE_ASSETS.some((path) => {
        if (path === './') {
            return url.pathname.endsWith('/');
        }
        return url.pathname.endsWith(path.replace('./', '/'));
    });
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Network-first for GIS/geocoding APIs — no stale-cache fallback,
    // a clear error is better than a wrong jurisdiction.
    if (API_HOSTS.some((host) => url.hostname.includes(host))) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Shared agency contacts must be refreshed from GitHub when online —
    // same reasoning as above, no stale-cache fallback.
    if (url.pathname.endsWith('/agency-data.json')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // App shell code (HTML/JS/CSS): always prefer the network so deploys
    // take effect immediately. Cache is only used when offline.
    if (isCoreAsset(url)) {
        event.respondWith(networkFirstWithCacheFallback(event.request));
        return;
    }

    // Stale-while-revalidate for CDN resources
    if (CDN_HOSTS.some((host) => url.hostname.includes(host))) {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    // Cache-first for genuinely static assets (icons, manifest, images)
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
        if (request.mode === 'navigate') {
            return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        return await fetch(request);
    } catch {
        // APIs / shared data don't work offline — return a clear error
        // instead of silently serving stale data.
        return new Response(
            JSON.stringify({ error: 'offline', message: 'Network unavailable. This data requires an internet connection.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function networkFirstWithCacheFallback(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
            return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
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
