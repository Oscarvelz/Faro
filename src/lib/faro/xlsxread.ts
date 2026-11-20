/**
 * FARO — el lector casero de Excel (Captura Inteligente, Ola 3 · mapa F5).
 * Un .xlsx es un zip de XML: este lector camina el directorio central,
 * infla las piezas que necesita (workbook, textos compartidos, estilos
 * y las hojas) y entrega cada hoja como una tabla cruda string[][] — la
 * misma tabla que bankparse ya sabe comer desde el CSV. Sin librerías:
 * el zip se lee a mano, como export-docs.ts lo escribe.
 *
 * Decisiones declaradas: el CRC no se verifica (el análisis del XML es
 * la comprobación real); las fechas de Excel (seriales con estilo de
 * fecha) se convierten a ISO en la celda; un formato de hora sin día ni
 * año no se trata como fecha; el serial 60 (el 29-feb-1900 ficticio de
 * Excel) rueda al 1 de marzo, como en todo lector práctico.
 */
export type XlsxSheetTable = { name: string; rows: string[][] };
export type Inflate = (data: Uint8Array) => Promise<Uint8Array>;

const defaultInflate: Inflate = async (data) => {
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!DS) throw new Error("no DecompressionStream");
  const stream = new DS("deflate-raw");
  const out = await new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(out);
};

type ZipEntry = { name: string; method: number; size: number; offset: number };

function zipEntries(bytes: Uint8Array): ZipEntry[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const floor = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= floor; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    out.push({ name, method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function entryBytes(bytes: Uint8Array, e: ZipEntry, inflate: Inflate): Promise<Uint8Array> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(e.offset, true) !== 0x04034b50) throw new Error("bad local header");
  const nameLen = dv.getUint16(e.offset + 26, true);
  const extraLen = dv.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const raw = bytes.subarray(start, start + e.size);
  if (e.method === 0) return raw;
  if (e.method === 8) return inflate(raw);
  throw new Error(`zip method ${e.method}`);
}

const decXml = (s: string): string => s
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const textsOf = (inner: string): string => [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decXml(m[1])).join("");

function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textsOf(m[1]));
}

const DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 57]);

/** style index → is it a date format? (built-in ids + custom codes naming y/d, or m beside y/d) */
function dateStyles(xml: string): boolean[] {
  const custom = new Map<number, string>();
  for (const m of xml.matchAll(/<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) custom.set(Number(m[1]), decXml(m[2]));
  const xfs = xml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
  return [...xfs.matchAll(/<xf[^>]*numFmtId="(\d+)"/g)].map((m) => {
    const id = Number(m[1]);
    if (DATE_IDS.has(id)) return true;
    const code = custom.get(id);
    if (!code) return false;
    const bare = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
    return /y/i.test(bare) || /d/i.test(bare) || (/m/i.test(bare) && /[yd]/i.test(bare));
  });
}

const serialToIso = (serial: number): string => {
  const days = Math.floor(serial);
  const d = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
  return d.toISOString().slice(0, 10);
};

const plainNum = (v: string): string => {
  if (!/[eE]/.test(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : v;
};

const colOf = (ref: string): number => {
  const m = ref.match(/^([A-Z]+)/);
  if (!m) return -1;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

function sheetRows(xml: string, shared: string[], dates: boolean[]): string[][] {
  const rows: string[][] = [];
  let width = 0;
  for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    let nextCol = 0;
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const inner = cm[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const col = ref ? colOf(ref) : nextCol;
      if (col < 0) continue;
      nextCol = col + 1;
      const t = attrs.match(/\bt="([^"]*)"/)?.[1] ?? "";
      const sIdx = attrs.match(/\bs="(\d+)"/)?.[1];
      let val = "";
      if (t === "s") {
        const idx = Number(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
        val = shared[idx] ?? "";
      } else if (t === "inlineStr") {
        val = textsOf(inner);
      } else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v != null) {
          const raw = decXml(v);
          if (t === "" || t === "n") {
            const num = Number(raw);
            val = Number.isFinite(num) && sIdx != null && dates[Number(sIdx)] ? serialToIso(num) : plainNum(raw);
          } else val = raw;
        }
      }
      cells[col] = val;
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] == null) cells[i] = "";
    width = Math.max(width, cells.length);
    rows.push(cells);
  }
  return rows.map((r) => [...r, ...Array(Math.max(0, width - r.length)).fill("")]);
}

/** Lee un .xlsx completo: cada hoja como tabla cruda, en el orden del libro. */
export async function readXlsx(bytes: Uint8Array, inflate: Inflate = defaultInflate): Promise<{ sheets: XlsxSheetTable[] } | { error: string }> {
  try {
    const entries = zipEntries(bytes);
    const byName = new Map(entries.map((e) => [e.name, e]));
    const text = async (name: string): Promise<string | null> => {
      const e = byName.get(name);
      if (!e) return null;
      return new TextDecoder().decode(await entryBytes(bytes, e, inflate));
    };
    const workbook = await text("xl/workbook.xml");
    if (!workbook) return { error: "unreadable" };
    const relsXml = await text("xl/_rels/workbook.xml.rels");
    const rels = new Map<string, string>();
    if (relsXml) for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g)) {
      rels.set(m[1], m[2].replace(/^\//, "").replace(/^xl\//, "xl/"));
    }
    const shared = sharedStrings((await text("xl/sharedStrings.xml")) ?? "");
    const dates = dateStyles((await text("xl/styles.xml")) ?? "");
    const sheets: XlsxSheetTable[] = [];
    for (const m of workbook.matchAll(/<sheet\s[^>]*>/g)) {
      const tag = m[0];
      const name = decXml(tag.match(/name="([^"]*)"/)?.[1] ?? `Hoja ${sheets.length + 1}`);
      const rid = tag.match(/r:id="([^"]*)"/)?.[1] ?? "";
      const target = rels.get(rid) ?? `xl/worksheets/sheet${sheets.length + 1}.xml`;
      const xml = await text(target.startsWith("xl/") ? target : `xl/${target}`);
      if (xml) sheets.push({ name, rows: sheetRows(xml, shared, dates) });
    }
    return sheets.length ? { sheets } : { error: "unreadable" };
  } catch {
    return { error: "unreadable" };
  }
}
