// Service Worker pour TravauxPro PWA
// Permet l'installation sur l'écran d'accueil et un minimum de fonctionnement hors-ligne.

const CACHE_NAME = "travauxpro-cache-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Installation : on met en cache les fichiers principaux
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        // Si un fichier échoue (ex: nom différent), on continue sans bloquer l'install
        console.warn("Certains fichiers n'ont pas pu être mis en cache :", err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : on nettoie les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Récupération : on sert depuis le cache si possible, sinon on va sur le réseau
self.addEventListener("fetch", (event) => {
  // On ne gère que les requêtes GET (pas les appels API/WhatsApp)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // On met aussi en cache les nouvelles pages visitées
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Si hors-ligne et pas en cache, on retombe sur la page d'accueil
          return caches.match("./index.html");
        });
    })
  );
});
