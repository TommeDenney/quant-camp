// Quant Camp service worker: works offline after the first visit.
// Navigation: network first (fresh content), falling back to the cached app shell.
// Hashed build assets (/assets/*): cache first. Everything else same-origin: stale-while-revalidate.
const VERSION = 'qc-v1';
const BASE = new URL('./', self.location).pathname; // e.g. /quant-camp/

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const shell = ['./', 'index.html', 'manifest.webmanifest', 'favicon.svg'].map((p) => new URL(p, self.location).href);
    await cache.addAll(shell).catch(() => {});
    // Precache the bundle the shell refers to (JS, CSS) and the fonts the CSS refers to.
    try {
      const html = await (await fetch(new URL('index.html', self.location), { cache: 'no-cache' })).text();
      const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map((m) => new URL(m[1], self.location).href);
      await cache.addAll(assets);
      for (const css of assets.filter((a) => a.endsWith('.css'))) {
        const text = await (await fetch(css)).text();
        const fonts = [...text.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => new URL(m[1].replace(/["']/g, ''), css).href);
        await cache.addAll([...new Set(fonts)]).catch(() => {});
      }
    } catch { /* offline during install: runtime caching fills in later */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(new URL('index.html', self.location).href, res.clone());
        return res;
      } catch {
        return (await caches.match(new URL('index.html', self.location).href)) || (await caches.match(new URL('./', self.location).href)) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
    return hit || net;
  })());
});
