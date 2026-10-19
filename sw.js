// Service worker: cache-first app shell so the game works fully offline once installed.
const CACHE = 'tgr-0c390cb469';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Network-first for the page itself (so updates arrive when online), cache-first for everything else.
  if (req.mode === 'navigate') {
    // only a good response replaces the cached page; a slow network (4 s) falls back to the cached game
    const net = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
      return res.ok ? res : caches.match('./index.html').then((hit) => hit || res);
    });
    const slow = new Promise((resolve) => setTimeout(resolve, 4000)).then(() => caches.match('./index.html'));
    e.respondWith(Promise.race([net, slow.then((hit) => hit || net)]).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
