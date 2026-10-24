// ScamSense service worker. Built into dist/sw.js by vite.config.ts, which fills in the file list.
// 1. Caches the whole app on install, so it opens and works with no internet.
// 2. Receives text shared from other apps (Web Share Target, POST) and hands it to the page
//    without it ever reaching a server.
const VERSION = '__VERSION__';
const CACHE = 'scamsense-' + VERSION;
const FILES = __FILES__;
const scoped = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map(scoped))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('scamsense-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(caches.match(scoped('./'), { ignoreVary: true }).then((hit) => hit || fetch(req)));
    return;
  }
  // ignoreVary: hosts send "Vary: Origin / Accept-Encoding", which would make module scripts miss the cache.
  event.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(req)));
});

async function receiveShare(req) {
  let parts = [];
  try {
    const form = await req.formData();
    parts = ['title', 'text', 'url'].map((k) => form.get(k)).filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
  } catch {
    // Unreadable share: open the app normally.
  }
  // Some apps repeat the same text in title and text; keep each piece once.
  const unique = parts.filter((p, i) => !parts.some((q, j) => j !== i && q.includes(p) && (q !== p || j < i)));
  const text = unique.join('\n');
  // The text travels in the URL fragment (#...), which browsers never send to any server.
  // The page reads it once and clears it from the address bar and history.
  return Response.redirect(scoped('./') + (text ? '#shared=' + encodeURIComponent(text) : ''), 303);
}
