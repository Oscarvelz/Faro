/**
 * Datos de ejemplo (1.3.87). Sample data lives in its own namespace: while the flag is on, every
 * Faro data key in localStorage/sessionStorage is read and written as `faro.sample:<key>`, every
 * Faro IndexedDB database opens as `faro-sample:<name>`, and data calls to Supabase (REST,
 * storage, functions, realtime) are refused before they leave the device. Personal keys are
 * never touched while sample is on, so turning it off finds them byte-identical.
 * Shared on purpose (not data): the flag itself, theme/lang/day, auth and lock, device id, layout.
 */
export const SAMPLE_FLAG = "faro-sample-mode";
export const SAMPLE_PREFIX = "faro.sample:";
export const SAMPLE_EVENT = "faro-sample-switch";

const SHARED_EXACT = new Set([
  SAMPLE_FLAG, "faro-theme", "faro-lang", "faro-day", "faro-day-theme", "faro-night-theme",
  "faro.device", "faro.keep", "faro.lastUser", "faro-auth", "faro-quiet-boot", "faro-sample-migrated",
]);
const SHARED_PREFIX = ["faro.lock.", "faro.seen.", "faro-split", "faro-float", "faro-money-size", SAMPLE_PREFIX];

/** True for keys that hold the user's data (and so get their own copy in sample mode). */
export function isDataKey(key: string): boolean {
  if (!key.startsWith("faro")) return false;
  if (SHARED_EXACT.has(key)) return false;
  return !SHARED_PREFIX.some((p) => key.startsWith(p));
}

type Raw = { get: (k: string) => string | null; set: (k: string, v: string) => void; del: (k: string) => void };
let raw: Raw | null = null;
let on = false;

function readFlag(): boolean {
  try { return (raw ? raw.get(SAMPLE_FLAG) : localStorage.getItem(SAMPLE_FLAG)) === "1"; } catch { return false; }
}

export function sampleOn(): boolean {
  return on;
}

const mapKey = (k: string) => (on && isDataKey(String(k)) ? SAMPLE_PREFIX + String(k) : String(k));

/** Patch storage, IndexedDB and fetch once, before anything reads data. */
export function installSampleMode() {
  if (raw || typeof window === "undefined" || typeof Storage === "undefined") return;
  const proto = Storage.prototype;
  const g = proto.getItem, s = proto.setItem, r = proto.removeItem;
  const ls = window.localStorage;
  raw = { get: (k) => g.call(ls, k), set: (k, v) => s.call(ls, k, v), del: (k) => r.call(ls, k) };
  on = readFlag();
  proto.getItem = function (k: string) { return g.call(this, mapKey(k)); };
  proto.setItem = function (k: string, v: string) { return s.call(this, mapKey(k), v); };
  proto.removeItem = function (k: string) { return r.call(this, mapKey(k)); };
  if (typeof IDBFactory !== "undefined") {
    const open = IDBFactory.prototype.open, del = IDBFactory.prototype.deleteDatabase;
    const dbName = (n: string) => (on && String(n).startsWith("faro") ? `faro-sample:${n}` : n);
    IDBFactory.prototype.open = function (n: string, v?: number) { return v === undefined ? open.call(this, dbName(n)) : open.call(this, dbName(n), v); };
    IDBFactory.prototype.deleteDatabase = function (n: string) { return del.call(this, dbName(n)); };
  }
  const f = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (on) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (/supabase\.co\/(rest|storage|functions|realtime)\//.test(url)) return Promise.reject(new TypeError("sample mode: cloud paused"));
    }
    return f(input, init);
  };
}

/** Raw access to the personal (unprefixed) value of a key, whatever mode is on. */
export function personalGet(key: string): string | null {
  try { return raw ? raw.get(key) : localStorage.getItem(key); } catch { return null; }
}

/** Every key that belongs to the sample namespace (localStorage + sessionStorage) is removed and
 * the sample IndexedDB databases are deleted. Personal keys are not read or written. */
export async function clearSampleStore() {
  for (const st of [localStorage, sessionStorage]) {
    const ks: string[] = [];
    for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && k.startsWith(SAMPLE_PREFIX)) ks.push(k); }
    for (const k of ks) Storage.prototype.removeItem.call(st, k); // prefixed keys map to themselves
  }
  try {
    const dbs = (await (indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }).databases?.()) ?? [];
    for (const d of dbs) if (d.name?.startsWith("faro-sample:")) await new Promise((res) => { const q = indexedDB.deleteDatabase(d.name!.slice("faro-sample:".length)); q.onsuccess = q.onerror = q.onblocked = () => res(null); });
  } catch { /* ignore */ }
}

/** Switch mode in place: the app tree remounts (no reload, no lock). */
export function setSampleMode(next: boolean) {
  if (next === on || !raw) return; // never flip without the storage guard in place
  try { raw?.set(SAMPLE_FLAG, next ? "1" : "0"); } catch { /* ignore */ }
  on = next;
  window.dispatchEvent(new Event(SAMPLE_EVENT));
}

/** Reset: wipe the sample namespace and remount on a fresh sample. */
export async function resetSample() {
  if (!on) return;
  await clearSampleStore();
  window.dispatchEvent(new Event(SAMPLE_EVENT));
}

// Installed as soon as this module is evaluated (it is imported ahead of every data reader).
installSampleMode();
