/**
 * Small vCard reader (2.1, 3.0, 4.0) for contact import. Reads only what People needs:
 * the name, the birthday and anniversaries. Dates with no year are stored as 1904-MM-DD
 * (a leap year, so 29 Feb survives); people.ts reads years up to 1904 as "unknown".
 */
import type { OccasionKind } from "./types";

export const NO_YEAR = 1904;
export type ImportedDate = { kind: OccasionKind; label: string; date: string };
export type ImportedContact = { name: string; birthday: string; dates: ImportedDate[] };

const pad = (n: number) => String(n).padStart(2, "0");

function valid(y: number, m: number, d: number): string {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return "";
  const year = y > 0 ? y : NO_YEAR;
  if (d > new Date(year, m, 0).getDate()) return "";
  return `${year}-${pad(m)}-${pad(d)}`;
}

/** 1990-03-08 · 19900308 · --0308 · --03-08 · 1990-03-08T00:00:00Z · 08.03.1990 is not a vCard form and is ignored. */
export function parseVDate(raw: string): string {
  const v = raw.trim().replace(/^value=date:/i, "");
  let m = /^(\d{4})-?(\d{2})-?(\d{2})(?:T.*)?$/.exec(v);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^--(\d{2})-?(\d{2})$/.exec(v);
  if (m) return valid(0, Number(m[1]), Number(m[2]));
  return "";
}

function decodeQP(text: string, charset: string): string {
  const bytes: number[] = [];
  const src = text.replace(/=\r?\n/g, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) { bytes.push(parseInt(src.slice(i + 1, i + 3), 16)); i += 2; }
    else for (const b of new TextEncoder().encode(c)) bytes.push(b);
  }
  try { return new TextDecoder(charset || "utf-8").decode(new Uint8Array(bytes)); } catch { return new TextDecoder().decode(new Uint8Array(bytes)); }
}

const unescape = (s: string) => s.replace(/\\n/gi, " ").replace(/\\([,;:\\])/g, "$1");
/** Splits on separators not escaped with a backslash. */
function split(s: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) { cur += s[i] + s[i + 1]; i++; }
    else if (s[i] === sep) { out.push(cur); cur = ""; }
    else cur += s[i];
  }
  out.push(cur);
  return out;
}

type Prop = { name: string; params: Record<string, string>; value: string };

function lines(text: string): string[] {
  const raw = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    const prev = out.length ? out[out.length - 1] : null;
    if (prev !== null && /^[ \t]/.test(line)) { out[out.length - 1] = prev + line.slice(1); continue; } // folded line
    if (prev !== null && /quoted-printable/i.test(prev.split(":")[0]) && prev.endsWith("=")) { out[out.length - 1] = prev.slice(0, -1) + line; continue; } // QP soft break
    out.push(line);
  }
  return out;
}

function prop(line: string): Prop | null {
  const at = line.indexOf(":");
  if (at < 1) return null;
  const head = line.slice(0, at).split(";");
  const name = (head[0].split(".").pop() ?? "").toUpperCase(); // drop "item1." groups
  const params: Record<string, string> = {};
  for (const p of head.slice(1)) {
    const eq = p.indexOf("=");
    if (eq < 0) params[p.toUpperCase()] = "";
    else params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  let value = line.slice(at + 1);
  if ((params.ENCODING ?? "").toUpperCase() === "QUOTED-PRINTABLE" || "QUOTED-PRINTABLE" in params) value = decodeQP(value, params.CHARSET ?? "utf-8");
  return { name, params, value };
}

export function parseVCards(text: string): ImportedContact[] {
  const out: ImportedContact[] = [];
  let cur: Prop[] | null = null;
  for (const line of lines(text)) {
    const t = line.trim();
    if (/^BEGIN:VCARD$/i.test(t)) { cur = []; continue; }
    if (/^END:VCARD$/i.test(t)) {
      if (cur) { const c = contact(cur); if (c) out.push(c); }
      cur = null;
      continue;
    }
    if (cur) { const p = prop(line); if (p) cur.push(p); }
  }
  return out;
}

function contact(props: Prop[]): ImportedContact | null {
  const get = (n: string) => props.find((p) => p.name === n);
  let name = unescape(get("FN")?.value ?? "").trim();
  if (!name) {
    const n = get("N");
    if (n) {
      const [family = "", given = "", extra = ""] = split(n.value, ";").map(unescape);
      name = [given, extra, family].map((x) => x.trim()).filter(Boolean).join(" ");
    }
  }
  name = name.replace(/\s+/g, " ").trim();
  if (!name) return null;
  let birthday = parseVDate(get("BDAY")?.value ?? "");
  const dates: ImportedDate[] = [];
  const add = (d: ImportedDate) => { if (d.date && !dates.some((x) => x.kind === d.kind && x.date === d.date)) dates.push(d); };
  for (const p of props) {
    if (p.name === "ANNIVERSARY" || p.name === "X-ANNIVERSARY") add({ kind: "anniversary", label: "", date: parseVDate(p.value) });
    // Android contact events: X-ANDROID-CUSTOM:vnd.android.cursor.item/contact_event;DATE;TYPE;LABEL (1 anniversary, 3 birthday, 0 custom).
    if (p.name === "X-ANDROID-CUSTOM" && /contact_event/.test(p.value)) {
      const [, date = "", type = "", label = ""] = split(p.value, ";").map(unescape);
      const iso = parseVDate(date);
      if (type === "3") { if (!birthday) birthday = iso; }
      else if (type === "1") add({ kind: "anniversary", label: "", date: iso });
      else if (label.trim()) add({ kind: "custom", label: label.trim(), date: iso });
    }
  }
  return { name, birthday, dates };
}
