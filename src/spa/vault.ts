// Automatic backups: one compressed copy per day, kept on this device (IndexedDB) and in the
// user's Faro account online (Supabase faro_backups, newest 14 days). gzip makes a ledger ~10x smaller.
import type { DueFile, LedgerState } from "@/lib/faro/types";
import { CLOUD_READY, supabase } from "./cloud";

export type BackupInfo = { day: string; bytes: number; at: string; where: "device" | "cloud" };
const DB = "faro-vault";
const STORE = "copies";
const KEEP_LOCAL = 7;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function payload(ledger: LedgerState, device?: Record<string, string> | null, dueFile?: DueFile[] | null): string {
  // 1.3.168 (la puerta): la capa del aparato viaja como sección HERMANA (`device`) — el
  // contenido del libro ({ app, v, exportedAt, ledger }) no cambia, y un respaldo sin la
  // sección (todos los anteriores) sigue restaurando igual: la capa queda intacta.
  // 1.3.169: el Archivo de Debo viaja en su PROPIA sección hermana (`dueFile`, duefile.ts) —
  // es dato del dueño, no capa del aparato. Sin sección, el Archivo del aparato queda intacto.
  return JSON.stringify({ app: "FARO", v: 1, exportedAt: new Date().toISOString(), ledger, ...(device ? { device } : {}), ...(dueFile ? { dueFile } : {}) });
}

export async function gzip(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") return new TextEncoder().encode(text);
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function gunzip(bytes: Uint8Array): Promise<string> {
  const isGz = bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGz || typeof DecompressionStream === "undefined") return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

type LocalCopy = { day: string; at: string; bytes: number; data: Uint8Array };

async function localKeys(uid: string): Promise<string[]> {
  const keys = (await tx("readonly", (s) => s.getAllKeys())) as string[];
  return keys.filter((k) => k.startsWith(`${uid}|`)).sort();
}

export async function listBackups(uid: string): Promise<BackupInfo[]> {
  const out: BackupInfo[] = [];
  try {
    for (const k of await localKeys(uid)) {
      const c = (await tx("readonly", (s) => s.get(k))) as LocalCopy | undefined;
      if (c) out.push({ day: c.day, bytes: c.bytes, at: c.at, where: "device" });
    }
  } catch { /* no IndexedDB */ }
  if (CLOUD_READY && uid !== "local") {
    try {
      const { data } = await supabase.from("faro_backups").select("day, bytes, created_at").order("day", { ascending: false }).limit(14);
      for (const r of data ?? []) out.push({ day: String(r.day), bytes: Number(r.bytes), at: String(r.created_at), where: "cloud" });
    } catch { /* offline */ }
  }
  return out.sort((a, b) => (a.day === b.day ? (a.where === "device" ? -1 : 1) : a.day < b.day ? 1 : -1));
}

const lastKey = (uid: string, where: string) => `faro.vault.${where}.${uid}`;

/** Saves today's copy where it is due. Cheap to call often: it writes at most once per hour per place. */
export async function autoBackup(uid: string, ledger: LedgerState, opts: { online: boolean; force?: boolean; safety?: boolean; device?: Record<string, string> | null; dueFile?: DueFile[] | null }): Promise<{ device: boolean; cloud: boolean }> {
  if (opts.safety) {
    const day = `${today()} ·`;
    const bytes = await gzip(payload(ledger, opts.device, opts.dueFile));
    const copy: LocalCopy = { day, at: new Date().toISOString(), bytes: bytes.length, data: bytes };
    await tx("readwrite", (s) => s.put(copy, `${uid}|${day}`));
    return { device: true, cloud: false };
  }
  const day = today();
  const sig = `${day}|${ledger.revision}`;
  const done = { device: false, cloud: false };
  const due = (where: string) => {
    if (opts.force) return true;
    try {
      const prev = localStorage.getItem(lastKey(uid, where)) ?? "";
      const [pday, prev_rev, at] = prev.split("|");
      if (`${pday}|${prev_rev}` === sig) return false;
      return !(pday === day && Date.now() - Number(at || 0) < 3600_000);
    } catch { return true; }
  };
  const mark = (where: string) => { try { localStorage.setItem(lastKey(uid, where), `${sig}|${Date.now()}`); } catch { /* ignore */ } };
  const wantDevice = due("device");
  const wantCloud = opts.online && CLOUD_READY && uid !== "local" && due("cloud");
  if (!wantDevice && !wantCloud) return done;
  const bytes = await gzip(payload(ledger, opts.device, opts.dueFile));
  if (wantDevice) {
    try {
      const copy: LocalCopy = { day, at: new Date().toISOString(), bytes: bytes.length, data: bytes };
      await tx("readwrite", (s) => s.put(copy, `${uid}|${day}`));
      const keys = await localKeys(uid);
      for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_LOCAL))) await tx("readwrite", (s) => s.delete(k));
      mark("device");
      done.device = true;
    } catch { /* storage full or blocked */ }
  }
  if (wantCloud) {
    try {
      const { error } = await supabase.rpc("faro_backup", { p_day: day, p_data: toB64(bytes), p_bytes: bytes.length });
      if (!error) { mark("cloud"); done.cloud = true; }
    } catch { /* offline */ }
  }
  return done;
}

/** Reads one saved copy back as the same JSON a downloaded backup file holds. */
export async function readBackup(uid: string, info: BackupInfo): Promise<string | null> {
  if (info.where === "device") {
    const c = (await tx("readonly", (s) => s.get(`${uid}|${info.day}`))) as LocalCopy | undefined;
    return c ? gunzip(c.data) : null;
  }
  const { data } = await supabase.from("faro_backups").select("data_gz").eq("day", info.day).maybeSingle();
  return data ? gunzip(fromB64(String(data.data_gz))) : null;
}

export async function backupBlob(ledger: LedgerState, device?: Record<string, string> | null, dueFile?: DueFile[] | null): Promise<Uint8Array> {
  return gzip(payload(ledger, device, dueFile));
}

export async function wipeLocalBackups(uid: string) {
  try {
    for (const k of await localKeys(uid)) await tx("readwrite", (s) => s.delete(k));
    localStorage.removeItem(lastKey(uid, "device"));
    localStorage.removeItem(lastKey(uid, "cloud"));
  } catch { /* ignore */ }
}
