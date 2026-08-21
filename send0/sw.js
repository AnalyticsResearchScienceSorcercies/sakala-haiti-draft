// Service worker for the Send 0 form.
//
// Job: make the page load with no signal. The submission queue itself lives
// in localStorage in the page, not here, because a trainee may close the tab
// before connectivity returns and localStorage survives that.

const CACHE = "send0-v1";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Never cache the API. A stale score is worse than an error.
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  // Network-first so an updated form reaches people, cache as the fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
