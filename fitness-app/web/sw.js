// Service Worker for ESSERE PWA - auto-update on new deploy
const CACHE_VERSION = 'v__BUILD_TS__';
const CACHE_NAME = 'essere-' + CACHE_VERSION;

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-32.png',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/Ionicons.ttf'
];

// ============================================================
// IL RICAMBIO LO DECIDE CHI STA USANDO L'APP, NON IL DEPLOY
// ------------------------------------------------------------
// 23 settembre 2026, poco dopo una pubblicazione: schermo nero.
//
// Qui c'era `self.skipWaiting()` dentro l'install. Voleva dire:
// appena la versione nuova è pronta, prende il comando subito —
// anche di un'app che in quel momento è APERTA e sta girando con
// la versione precedente. E l'activate, un istante dopo, cancella
// le cache vecchie.
//
// Il risultato è una pagina viva a cui viene tolto il pavimento da
// sotto: al primo file che le serve — un'icona, un font, un pezzo
// caricato al momento — quel file non c'è più né in cache né sul
// server, perché il deploy l'ha sostituito. Schermo nero.
//
// Il paradosso è che l'avviso «C'è una versione nuova, tocca qui
// per aggiornare» esiste già, scritto e funzionante. Non faceva mai
// in tempo a comparire: `skipWaiting()` scavalcava la domanda e
// cambiava tutto prima che qualcuno potesse rispondere. Un'altra
// porta che c'era e che nessuno riusciva ad aprire.
//
// ADESSO: la versione nuova si installa e ASPETTA. L'avviso
// compare. Il ricambio avviene quando lo chiede la pagina — cioè
// quando l'ha chiesto una persona, a lezione finita e non a metà.
// ============================================================

// Install: si prepara e basta. Nessun skipWaiting: aspetta il suo turno.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// L'unico modo di passare avanti: che la pagina lo chieda, dopo che
// l'ha chiesto una persona toccando l'avviso.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Activate: clean old caches, claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - HTML/navigation: network-first (always get latest), fallback to cache
// - JS/CSS/fonts/images: stale-while-revalidate (fast from cache, update in background)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Filmati degli esercizi: il browser se li gestisce da solo.
  // Passano per richieste Range (206) che la cache non può contenere,
  // e sono file pesanti: fuori dal service worker.
  if (url.pathname.startsWith('/video/') || request.destination === 'video') return;

  // Font files: cache-first (serve from cache immediately, update in background)
  if (request.url.endsWith('.ttf') || request.url.endsWith('.woff') || request.url.endsWith('.woff2') || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation requests (HTML): network-first
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // JS bundles: always network-first (hash in filename ensures correct version)
  if (request.url.includes('/_expo/static/js/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // All other assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Push notification received
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try { data = { body: event.data.text() }; } catch (_) {}
  }
  const title = data.title || 'ESSĒRE';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: data.tag || 'essere-push-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    silent: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click on notification -> open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
