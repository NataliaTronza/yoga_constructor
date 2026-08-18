/* «Дихання» — офлайн-кеш.

   ВАЖЛИВО: цей файл віддає сторінку «спочатку з мережі».
   Тобто щойно є інтернет — застосунок бере свіжу версію з сервера,
   а кеш використовує лише як запасний варіант, коли мережі немає.
   Через це оновлення більше не «застрягають» у кеші.

   Версію нижче варто піднімати при кожній заміні файлів. */
const V = 'dyhannia-v13';

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => c.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

function isPage(req) {
  return req.mode === 'navigate' ||
         req.destination === 'document' ||
         req.url.endsWith('/') ||
         req.url.endsWith('index.html');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // Сторінка та власні файли — СПОЧАТКУ З МЕРЕЖІ
  if (sameOrigin && (isPage(req) || url.pathname.endsWith('.js') || url.pathname.endsWith('.webmanifest'))) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(V).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Картинки та шрифти — спочатку з кешу
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const cacheable = sameOrigin ||
                          url.hostname.endsWith('fonts.googleapis.com') ||
                          url.hostname.endsWith('fonts.gstatic.com');
        if (cacheable && res.status === 200) {
          const copy = res.clone();
          caches.open(V).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
