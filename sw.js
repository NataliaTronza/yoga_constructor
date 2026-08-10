/* «Дихання» — офлайн-кеш.
   Піднімай версію нижче щоразу, коли міняєш index.html,
   інакше телефон продовжить показувати стару копію. */
const V = 'dyhannia-v3';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // шрифти Google кешуємо на льоту, щоб офлайн виглядало так само
        const url = new URL(req.url);
        const cacheable = url.origin === location.origin ||
                          url.hostname.endsWith('fonts.googleapis.com') ||
                          url.hostname.endsWith('fonts.gstatic.com');
        if (cacheable && res.status === 200) {
          const copy = res.clone();
          caches.open(V).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
