// Service Worker pour TravauxPro PWA
// Permet l'installation sur l'écran d'accueil et un minimum de fonctionnement hors-ligne.

const CACHE_NAME = "travauxpro-cache-v3";
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

// Activation : on nettoie les anciens caches et on prend le contrôle immédiatement
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Récupération : on sert depuis le cache si possible, sinon on va sur le réseau
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // On ne gère que les requêtes GET
  if (event.request.method !== "GET") return;

  // IMPORTANT : on ne touche JAMAIS aux requêtes vers un autre domaine
  // (Firebase, Firestore, Google APIs, WhatsApp, etc.).
  // Cela évite que le service worker interfère avec la sauvegarde des
  // inscriptions ou la synchronisation en temps réel des données.
  if (url.origin !== self.location.origin) {
    return; // on laisse passer la requête normalement, sans cache
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // On a réussi à joindre le réseau : on sert toujours la version
        // la plus récente, et on met à jour le cache au passage.
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Hors-ligne : on retombe sur la version en cache si elle existe
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match("./index.html");
        });
      })
  );
});
