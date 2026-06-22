/* sfoak v9 — minimal service worker: an offline app shell + instant reloads.
   Caches only same-origin player assets; Spotify SDK/API always hit network. */
const CACHE = "sfoak-v9-1";
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./icon.svg",
  "../_shared/app.css", "../_shared/tracks.js", "../_shared/ui.js",
  "../_shared/auth.js", "../_shared/player.js", "../_shared/shell.js", "../_shared/boot.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // never intercept Spotify
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});
