/**
 * FARO — Captura Inteligente, Ola 3 (segunda entrega): la cerca del
 * lector de Excel (mapa F5). Los especímenes son libros .xlsx REALES,
 * construidos byte a byte en la propia prueba (zip con CRC, textos
 * compartidos, estilos con fecha de Excel, una hoja deflactada): el
 * lector casero se prueba contra el formato, no contra su propia idea.
 * El contrato: cada hoja llega como tabla cruda; fromXlsx entra por el
 * mismo camino genérico del CSV pero SIEMPRE muestra su mapa antes que
 * las filas; la fila de total se excluye contándola, nunca callada.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { readXlsx } from "./xlsxread.ts";
import { fromXlsx, remap, xlsxSheet } from "./bankparse.ts";

/* --- un zip mínimo y válido, como lo escribiría Excel ------------------ */
const CRC_TABLE = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (data: Uint8Array): number => {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const enc = new TextEncoder();
function zip(files: { name: string; data: Uint8Array; deflate?: boolean }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const stored = f.deflate ? deflateRawSync(f.data) : f.data;
    const crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, f.deflate ? 8 : 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, stored.length, true);
    lv.setUint32(22, f.data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, f.deflate ? 8 : 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, stored.length, true);
    cv.setUint32(24, f.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cen.set(name, 46);
    parts.push(local, stored);
    central.push(cen);
    offset += local.length + stored.length;
  }
  const cenSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cenSize, true);
  ev.setUint32(16, offset, true);
  const all = [...parts, ...central, eocd];
  const out = new Uint8Array(all.reduce((s, a) => s + a.length, 0));
  let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

/* --- el libro espécimen ------------------------------------------------ */
const SHARED = `<?xml version="1.0"?><sst count="9" uniqueCount="6"><si><t>Fecha</t></si><si><t>Concepto</t></si><si><t>Monto</t></si><si><t>Leche</t></si><si><t>Pan</t></si><si><t>Total</t></si></sst>`;
const STYLES = `<?xml version="1.0"?><styleSheet><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>`;
// 44927 = 2023-01-01 en serial de Excel. La fila 4 es el total, CON fecha:
// solo la regla de totales la mantiene fuera.
const SHEET1 = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
<row r="2"><c r="A2" s="1"><v>44927</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>120.5</v></c></row>
<row r="3"><c r="A3" s="1"><v>44928</v></c><c r="B3" t="s"><v>4</v></c><c r="C3"><v>45</v></c></row>
<row r="4"><c r="A4" s="1"><v>44928</v></c><c r="B4" t="s"><v>5</v></c><c r="C4"><v>165.5</v></c></row>
</sheetData></worksheet>`;
const SHEET2 = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
<row r="2"><c r="A2" s="1"><v>44927</v></c><c r="B2" t="inlineStr"><is><t>Remesa</t></is></c><c r="C2"><v>500</v></c></row>
</sheetData></worksheet>`;
const WORKBOOK = `<?xml version="1.0"?><workbook><sheets><sheet name="Gastos" sheetId="1" r:id="rId1"/><sheet name="Ingresos" sheetId="2" r:id="rId2"/></sheets></workbook>`;
const RELS = `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>`;

const inflate = async (d: Uint8Array) => new Uint8Array(inflateRawSync(d));
const book = () => zip([
  { name: "xl/workbook.xml", data: enc.encode(WORKBOOK) },
  { name: "xl/_rels/workbook.xml.rels", data: enc.encode(RELS) },
  { name: "xl/sharedStrings.xml", data: enc.encode(SHARED) },
  { name: "xl/styles.xml", data: enc.encode(STYLES) },
  { name: "xl/worksheets/sheet1.xml", data: enc.encode(SHEET1) },
  { name: "xl/worksheets/sheet2.xml", data: enc.encode(SHEET2), deflate: true },
]);

