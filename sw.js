const CACHE_NAME = "pioneiro-regular-github-v2";
const BASE_PATH = new URL("./", self.location.href).pathname;
const CORE_FILES = [
  BASE_PATH,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}favicon.svg`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const pageResponse = await fetch(BASE_PATH);
      const html = await pageResponse.clone().text();
      await cache.put(BASE_PATH, pageResponse);

      const discoveredAssets = Array.from(
        html.matchAll(/(?:src|href)=["'](\/[^"'#?]+)["']/g),
        (match) => match[1],
      );
      const files = [...new Set([...CORE_FILES.slice(1), ...discoveredAssets])];
      await Promise.allSettled(files.map((file) => cache.add(file)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (event.request.url.startsWith(self.location.origin) && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        if (event.request.mode === "navigate") {
          return (await caches.match(BASE_PATH)) || Response.error();
        }
        return Response.error();
      }
    })(),
  );
});
