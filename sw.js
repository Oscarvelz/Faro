// FARO service worker: the app opens with no internet. Bump VERSION on every release.
const VERSION = "faro-1.3.192";
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
    // 1.3.163 (audit W2): keep the current generation AND the newest previous one — a client
    // still running the old page keeps its cache until it reloads, instead of losing it at
    // activation and failing offline. Only older generations are purged. Non-version faro-*
    // caches (faro-fonts) are not generations and are left alone.
    const gen = (k) => { const m = /^faro-(\d+)\.(\d+)\.(\d+)$/.exec(k); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null; };
    const gens = (await caches.keys()).filter((k) => gen(k) && k !== VERSION)
      .sort((a, b) => { const x = gen(a), y = gen(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; });
    const keep = new Set([VERSION, gens[0]]);
    for (const k of await caches.keys()) if (gen(k) && !keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Contacts shared to Faro (manifest share_target): keep the vCard text and open the app, which adds the people.
// Cache name has no "faro-" prefix so activate never clears it. Keys must match components/faro/people.tsx.
const SHARE_CACHE = "share-inbox";
const SHARE_KEY = "./share-contact-inbox";
// Bank statements shared to Faro (CSV, QFX, OFX, QIF) wait under their own key; components/faro/bank-dock.tsx reads them.
const STATEMENT_KEY = "./share-statement-inbox";
async function takeShare(req) {
  let text = "";
  const statements = [];
  try {
    const form = await req.formData();
    // Sorted by content, not by field: a .vcf is a contact wherever it arrives, anything else is a statement.
    for (const f of [...form.getAll("contacts"), ...form.getAll("statements")]) {
      if (!f || typeof f.text !== "function") continue;
      const body = await f.text();
      if (/BEGIN:VCARD/i.test(body)) text += body + "\n";
      else if (body.trim()) statements.push({ name: f.name || "statement.csv", text: body });
    }
    for (const k of ["text", "title"]) { const v = form.get(k); if (typeof v === "string" && /BEGIN:VCARD/i.test(v)) text += v + "\n"; }
  } catch { /* nothing readable */ }
  const cache = await caches.open(SHARE_CACHE);
  if (text) {
    const old = await cache.match(SHARE_KEY);
    const prev = old ? await old.text() : "";
    await cache.put(SHARE_KEY, new Response(prev + text, { headers: { "content-type": "text/vcard; charset=utf-8" } }));
  }
  if (statements.length) {
    const old = await cache.match(STATEMENT_KEY);
    const prev = old ? await old.json().catch(() => []) : [];
    await cache.put(STATEMENT_KEY, new Response(JSON.stringify([...prev, ...statements]), { headers: { "content-type": "application/json" } }));
  }
  return Response.redirect(new URL(statements.length && !text ? "./?share=statement" : "./?share=contact", self.registration.scope).href, 303);
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
  // On-device OCR for "Leer estado" (./ocr/: tesseract.js, its WASM core, eng+spa data). Never in precache.json: fetched on
  // first use and kept in its own cache (no "faro-" prefix, so a release does not throw away ~5 MB the phone already has).
  if (url.pathname.includes("/ocr/")) {
    event.respondWith((async () => {
      const cache = await caches.open("ocr-1");
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }
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
