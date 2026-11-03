// FARO service worker: the app opens with no internet. Bump VERSION on every release.
const VERSION = "faro-1.3.66";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./favicon.svg", "./icon-192.png", "./icon-512.png", "./precache.json"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    let files = [];
    try { files = await (await fetch("./precache.json", { cache: "no-store" })).json(); } catch { /* ignore */ }
    await cache.addAll([...new Set([...CORE, ...files])]);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k.startsWith("faro-")) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Contacts shared to Faro (manifest share_target): keep the vCard text and open the app, which adds the people.
// Cache name has no "faro-" prefix so activate never clears it. Keys must match components/faro/people.tsx.
const SHARE_CACHE = "share-inbox";
const SHARE_KEY = "./share-contact-inbox";
async function takeShare(req) {
  let text = "";
  try {
    const form = await req.formData();
    for (const f of form.getAll("contacts")) if (f && typeof f.text === "function") text += (await f.text()) + "\n";
    for (const k of ["text", "title"]) { const v = form.get(k); if (typeof v === "string" && /BEGIN:VCARD/i.test(v)) text += v + "\n"; }
  } catch { /* nothing readable */ }
  if (text) {
    const cache = await caches.open(SHARE_CACHE);
    const old = await cache.match(SHARE_KEY);
    const prev = old ? await old.text() : "";
    await cache.put(SHARE_KEY, new Response(prev + text, { headers: { "content-type": "text/vcard; charset=utf-8" } }));
  }
  return Response.redirect(new URL("./?share=contact", self.registration.scope).href, 303);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/share-contact")) { event.respondWith(takeShare(req)); return; }
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache account or sync traffic.
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("er-api.com")) return;
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith((async () => {
      const cache = await caches.open("faro-fonts");
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put("./index.html", res.clone());
        return res;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
    return res;
  })());
});
