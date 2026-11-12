/* global self, Response, fetch */
/**
 * COOP/COEP service worker for static hosts (GitHub Pages).
 * Register only from src/isolation.js. A normal visit does not install it.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
  event.respondWith(withIsolation(request));
});

async function withIsolation(request) {
  const response = await fetch(request);
  if (response.status === 0) return response;
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