describe("ola3b · el lector casero de Excel", () => {
  it("lee el libro entero: dos hojas, textos compartidos, fecha serial → ISO", async () => {
    const r = await readXlsx(book(), inflate);
    assert.ok("sheets" in r, "el libro se lee");
    if (!("sheets" in r)) return;
    assert.deepEqual(r.sheets.map((s) => s.name), ["Gastos", "Ingresos"]);
    const g = r.sheets[0].rows;
    assert.deepEqual(g[0], ["Fecha", "Concepto", "Monto"]);
    assert.equal(g[1][0], "2023-01-01", "el serial 44927 con estilo de fecha nace ISO");
    assert.equal(g[1][1], "Leche");
    assert.equal(g[1][2], "120.5");
    const ing = r.sheets[1].rows;
    assert.equal(ing[1][1], "Remesa", "la hoja deflactada y su texto en línea se leen");
    assert.equal(ing[1][2], "500");
  });

  it("lo que no es un zip de Excel se dice unreadable, no se inventa", async () => {
    const r = await readXlsx(enc.encode("esto no es un excel"), inflate);
    assert.deepEqual(r, { error: "unreadable" });
  });

  it("fromXlsx entra por el camino genérico y SIEMPRE muestra su mapa (auto=false)", async () => {
    const r = await readXlsx(book(), inflate);
    assert.ok("sheets" in r);
    if (!("sheets" in r)) return;
    const f = fromXlsx("gastos.xlsx", r.sheets);
    assert.equal(f.format, "xlsx");
    assert.ok(f.sig.startsWith("xlsx:"));
    assert.deepEqual(f.csv?.headers, ["Fecha", "Concepto", "Monto"]);
    assert.equal(f.csv?.auto, false, "el mapa se muestra antes que las filas, manda F5");
    assert.equal(f.rows.length, 0, "sin mapa aplicado no hay filas: nada entra callado");
    const saved = fromXlsx("gastos.xlsx", r.sheets, { [f.sig]: f.csv!.map });
    assert.equal(saved.csv?.auto, false, "ni con mapa recordado se salta la previa: el mapa recordado solo preselecciona");
    assert.deepEqual(saved.csv?.map, f.csv!.map);
  });

  it("al aplicar el mapa, la fila de total se excluye y se cuenta en voz alta", async () => {
    const r = await readXlsx(book(), inflate);
    assert.ok("sheets" in r);
    if (!("sheets" in r)) return;
    const f = fromXlsx("gastos.xlsx", r.sheets);
    const mapped = remap(f, f.csv!.map);
    assert.equal(mapped.rows.length, 2, "Leche y Pan; el Total no es un gasto");
    assert.deepEqual(mapped.rows.map((x) => x.desc), ["Leche", "Pan"]);
    assert.equal(mapped.rows[0].amount, 12050, "el monto viaja en centavos, como en todo bankparse");
    assert.equal(mapped.xlsx?.totals, 1, "la exclusión se cuenta para decirla en la previa");
  });

  it("cada hoja tiene su firma y su mapa: xlsxSheet cambia sin mezclar", async () => {
    const r = await readXlsx(book(), inflate);
    assert.ok("sheets" in r);
    if (!("sheets" in r)) return;
    const f = fromXlsx("gastos.xlsx", r.sheets);
    const s2 = xlsxSheet(f, 1);
    assert.equal(s2.xlsx?.sheet, 1);
    const mapped = remap(s2, s2.csv!.map);
    assert.equal(mapped.rows.length, 1);
    assert.equal(mapped.rows[0].desc, "Remesa");
    assert.equal(xlsxSheet(f, 0), f, "pedir la hoja activa no reconstruye nada");
  });

  it("la puerta vive en la hoja de importación viva, por su rama PK", () => {
    const src = readFileSync(new URL("../../components/faro/bank-import.tsx", import.meta.url), "utf8");
    assert.match(src, /readXlsx/, "la hoja lee el Excel con el lector casero");
    assert.match(src, /fromXlsx/, "y lo entrega al flujo del importador");
    assert.match(src, /\.xlsx/, "el selector de archivos admite Excel");
    assert.match(src, /xlsxSheet/, "con su selector de hoja en la previa del mapa");
  });
});
