import { sampleOn } from "./samplemode";
import { buildAdvice, categorySlices, inView, monthLines, roleOf, summarize, yearPoints } from "./engine";
import { monthName } from "./i18n";
import { formatMoney } from "./money";
import { loanPays, loanState, loansOf } from "./loans";
import { cardFigures, cardMonthlyInterest, cardPays, cardsOf, rewardsEarned, rewardsOf, storedCards } from "./cards";
import { lentOf, lentPays, lentState, monthAhead, netBalance, payoffPlan } from "./debts";
import { remitTrend } from "./remesas";
import type { Lang, LedgerState, Line, LineKind } from "./types";
import type { makeNamer } from "./defaults";

export type ExportScope = "month" | "year" | "all";
export type ExportPick = {
  scope: ExportScope;
  activeOnly: boolean;
  kinds: LineKind[];
  savings: boolean;
  debt: boolean;
  summary: boolean;
  charts: boolean;
  advice: boolean;
};

type Names = ReturnType<typeof makeNamer>;
type RichCell = { v: string | number; s: number };
type Cell = string | number | RichCell | null;
type Sheet = { name: string; rows: Cell[][]; widths?: number[]; merges?: string[]; bars?: { ref: string; color: string }[] };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><name val="Calibri"/></font>
</fonts>
<fills count="10">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1B5E43"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7EAEE"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7C27A"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD7EFE3"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF6E4C4"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF4D2CE"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF7FBF8"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE4EEF2"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FFC3D6CA"/></left>
<right style="thin"><color rgb="FFC3D6CA"/></right>
<top style="thin"><color rgb="FFC3D6CA"/></top>
<bottom style="thin"><color rgb="FFC3D6CA"/></bottom>
<diagonal/>
</border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="32">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="1" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="1" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="1" fillId="6" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="1" fillId="7" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="3" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="9" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="8" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const S = {
  title: 1, section: 2, bold: 3, head: 4, num: 5, total: 6, totalNum: 7, note: 8, good: 9, warn: 10, bad: 11,
  titleBox: 12, monthBox: 13, inBanner: 14, varBanner: 15, line: 16, lineNum: 17, cat: 18,
  have: 19, haveNum: 20, spend: 21, spendNum: 22, ratio: 23, ratioNum: 24,
  left: 25, leftNum: 26, leftBad: 27, debt: 28, noteBox: 29, flowHead: 30, altNum: 31,
};

const KINDS: LineKind[] = ["income-fixed", "income-variable", "expense-fixed", "expense-variable", "purchase", "subscription"];

function xml(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function col(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    out = String.fromCharCode(65 + m) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function sheetXml(sheet: Sheet): string {
  const body = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          if (cell === null || cell === "") return "";
          const ref = `${col(c)}${r + 1}`;
          const value = typeof cell === "object" ? cell.v : cell;
          const style = typeof cell === "object" && cell.s ? ` s="${cell.s}"` : "";
          if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(String(value))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";
  const bars = (sheet.bars ?? []).map((bar, i) => `<conditionalFormatting sqref="${bar.ref}"><cfRule type="dataBar" priority="${i + 1}"><dataBar><cfvo type="num" val="0"/><cfvo type="max"/><color rgb="${bar.color}"/></dataBar></cfRule></conditionalFormatting>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${body}</sheetData>${merges}${bars}</worksheet>`;
}

function crc32(data: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < data.length; i += 1) {
    c ^= data[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name);
    const crc = crc32(file.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, file.data.length, true);
    local.setUint32(22, file.data.length, true);
    local.setUint16(26, name.length, true);
    const head = new Uint8Array(local.buffer);
    parts.push(head, name, file.data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, file.data.length, true);
    cen.setUint32(24, file.data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += head.length + name.length + file.data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const part of [...parts, ...central, new Uint8Array(end.buffer)]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

function xlsx(sheets: Sheet[]): Blob {
  const enc = new TextEncoder();
  const names = sheets.map((sheet, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const workbookSheets = sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  const rels = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  const files = [
    { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names}</Types>`) },
    { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: "xl/styles.xml", data: enc.encode(STYLES) },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(sheet)) })),
  ];
  return new Blob([Uint8Array.from(zipStore(files))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const WIN: Record<string, number> = {
  "á": 0xe1, "é": 0xe9, "í": 0xed, "ó": 0xf3, "ú": 0xfa, "ñ": 0xf1, "ü": 0xfc,
  "Á": 0xc1, "É": 0xc9, "Í": 0xcd, "Ó": 0xd3, "Ú": 0xda, "Ñ": 0xd1, "Ü": 0xdc,
  "¿": 0xbf, "¡": 0xa1, "°": 0xb0, "–": 0x96, "—": 0x97,
};

function pdfText(value: string): string {
  let out = "";
  for (const ch of value) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else {
      const code = WIN[ch];
      if (code) out += `\\${code.toString(8).padStart(3, "0")}`;
      else if (ch.charCodeAt(0) < 128) out += ch;
      else out += "?";
    }
  }
  return out;
}

function pdfBlob(pages: string[], landscape = false): Blob {
  const enc = new TextEncoder();
  const objects: string[] = [];
  const box = landscape ? "0 0 792 612" : "0 0 612 792";
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  let id = 3;
  const kids: string[] = [];
  for (const content of pages) {
    const pageId = id;
    const contentId = id + 1;
    kids.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [${box}] /Contents ${contentId} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> >> >> >>`);
    const stream = enc.encode(content);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);
    id += 2;
  }
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(" ")}] >>`;
  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([body], { type: "application/pdf" });
}

function wrap(value: string, size = 88): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > size && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function money(minor: number, ledger: LedgerState, lang: Lang): string {
  return formatMoney(minor, ledger.settings.display, lang);
}

function monthKeys(ledger: LedgerState, key: string, scope: ExportScope): string[] {
  if (scope === "month") return [key];
  if (scope === "year") {
    const year = key.slice(0, 4);
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  }
  return Object.keys(ledger.months).sort();
}

function pickedLines(ledger: LedgerState, key: string, pick: ExportPick): Line[] {
  const wanted = new Set(pick.kinds);
  const lines: Line[] = [];
  for (const month of monthKeys(ledger, key, pick.scope)) {
    for (const line of monthLines(ledger, month)) {
      if (pick.activeOnly && !line.active) continue;
      const role = roleOf(ledger.structure, line.categoryId);
      const byKind = wanted.has(line.kind);
      const bySave = pick.savings && role === "savings";
      const byDebt = pick.debt && role === "debt";
      if (byKind || bySave || byDebt) lines.push(line);
    }
  }
  return lines;
}

type Item = { name: string; amount: number };
type Block = { title: string; items: Item[] };
type Slot = { kind: "head" | "item" | "blank"; name: string; amount?: number };

function say(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

function majorOf(line: Line, ledger: LedgerState): number {
  return Math.round(inView(line, ledger.settings.display, ledger.settings.rateE4)) / 100;
}

function monthLinesPicked(ledger: LedgerState, month: string, pick: ExportPick): Line[] {
  const wanted = new Set(pick.kinds);
  return monthLines(ledger, month).filter((line) => {
    if (pick.activeOnly && !line.active) return false;
    const role = roleOf(ledger.structure, line.categoryId);
    return wanted.has(line.kind) || (pick.savings && role === "savings") || (pick.debt && role === "debt");
  });
}

function budgetMonths(ledger: LedgerState, key: string, scope: ExportScope): string[] {
  if (scope === "month") return [key];
  if (scope === "year") {
    const year = key.slice(0, 4) || String(new Date().getFullYear());
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  }
  const keys = Object.keys(ledger.months);
  if (key && !keys.includes(key)) keys.push(key);
  return keys.sort();
}

function monthLabel(lang: Lang, key: string): string {
  const [year, month] = key.split("-").map(Number);
  const name = monthName(lang, month || 1);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year || ""}`.trim();
}

function sheetTitle(base: string, used: Set<string>): string {
  const clean = base.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Hoja";
  let name = clean;
  let n = 2;
  while (used.has(name)) {
    const suffix = ` ${n}`;
    name = `${clean.slice(0, 31 - suffix.length)}${suffix}`;
    n += 1;
  }
  used.add(name);
  return name;
}

function sumItems(lines: Line[], ledger: LedgerState): number {
  return Math.round(lines.reduce((sum, line) => sum + majorOf(line, ledger), 0) * 100) / 100;
}

function categoryBlocks(ledger: LedgerState, names: Names, lines: Line[], group: "fixed" | "variable", kind: Line["kind"], lang: Lang): Block[] {
  const cats = ledger.structure.categories.filter((cat) => cat.group === group && !cat.hidden).sort((a, b) => a.order - b.order);
  const used = new Set<string>();
  const blocks: Block[] = [];
  for (const cat of cats) {
    const items = lines.filter((line) => line.kind === kind && line.categoryId === cat.id);
    if (!items.length) continue;
    used.add(cat.id);
    blocks.push({ title: names.cat(cat.id), items: items.map((line) => ({ name: line.concept || names.cat(cat.id), amount: majorOf(line, ledger) })) });
  }
  const rest = lines.filter((line) => line.kind === kind && !used.has(line.categoryId));
  if (rest.length) {
    blocks.push({
      title: say(lang, "Otros", "Other"),
      items: rest.map((line) => ({ name: line.concept || say(lang, "Otros", "Other"), amount: majorOf(line, ledger) })),
    });
  }
  return blocks;
}

function namedBlocks(lines: Line[], ledger: LedgerState, titleOf: (line: Line) => string, fallback: string): Block[] {
  const map = new Map<string, Item[]>();
  for (const line of lines) {
    const title = titleOf(line) || fallback;
    const list = map.get(title) ?? [];
    list.push({ name: line.concept || title, amount: majorOf(line, ledger) });
    map.set(title, list);
  }
  return [...map.entries()].map(([title, items]) => ({ title, items }));
}

function stackBlocks(blocks: Block[]): Slot[][] {
  const cols: Slot[][] = [[], [], []];
  const height = [0, 0, 0];
  for (const block of blocks) {
    const slots: Slot[] = [{ kind: "head", name: block.title }];
    const items = block.items.length ? block.items : [{ name: "—", amount: 0 }];
    for (const item of items) slots.push({ kind: "item", name: item.name, amount: item.amount });
    slots.push({ kind: "blank", name: "" });
    let at = 0;
    if (height[1] < height[at]) at = 1;
    if (height[2] < height[at]) at = 2;
    cols[at].push(...slots);
    height[at] += slots.length;
  }
  return cols;
}

function paintColumns(rows: Cell[][], cols: Slot[][]) {
  const n = Math.max(cols[0].length, cols[1].length, cols[2].length);
  const at = [0, 3, 6];
  for (let i = 0; i < n; i += 1) {
    const row: Cell[] = ["", "", "", "", "", "", "", ""];
    for (let c = 0; c < 3; c += 1) {
      const slot = cols[c][i];
      if (!slot || slot.kind === "blank") continue;
      if (slot.kind === "head") row[at[c]] = { v: slot.name, s: S.cat };
      else {
        row[at[c]] = { v: slot.name, s: S.line };
        row[at[c] + 1] = { v: Math.round((slot.amount ?? 0) * 100) / 100, s: S.lineNum };
      }
    }
    rows.push(row);
  }
}

function span(rows: Cell[][], merges: string[], text: string, style: number) {
  const r = rows.length + 1;
  rows.push([{ v: text, s: style }]);
  merges.push(`A${r}:H${r}`);
}

function debtTone(pct: number | null, green: number, yellow: number): number {
  if (pct === null) return S.totalNum;
  if (pct < green) return S.good;
  if (pct <= yellow) return S.warn;
  return S.bad;
}

function budgetSheet(ledger: LedgerState, month: string, lang: Lang, names: Names, pick: ExportPick, used: Set<string>, solo: boolean): Sheet {
  const lines = monthLinesPicked(ledger, month, pick);
  const fixedLines = lines.filter((line) => line.kind === "expense-fixed");
  const variableLines = lines.filter((line) => line.kind === "expense-variable");
  const purchaseLines = lines.filter((line) => line.kind === "purchase");
  const subLines = lines.filter((line) => line.kind === "subscription");
  const incomeFixed = lines.filter((line) => line.kind === "income-fixed");
  const incomeVariable = lines.filter((line) => line.kind === "income-variable");
  const income = sumItems([...incomeFixed, ...incomeVariable], ledger);
  const fixed = sumItems(fixedLines, ledger);
  const variable = sumItems([...variableLines, ...purchaseLines, ...subLines], ledger);
  const expense = Math.round((fixed + variable) * 100) / 100;
  const left = Math.round((income - expense) * 100) / 100;
  const ratio = income > 0 ? Math.round((expense / income) * 1000) / 10 : 0;
  const debtLines = lines.filter((line) => roleOf(ledger.structure, line.categoryId) === "debt");
  const debt = sumItems(debtLines, ledger);
  const green = ledger.settings.debtGreenPct;
  const yellow = ledger.settings.debtYellowPct;
  const allowance = Math.round(((income * green) / 100) * 100) / 100;
  const debtPct = income > 0 ? (debt / income) * 100 : null;
  const rows: Cell[][] = [];
  const merges: string[] = [];
  const label = monthLabel(lang, month);
  rows.push([{ v: say(lang, "Presupuesto mensual", "Monthly budget"), s: S.titleBox }, "", "", "", "", { v: say(lang, "Mes", "Month"), s: S.monthBox }, { v: label, s: S.monthBox }, ""]);
  merges.push("A1:E1");
  merges.push("F1:H1");
  rows.push([]);
  span(rows, merges, say(lang, "INGRESOS", "INCOME"), S.section);
  rows.push([
    { v: say(lang, "Ingresos fijos: dinero que obtienes cada mes", "Fixed income: money you receive every month"), s: S.inBanner },
    "",
    "",
    { v: say(lang, "Ingresos variables: dinero que obtienes de vez en cuando", "Variable income: money you receive now and then"), s: S.varBanner },
  ]);
  merges.push(`A${rows.length}:B${rows.length}`);
  merges.push(`D${rows.length}:F${rows.length}`);
  rows.push([{ v: say(lang, "Concepto", "Item"), s: S.head }, { v: say(lang, "Monto", "Amount"), s: S.head }, "", { v: say(lang, "Concepto", "Item"), s: S.head }, { v: say(lang, "Monto", "Amount"), s: S.head }]);
  const leftRows = incomeFixed.length ? incomeFixed : [];
  const rightRows = incomeVariable.length ? incomeVariable : [];
  const n = Math.max(leftRows.length, rightRows.length, 1);
  for (let i = 0; i < n; i += 1) {
    const row: Cell[] = ["", "", "", "", "", "", "", ""];
    const a = leftRows[i];
    const b = rightRows[i];
    if (a) {
      row[0] = { v: a.concept || say(lang, "Ingreso fijo", "Fixed income"), s: S.line };
      row[1] = { v: majorOf(a, ledger), s: S.lineNum };
    } else if (!leftRows.length && i === 0) row[0] = "—";
    if (b) {
      row[3] = { v: b.concept || say(lang, "Ingreso variable", "Variable income"), s: S.line };
      row[4] = { v: majorOf(b, ledger), s: S.lineNum };
    } else if (!rightRows.length && i === 0) row[3] = "—";
    rows.push(row);
  }
  rows.push([{ v: say(lang, "Total de ingresos", "Total income"), s: S.total }, { v: income, s: S.totalNum }]);
  rows.push([]);
  span(rows, merges, say(lang, "GASTOS", "EXPENSES"), S.section);
  span(rows, merges, say(lang, "Gastos fijos: los que haces necesariamente cada mes", "Fixed costs: what you necessarily spend each month"), S.head);
  paintColumns(rows, stackBlocks(categoryBlocks(ledger, names, lines, "fixed", "expense-fixed", lang)));
  rows.push([{ v: say(lang, "Total gastos fijos", "Total fixed expenses"), s: S.total }, { v: fixed, s: S.totalNum }]);
  rows.push([]);
  span(rows, merges, say(lang, "Gastos variables: los que haces de vez en cuando durante el mes", "Variable costs: what you spend now and then during the month"), S.head);
  const variableBlocks = [
    ...categoryBlocks(ledger, names, lines, "variable", "expense-variable", lang),
    ...namedBlocks(purchaseLines, ledger, (line) => names.purchase(line.categoryId), say(lang, "Compras", "Shopping")),
    ...namedBlocks(subLines, ledger, (line) => names.catalog(line.providerId), say(lang, "Cuotas", "Subscriptions")),
  ];
  paintColumns(rows, stackBlocks(variableBlocks));
  rows.push([{ v: say(lang, "Total gastos variables", "Total variable expenses"), s: S.total }, { v: variable, s: S.totalNum }]);
  rows.push([]);
  rows.push([{ v: say(lang, "Total de gastos (fijos + variables)", "Total expenses (fixed + variable)"), s: S.total }, { v: expense, s: S.totalNum }]);
  rows.push([]);
  rows.push([
    { v: say(lang, "Tengo", "I have"), s: S.have },
    { v: income, s: S.haveNum },
    "",
    { v: say(lang, "Gastaré", "I will spend"), s: S.spend },
    { v: expense, s: S.spendNum },
    "",
    { v: say(lang, "Gastas un", "You spend"), s: S.ratio },
    { v: ratio, s: S.ratioNum },
  ]);
  rows.push([
    { v: say(lang, "Oportunidad de mejora", "Room to improve"), s: left >= 0 ? S.left : S.debt },
    { v: left, s: left >= 0 ? S.leftNum : S.leftBad },
    "",
    "",
    "",
    "",
    { v: say(lang, "% de tus ingresos", "% of your income"), s: S.note },
  ]);
  rows.push([]);
  rows.push([
    { v: say(lang, "Dinero que podrías destinar para deudas", "Money you could put toward debt"), s: S.debt },
    { v: allowance, s: S.ratioNum },
    "",
    { v: say(lang, "Total de deudas", "Total debt"), s: S.debt },
    { v: debt, s: debtPct !== null && debtPct > yellow ? S.leftBad : debtPct !== null && debtPct >= green ? S.spendNum : S.leftNum },
  ]);
  merges.push(`A${rows.length}:C${rows.length}`);
  const note = say(
    lang,
    `Tus deudas no deben superar ese cupo, que es el ${green}% de tus ingresos. Verde: estás por debajo. Amarillo: entre ${green}% y ${yellow}%, no te excedas. Rojo: pasaste el ${yellow}% y no conviene endeudarte más.`,
    `Debt should stay inside that allowance, ${green}% of income. Green: you are under it. Yellow: between ${green}% and ${yellow}%, do not go past it. Red: above ${yellow}%, do not take on more debt.`,
  );
  span(rows, merges, note, S.noteBox);
  const name = solo ? say(lang, "Presupuesto", "Budget") : label;
  return { name: sheetTitle(name, used), rows, widths: [34, 14, 3, 34, 14, 3, 28, 16], merges };
}

function budgetSheets(ledger: LedgerState, key: string, lang: Lang, names: Names, pick: ExportPick): Sheet[] {
  const used = new Set<string>();
  const months = budgetMonths(ledger, key, pick.scope);
  const solo = months.length === 1;
  return months.map((month) => budgetSheet(ledger, month, lang, names, pick, used, solo));
}

function buildSheets(ledger: LedgerState, key: string, lang: Lang, names: Names, pick: ExportPick): Sheet[] {
  const sheets: Sheet[] = budgetSheets(ledger, key, lang, names, pick);
  const lines = pickedLines(ledger, key, pick);
  if (pick.kinds.length || pick.savings || pick.debt) {
    sheets.push({
      name: "Movimientos",
      rows: [
        ["Mes", "Tipo", "Concepto", "Monto", "Moneda", "Categoria", "Nota", "Activo"],
        ...lines.map((line) => [
          line.monthKey,
          line.kind,
          line.concept,
          Math.round(line.amountMinor) / 100,
          line.currency,
          names.cat(line.categoryId) || names.purchase(line.categoryId),
          line.note,
          line.active ? 1 : 0,
        ]),
      ],
    });
  }
  if (pick.summary) {
    const summary = summarize(ledger, key, lang);
    sheets.push({
      name: "Resumen",
      widths: [28, 16],
      merges: ["A1:B1"],
      bars: [{ ref: "B3:B10", color: "FF1B5E43" }],
      rows: [
        [{ v: say(lang, "Lectura del mes", "Reading of the month"), s: S.section }],
        [{ v: say(lang, "Campo", "Field"), s: S.flowHead }, { v: say(lang, "Monto", "Amount"), s: S.flowHead }],
        [{ v: say(lang, "Ingresos", "Income"), s: S.have }, { v: summary.income / 100, s: S.haveNum }],
        [{ v: say(lang, "Gastos fijos", "Fixed costs"), s: S.line }, { v: summary.fixed / 100, s: S.lineNum }],
        [{ v: say(lang, "Gastos variables", "Variable costs"), s: S.line }, { v: summary.variable / 100, s: S.lineNum }],
        [{ v: say(lang, "Compras", "Shopping"), s: S.line }, { v: summary.purchases / 100, s: S.lineNum }],
        [{ v: say(lang, "Cuotas", "Subscriptions"), s: S.line }, { v: summary.subscriptions / 100, s: S.lineNum }],
        [{ v: say(lang, "Pagos", "Payments"), s: S.debt }, { v: summary.debt / 100, s: S.spendNum }],
        [{ v: say(lang, "Queda", "Left"), s: summary.opportunity >= 0 ? S.left : S.debt }, { v: summary.opportunity / 100, s: summary.opportunity >= 0 ? S.leftNum : S.leftBad }],
        [{ v: say(lang, "Ahorro del mes", "Saved this month"), s: S.ratio }, { v: summary.savingsFlow / 100, s: S.ratioNum }],
      ],
    });
  }
  if (pick.charts) {
    const year = Number(key.slice(0, 4)) || new Date().getFullYear();
    const points = pick.scope === "all"
      ? Object.keys(ledger.months).sort().map((month) => {
          const found = yearPoints(ledger, Number(month.slice(0, 4)) || year, lang).find((point) => point.key === month);
          return found ?? { key: month, label: month, income: 0, expense: 0 };
        })
      : yearPoints(ledger, year, lang);
    const last = points.length + 2;
    sheets.push({
      name: "Flujo",
      widths: [18, 16, 16, 16],
      merges: ["A1:D1"],
      bars: points.length ? [{ ref: `B3:B${last}`, color: "FF1B5E43" }, { ref: `C3:C${last}`, color: "FFC4A15A" }] : [],
      rows: [
        [{ v: say(lang, "Flujo: lo que entra y lo que sale", "Flow: what comes in and what goes out"), s: S.section }],
        [{ v: say(lang, "Mes", "Month"), s: S.flowHead }, { v: say(lang, "Ingresos", "Income"), s: S.flowHead }, { v: say(lang, "Gastos", "Expenses"), s: S.flowHead }, { v: say(lang, "Neto", "Net"), s: S.flowHead }],
        ...points.map((point) => {
          const net = Math.round((point.income - point.expense) * 100) / 100;
          return [
            { v: point.label, s: S.line },
            { v: point.income, s: S.haveNum },
            { v: point.expense, s: S.spendNum },
            { v: net, s: net >= 0 ? S.leftNum : S.leftBad },
          ];
        }),
      ],
    });
    const slices = categorySlices(ledger, key, names);
    const total = slices.reduce((sum, item) => sum + item.minor, 0);
    sheets.push({
      name: "Categorias",
      widths: [28, 16, 12],
      merges: ["A1:C1"],
      bars: slices.length ? [{ ref: `B3:B${slices.length + 2}`, color: "FF1B5E43" }] : [],
      rows: [
        [{ v: say(lang, "A dónde se va el gasto", "Where the spending goes"), s: S.section }],
        [{ v: say(lang, "Categoría", "Category"), s: S.flowHead }, { v: say(lang, "Monto", "Amount"), s: S.flowHead }, { v: "%", s: S.flowHead }],
        ...slices.map((slice) => [
          { v: slice.name, s: S.line },
          { v: slice.minor / 100, s: S.lineNum },
          { v: total > 0 ? Math.round((slice.minor / total) * 1000) / 10 : 0, s: S.altNum },
        ]),
      ],
    });
  }
  // Remesas (1.3.86): the last 12 months sent home, US$ and C$ at today's rate, with the change and the share of income.
  if (pick.charts) {
    const rt = remitTrend(ledger, key, 12);
    if (rt.any) {
      const last = rt.months.length + 2;
      sheets.push({
        name: "Remesas",
        widths: [14, 14, 16, 12, 14],
        merges: ["A1:E1"],
        bars: [{ ref: `B3:B${last}`, color: "FFD98A5F" }],
        rows: [
          [{ v: say(lang, "Remesas: lo que mandas a casa", "Remittances: what you send home"), s: S.section }],
          [say(lang, "Mes", "Month"), "US$", "C$", say(lang, "Cambio %", "Change %"), say(lang, "% del ingreso", "% of income")].map((v) => ({ v, s: S.flowHead })),
          ...rt.months.map((m, i) => {
            const prev = rt.months[i - 1];
            const ch = prev && prev.usd > 0 ? Math.round(((m.usd - prev.usd) / prev.usd) * 1000) / 10 : "";
            return [
              { v: m.key, s: S.line },
              { v: m.usd / 100, s: S.spendNum },
              { v: m.nio / 100, s: S.lineNum },
              { v: ch, s: S.altNum },
              { v: m.income > 0 ? Math.round((m.usd / m.income) * 1000) / 10 : "", s: S.altNum },
            ];
          }),
          [{ v: say(lang, "Promedio (meses con envío)", "Average (months with a remittance)"), s: S.ratio }, { v: rt.avgUsd / 100, s: S.ratioNum }],
        ],
      });
    }
  }
  // Loans received (Debo → Préstamos): one row each, in the loan's own currency, interest as of today.
  const loans = loansOf(ledger);
  if (loans.length && Object.values(pick).some(Boolean)) {
    const head = [say(lang, "Quién prestó", "Lender"), say(lang, "Libro", "Book"), say(lang, "Moneda", "Currency"), say(lang, "Recibido", "Received"), say(lang, "Fecha", "Date"), say(lang, "Tasa %", "Rate %"), say(lang, "Interés", "Interest"), say(lang, "Pagado", "Paid"), say(lang, "Pendiente", "Pending"), say(lang, "Pagos", "Payments"), say(lang, "Estado", "Status")];
    sheets.push({
      name: say(lang, "Prestamos", "Loans"),
      widths: [24, 12, 10, 14, 12, 10, 14, 14, 14, 10, 14],
      merges: ["A1:K1"],
      rows: [
        [{ v: say(lang, "Préstamos recibidos", "Loans received"), s: S.section }],
        head.map((v) => ({ v, s: S.flowHead })),
        ...loans.map((loan) => {
          const f = loanState(ledger, loan);
          return [
            { v: loan.lender, s: S.line },
            { v: loan.book === "variable" ? say(lang, "Variables", "Variable") : say(lang, "Fijos", "Fixed"), s: S.line },
            { v: loan.currency, s: S.line },
            { v: loan.amountMinor / 100, s: S.lineNum },
            { v: loan.takenOn, s: S.line },
            { v: loan.aprBps / 100, s: S.altNum },
            { v: f.interest / 100, s: S.lineNum },
            { v: f.paid / 100, s: S.lineNum },
            { v: (loan.archived ? loan.unpaidMinor ?? f.left : f.left) / 100, s: S.lineNum },
            { v: loanPays(ledger, loan.id).length, s: S.altNum },
            { v: loan.archived ? say(lang, "Archivado", "Archived") : say(lang, "Activo", "Active"), s: S.line },
          ];
        }),
      ],
    });
  }
  // 1.3.107: credit cards (Debo → Préstamos → Tarjetas): today's figures, then every balance reading and payment.
  const cardRows = [...cardsOf(ledger), ...storedCards(ledger).filter((c) => c.archived)].filter((c) => c.snaps.length || (c.rw?.length ?? 0) || cardPays(ledger, c.id).length);
  if (cardRows.length && Object.values(pick).some(Boolean)) {
    const head = [say(lang, "Tarjeta", "Card"), say(lang, "Emisor", "Issuer"), say(lang, "Moneda", "Currency"), say(lang, "Saldo", "Balance"), say(lang, "Límite", "Limit"), say(lang, "Disponible", "Available"), say(lang, "Uso %", "Use %"), say(lang, "Pago mínimo", "Minimum"), say(lang, "Fecha de pago", "Due date"), say(lang, "Tasa %", "APR %"), say(lang, "Interés al mes", "Interest a month"), say(lang, "Recompensas", "Rewards"), say(lang, "Estado", "Status")];
    const hist: { k: string; row: Cell[] }[] = [];
    for (const c of cardRows) {
      for (const r of c.snaps) hist.push({ k: `${c.name}|${r.on}`, row: [{ v: c.name, s: S.line }, { v: r.on, s: S.line }, { v: r.src === "shot" ? say(lang, "Captura", "Screenshot") : say(lang, "Manual", "Manual"), s: S.line }, { v: r.balanceMinor / 100, s: S.lineNum }] });
      for (const l of cardPays(ledger, c.id).filter((x) => !x.rwCard)) hist.push({ k: `${c.name}|${l.bookedOn || l.monthKey}`, row: [{ v: c.name, s: S.line }, { v: l.bookedOn || l.monthKey, s: S.line }, { v: say(lang, "Abono (transferencia)", "Payment (transfer)"), s: S.line }, { v: -l.amountMinor / 100, s: S.lineNum }] });
    }
    hist.sort((a, b) => a.k.localeCompare(b.k));
    sheets.push({
      name: say(lang, "Tarjetas", "Cards"),
      widths: [30, 16, 10, 14, 14, 14, 10, 14, 14, 10, 14, 14, 12],
      merges: ["A1:M1"],
      rows: [
        [{ v: say(lang, "Tarjetas de crédito", "Credit cards"), s: S.section }],
        head.map((v) => ({ v, s: S.flowHead })),
        ...cardRows.map((c) => {
          const f = cardFigures(ledger, c);
          return [
            { v: `${c.name}${c.last4 ? ` ···${c.last4}` : ""}`, s: S.line }, { v: c.issuer, s: S.line }, { v: c.currency, s: S.line }, { v: f.balance / 100, s: S.lineNum },
            { v: f.limit != null ? f.limit / 100 : "", s: S.lineNum }, { v: f.avail != null ? f.avail / 100 : "", s: S.lineNum }, { v: f.util != null ? Math.round(f.util * 1000) / 10 : "", s: S.altNum },
            { v: f.min != null ? f.min / 100 : "", s: S.lineNum }, { v: f.dueOn, s: S.line }, { v: c.aprBps / 100, s: S.altNum }, { v: cardMonthlyInterest(c, f.balance) / 100, s: S.lineNum },
            { v: rewardsOf(c).known ? rewardsOf(c).amount / 100 : "", s: S.lineNum },
            { v: c.archived ? say(lang, "Archivada", "Archived") : say(lang, "Activa", "Active"), s: S.line },
          ];
        }),
        [],
        [say(lang, "Tarjeta", "Card"), say(lang, "Fecha", "Date"), say(lang, "Origen", "Source"), say(lang, "Saldo / abono", "Balance / payment")].map((v) => ({ v, s: S.flowHead })),
        ...hist.map((h) => h.row),
      ],
    });
  }
  // 1.3.109: card rewards (cash back): every reading, what it added (earned) and every redemption, per card.
  const rwCards = [...cardsOf(ledger), ...storedCards(ledger).filter((c) => c.archived)].filter((c) => (c.rw?.length ?? 0) > 0);
  if (rwCards.length && Object.values(pick).some(Boolean)) {
    const rows: Cell[][] = [];
    for (const c of rwCards) {
      const earned = rewardsEarned(c);
      for (const r of c.rw ?? []) {
        const add = r.src === "redeem" ? 0 : earned.filter((e) => e.on === r.on).reduce((s2, e) => s2 + e.minor, 0);
        const how = r.src === "redeem" ? (r.how === "deposit" ? say(lang, "Canje · depósito (ingreso)", "Redeemed · deposit (income)") : say(lang, "Canje · crédito al saldo", "Redeemed · statement credit")) : r.src === "shot" ? say(lang, "Captura", "Screenshot") : say(lang, "Manual", "Manual");
        rows.push([{ v: `${c.name}${c.last4 ? ` ···${c.last4}` : ""}`, s: S.line }, { v: r.on, s: S.line }, { v: how, s: S.line }, { v: r.amountMinor != null ? r.amountMinor / 100 : "", s: S.lineNum }, { v: add ? add / 100 : "", s: S.lineNum }, { v: r.redeemed ? -r.redeemed / 100 : "", s: S.lineNum }, { v: r.points ?? "", s: S.altNum }, { v: c.currency, s: S.line }]);
      }
    }
    sheets.push({
      name: say(lang, "Recompensas", "Rewards"),
      widths: [30, 12, 26, 14, 14, 14, 12, 10],
      merges: ["A1:H1"],
      rows: [
        [{ v: say(lang, "Recompensas de tarjetas (cuentan en Me deben y el balance neto)", "Card rewards (they count in Owed to me and the net balance)"), s: S.section }],
        [say(lang, "Tarjeta", "Card"), say(lang, "Fecha", "Date"), say(lang, "Origen", "Source"), say(lang, "Recompensas", "Rewards"), say(lang, "Ganado", "Earned"), say(lang, "Canjeado", "Redeemed"), say(lang, "Puntos", "Points"), say(lang, "Moneda", "Currency")].map((v) => ({ v, s: S.flowHead })),
        ...rows,
      ],
    });
  }
  // 1.3.92: Me deben (money lent, abonos are income lines) and the payoff plan for Préstamos.
  const lentRows = lentOf(ledger);
  if (lentRows.length && Object.values(pick).some(Boolean)) {
    const head = [say(lang, "Persona", "Person"), say(lang, "Moneda", "Currency"), say(lang, "Prestado", "Lent"), say(lang, "Desde", "Since"), say(lang, "Cobrar el", "Due"), say(lang, "Tasa %", "Rate %"), say(lang, "Interés", "Interest"), say(lang, "Abonado", "Paid"), say(lang, "Pendiente", "Pending"), say(lang, "Abonos", "Payments"), say(lang, "Estado", "Status")];
    sheets.push({
      name: say(lang, "Me deben", "Owed to me"),
      widths: [24, 10, 14, 12, 12, 10, 14, 14, 14, 10, 14],
      merges: ["A1:K1"],
      rows: [
        [{ v: say(lang, "Me deben", "Owed to me"), s: S.section }],
        head.map((v) => ({ v, s: S.flowHead })),
        ...lentRows.map((l) => {
          const f = lentState(ledger, l);
          return [
            { v: l.person, s: S.line }, { v: l.currency, s: S.line }, { v: l.amountMinor / 100, s: S.lineNum }, { v: l.startedOn, s: S.line }, { v: l.dueOn, s: S.line },
            { v: l.aprBps / 100, s: S.altNum }, { v: f.interest / 100, s: S.lineNum }, { v: f.paid / 100, s: S.lineNum },
            { v: (l.archived ? l.unpaidMinor ?? f.left : f.left) / 100, s: S.lineNum }, { v: lentPays(ledger, l.id).length, s: S.altNum },
            { v: l.archived ? say(lang, "Archivado", "Archived") : say(lang, "Activo", "Active"), s: S.line },
          ];
        }),
      ],
    });
  }
  const plan = payoffPlan(ledger);
  if (plan.debts.length && plan.chosen && Object.values(pick).some(Boolean)) {
    const ch = plan.chosen;
    const name = (o: string) => (o === "avalanche" ? say(lang, "Avalancha", "Avalanche") : say(lang, "Bola de nieve", "Snowball"));
    const net = netBalance(ledger);
    sheets.push({
      name: say(lang, "Plan de pago", "Payoff plan"),
      widths: [8, 26, 12, 16, 16, 18],
      merges: ["A1:F1", "A2:F2"],
      rows: [
        [{ v: say(lang, "Plan de pago de préstamos", "Loan payoff plan"), s: S.section }],
        [{ v: say(lang, `${name(plan.order)} · ${ledger.settings.display} ${(plan.budget / 100).toFixed(2)} al mes · ${ch.months} meses · interés por pagar ${(ch.interest / 100).toFixed(2)} · balance neto ${(net.net / 100).toFixed(2)}`, `${name(plan.order)} · ${ledger.settings.display} ${(plan.budget / 100).toFixed(2)} a month · ${ch.months} months · interest to pay ${(ch.interest / 100).toFixed(2)} · net balance ${(net.net / 100).toFixed(2)}`), s: S.noteBox }],
        [say(lang, "Orden", "Order"), say(lang, "Quién prestó", "Lender"), say(lang, "Tasa %", "Rate %"), say(lang, "Pendiente", "Pending"), say(lang, "Libre en (mes)", "Paid off (month)"), say(lang, "Interés por pagar", "Interest to pay")].map((v) => ({ v, s: S.flowHead })),
        ...ch.order.map((id, i) => {
          const d = plan.debts.find((x) => x.id === id)!;
          return [{ v: i + 1, s: S.altNum }, { v: d.name, s: S.line }, { v: d.aprBps / 100, s: S.altNum }, { v: d.left / 100, s: S.lineNum }, { v: monthAhead(ch.finish[id] ?? ch.months), s: S.line }, { v: (ch.interestOf[id] ?? 0) / 100, s: S.lineNum }];
        }),
      ],
    });
  }
  if (pick.advice) {
    const cards = buildAdvice(ledger, key, lang, names);
    const rows: Cell[][] = [];
    const merges: string[] = [];
    const pushSpan = (text: string, style: number) => {
      const r = rows.length + 1;
      rows.push([{ v: text, s: style }]);
      merges.push(`A${r}:F${r}`);
    };
    pushSpan(say(lang, "Asesor", "Advisor"), S.section);
    pushSpan(say(lang, "Una lectura para este mes. Cada nota dice qué mirar y por qué importa.", "A reading for this month. Each note says what to look at and why it matters."), S.noteBox);
    rows.push([]);
    for (const card of cards) {
      const horizon = card.horizon === "short" ? say(lang, "Esta semana", "This week") : card.horizon === "medium" ? say(lang, "Este trimestre", "This quarter") : say(lang, "Este año", "This year");
      pushSpan(horizon, card.horizon === "long" ? S.inBanner : card.horizon === "medium" ? S.ratio : S.varBanner);
      pushSpan(card.title, S.cat);
      for (const part of wrap(card.lead, 92)) pushSpan(part, S.bold);
      for (const part of wrap(card.body, 92)) pushSpan(part, S.line);
      if (card.evidence) for (const part of wrap(card.evidence, 92)) pushSpan(part, S.note);
      for (const point of card.points) pushSpan(`${point.label}: ${point.value}${point.note ? ` — ${point.note}` : ""}`, S.altNum);
      rows.push([]);
    }
    if (!cards.length) pushSpan(say(lang, "Todavía no hay suficiente movimiento para una lectura.", "There is not enough movement for a reading yet."), S.note);
    sheets.push({ name: "Asesor", rows, merges, widths: [22, 18, 18, 18, 18, 22] });
  }
  if (!sheets.length) sheets.push({ name: "Faro", rows: [["Nada seleccionado"]] });
  return sheets;
}

function clip(value: string, size: number): string {
  return value.length > size ? `${value.slice(0, size - 3)}...` : value;
}

function buildPdfPages(ledger: LedgerState, key: string, lang: Lang, names: Names, pick: ExportPick): string[] {
  const pages: string[][] = [];
  const ink = "0.07 0.09 0.08";
  const muted = "0.33 0.4 0.36";
  const green = "0.11 0.37 0.26";
  const gold = "0.55 0.42 0.16";
  const linec = "0.78 0.82 0.8";

  const drawMonth = (month: string) => {
    pages.push([]);
    let y = 574;
    const ops = () => pages[pages.length - 1];
    const text = (x: number, yy: number, size: number, value: string, color = ink) => {
      ops().push(`${color} rg BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${yy.toFixed(1)} Tm (${pdfText(value)}) Tj ET`);
    };
    const rect = (x: number, yy: number, w: number, h: number, color: string) => {
      ops().push(`${color} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
    };
    const stroke = (x: number, yy: number, w: number, h: number, color: string) => {
      ops().push(`${color} RG 0.8 w ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
    };
    const need = (h: number) => {
      if (y - h >= 28) return;
      pages.push([]);
      y = 574;
      text(28, y, 9, `${say(lang, "Presupuesto mensual", "Monthly budget")}  ·  ${monthLabel(lang, month)}`, muted);
      y -= 16;
    };
    const band = (label: string) => {
      need(22);
      rect(28, y - 4, 736, 16, green);
      text(36, y, 10, label, "1 1 1");
      y -= 22;
    };
    const lines = monthLinesPicked(ledger, month, pick);
    const fixedLines = lines.filter((line) => line.kind === "expense-fixed");
    const variableLines = lines.filter((line) => line.kind === "expense-variable");
    const purchaseLines = lines.filter((line) => line.kind === "purchase");
    const subLines = lines.filter((line) => line.kind === "subscription");
    const incomeFixed = lines.filter((line) => line.kind === "income-fixed");
    const incomeVariable = lines.filter((line) => line.kind === "income-variable");
    const income = sumItems([...incomeFixed, ...incomeVariable], ledger);
    const fixed = sumItems(fixedLines, ledger);
    const variable = sumItems([...variableLines, ...purchaseLines, ...subLines], ledger);
    const expense = Math.round((fixed + variable) * 100) / 100;
    const left = Math.round((income - expense) * 100) / 100;
    const ratio = income > 0 ? Math.round((expense / income) * 1000) / 10 : 0;
    const debt = sumItems(lines.filter((line) => roleOf(ledger.structure, line.categoryId) === "debt"), ledger);
    const greenPct = ledger.settings.debtGreenPct;
    const yellowPct = ledger.settings.debtYellowPct;
    const allowance = Math.round(((income * greenPct) / 100) * 100) / 100;
    const shown = (major: number) => money(Math.round(major * 100), ledger, lang);
    const sage = "0.84 0.94 0.89";
    const cream = "0.98 0.93 0.82";
    const slate = "0.89 0.93 0.95";
    const rose = "0.96 0.88 0.86";

    rect(28, y - 8, 470, 28, "0.97 0.98 0.97");
    stroke(28, y - 8, 470, 28, linec);
    text(40, y, 16, say(lang, "Presupuesto mensual", "Monthly budget"));
    rect(510, y - 8, 254, 28, "0.91 0.76 0.48");
    stroke(510, y - 8, 254, 28, gold);
    text(524, y, 11, `${say(lang, "Mes", "Month")}    ${monthLabel(lang, month)}`, ink);
    y -= 40;
    band(say(lang, "INGRESOS", "INCOME"));
    rect(28, y - 5, 370, 16, sage);
    stroke(28, y - 5, 370, 16, green);
    text(36, y, 8, say(lang, "Ingresos fijos: dinero que obtienes cada mes", "Fixed income: money you receive every month"), green);
    rect(420, y - 5, 344, 16, cream);
    stroke(420, y - 5, 344, 16, gold);
    text(428, y, 8, say(lang, "Ingresos variables: dinero que obtienes de vez en cuando", "Variable income: money you receive now and then"), gold);
    y -= 20;
    const count = Math.max(incomeFixed.length, incomeVariable.length, 1);
    const incomeTop = y + 6;
    for (let i = 0; i < count; i += 1) {
      need(12);
      const a = incomeFixed[i];
      const b = incomeVariable[i];
      text(28, y, 9, a ? clip(a.concept || say(lang, "Ingreso fijo", "Fixed income"), 36) : "—");
      if (a) text(250, y, 9, shown(majorOf(a, ledger)));
      text(420, y, 9, b ? clip(b.concept || say(lang, "Ingreso variable", "Variable income"), 36) : "—");
      if (b) text(640, y, 9, shown(majorOf(b, ledger)));
      y -= 12;
    }
    stroke(28, y, 370, incomeTop - y, linec);
    stroke(420, y, 344, incomeTop - y, linec);
    y -= 8;
    text(28, y, 10, `${say(lang, "Total de ingresos", "Total income")}    ${shown(income)}`, green);
    y -= 18;
    band(say(lang, "GASTOS", "EXPENSES"));
    text(28, y, 8, say(lang, "Gastos fijos: los que haces necesariamente cada mes", "Fixed costs: what you necessarily spend each month"), muted);
    y -= 14;
    const paint = (blocks: Block[]) => {
      const cols = stackBlocks(blocks);
      const n = Math.max(cols[0].length, cols[1].length, cols[2].length);
      const xs = [28, 284, 540];
      if (!n) {
        text(28, y, 9, "—", muted);
        y -= 12;
        return;
      }
      for (let i = 0; i < n; i += 1) {
        need(12);
        for (let c = 0; c < 3; c += 1) {
          const slot = cols[c][i];
          if (!slot || slot.kind === "blank") continue;
          if (slot.kind === "head") text(xs[c], y, 9, clip(slot.name, 30), green);
          else {
            text(xs[c], y, 8, clip(slot.name, 24));
            text(xs[c] + 150, y, 8, shown(slot.amount ?? 0));
          }
        }
        y -= 12;
      }
    };
    paint(categoryBlocks(ledger, names, lines, "fixed", "expense-fixed", lang));
    y -= 2;
    text(28, y, 10, `${say(lang, "Total gastos fijos", "Total fixed expenses")}    ${shown(fixed)}`, gold);
    y -= 16;
    text(28, y, 8, say(lang, "Gastos variables: los que haces de vez en cuando durante el mes", "Variable costs: what you spend now and then during the month"), muted);
    y -= 14;
    paint([
      ...categoryBlocks(ledger, names, lines, "variable", "expense-variable", lang),
      ...namedBlocks(purchaseLines, ledger, (line) => names.purchase(line.categoryId), say(lang, "Compras", "Shopping")),
      ...namedBlocks(subLines, ledger, (line) => names.catalog(line.providerId), say(lang, "Cuotas", "Subscriptions")),
    ]);
    y -= 2;
    text(28, y, 10, `${say(lang, "Total gastos variables", "Total variable expenses")}    ${shown(variable)}`, gold);
    y -= 14;
    text(28, y, 10, `${say(lang, "Total de gastos", "Total expenses")}    ${shown(expense)}`, ink);
    y -= 18;
    need(36);
    const boxes: [string, string, string][] = [
      [say(lang, "Tengo", "I have"), shown(income), sage],
      [say(lang, "Gastaré", "I will spend"), shown(expense), cream],
      [say(lang, "Gastas un", "You spend"), `${ratio}%`, slate],
      [say(lang, "Oportunidad de mejora", "Room to improve"), shown(left), left < 0 ? rose : sage],
    ];
    boxes.forEach((box, i) => {
      const x = 28 + i * 188;
      rect(x, y - 22, 180, 34, box[2]);
      stroke(x, y - 22, 180, 34, linec);
      text(x + 10, y + 4, 7, box[0], muted);
      text(x + 10, y - 12, 11, box[1], i === 3 && left < 0 ? "0.55 0.23 0.2" : ink);
    });
    y -= 42;
    need(28);
    rect(28, y - 8, 370, 22, cream);
    stroke(28, y - 8, 370, 22, gold);
    text(36, y, 9, `${say(lang, "Dinero para deudas", "Money for debt")}    ${shown(allowance)}`, gold);
    const debtHot = debtTone(income > 0 ? (debt / income) * 100 : null, greenPct, yellowPct) === S.bad;
    rect(420, y - 8, 344, 22, debtHot ? rose : sage);
    stroke(420, y - 8, 344, 22, debtHot ? "0.55 0.23 0.2" : green);
    text(428, y, 9, `${say(lang, "Total de deudas", "Total debt")}    ${shown(debt)}`, debtHot ? "0.55 0.23 0.2" : green);
    y -= 28;
    const note = say(
      lang,
      `Tus deudas no deben superar ese cupo (${greenPct}% de tus ingresos). Verde: por debajo. Amarillo: entre ${greenPct}% y ${yellowPct}%. Rojo: por encima del ${yellowPct}%.`,
      `Debt should stay inside that allowance (${greenPct}% of income). Green: under it. Yellow: between ${greenPct}% and ${yellowPct}%. Red: above ${yellowPct}%.`,
    );
    for (const part of wrap(note, 108)) {
      need(12);
      text(28, y, 8, part, muted);
      y -= 11;
    }
  };

  for (const month of budgetMonths(ledger, key, pick.scope)) drawMonth(month);

  const openStudy = (title: string) => {
    pages.push([]);
    const state = { y: 568 };
    const ops = () => pages[pages.length - 1];
    const text = (x: number, yy: number, size: number, value: string, color = ink) => {
      ops().push(`${color} rg BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${yy.toFixed(1)} Tm (${pdfText(value)}) Tj ET`);
    };
    const rect = (x: number, yy: number, w: number, h: number, color: string) => {
      ops().push(`${color} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
    };
    const stroke = (x: number, yy: number, w: number, h: number, color: string) => {
      ops().push(`${color} RG 0.7 w ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
    };
    const need = (h: number) => {
      if (state.y - h >= 36) return;
      pages.push([]);
      state.y = 568;
      rect(28, state.y - 4, 736, 18, green);
      text(40, state.y, 10, title, "1 1 1");
      state.y -= 28;
    };
    rect(28, state.y - 6, 736, 24, green);
    text(40, state.y, 13, title, "1 1 1");
    state.y -= 36;
    return {
      text,
      rect,
      stroke,
      need,
      get y() { return state.y; },
      set y(value: number) { state.y = value; },
    };
  };

  if (pick.charts) {
    const page = openStudy(say(lang, "Estudio", "Study"));
    page.text(28, page.y, 12, say(lang, "Cómo se mueve el dinero", "How the money moves"), ink);
    page.y -= 14;
    page.text(28, page.y, 9, say(lang, "La barra verde es lo que entra. La barra dorada es lo que sale. Si la dorada se acerca a la verde, el mes se aprieta.", "The green bar is what comes in. The gold bar is what goes out. When gold reaches green, the month gets tight."), muted);
    page.y -= 18;
    const year = Number(key.slice(0, 4)) || new Date().getFullYear();
    const points = pick.scope === "all"
      ? Object.keys(ledger.months).sort().map((month) => {
          const found = yearPoints(ledger, Number(month.slice(0, 4)) || year, lang).find((point) => point.key === month);
          return found ?? { key: month, label: month, income: 0, expense: 0 };
        })
      : yearPoints(ledger, year, lang);
    const max = Math.max(...points.flatMap((point) => [point.income, point.expense]), 1);
    for (const point of points) {
      page.need(30);
      page.text(28, page.y, 8, point.label, muted);
      const inW = Math.max(2, Math.round((point.income / max) * 430));
      const outW = Math.max(2, Math.round((point.expense / max) * 430));
      page.rect(118, page.y - 1, inW, 6, green);
      page.text(124 + inW, page.y, 7, point.income.toFixed(0), green);
      page.y -= 11;
      page.rect(118, page.y - 1, outW, 6, "0.78 0.62 0.32");
      page.text(124 + outW, page.y, 7, point.expense.toFixed(0), gold);
      page.y -= 16;
    }
    page.y -= 6;
    page.need(24);
    page.text(28, page.y, 12, say(lang, "A dónde se va", "Where it goes"), ink);
    page.y -= 16;
    const slices = categorySlices(ledger, key, names).slice(0, 8);
    const sliceMax = Math.max(...slices.map((slice) => slice.minor), 1);
    const sliceSum = slices.reduce((sum, slice) => sum + slice.minor, 0);
    const palette = [green, "0.55 0.42 0.16", "0.32 0.46 0.58", "0.45 0.36 0.28", "0.28 0.45 0.4", "0.62 0.4 0.32"];
    slices.forEach((slice, i) => {
      page.need(18);
      const tone = palette[i % palette.length];
      const width = Math.max(2, Math.round((slice.minor / sliceMax) * 360));
      const part = sliceSum > 0 ? Math.round((slice.minor / sliceSum) * 1000) / 10 : 0;
      page.rect(28, page.y - 2, 8, 8, tone);
      page.text(42, page.y, 9, clip(slice.name, 22));
      page.rect(190, page.y - 2, width, 7, tone);
      page.text(198 + width, page.y, 8, `${(slice.minor / 100).toFixed(0)}   ${part}%`, muted);
      page.y -= 16;
    });
  }

  if (pick.advice) {
    const page = openStudy(say(lang, "Asesor", "Advisor"));
    page.text(28, page.y, 9, say(lang, "Notas para leer con calma. Cada una dice qué está pasando y qué conviene mirar después.", "Notes to read slowly. Each one says what is happening and what is worth looking at next."), muted);
    page.y -= 18;
    const cards = buildAdvice(ledger, key, lang, names);
    if (!cards.length) page.text(28, page.y, 10, say(lang, "Todavía no hay suficiente movimiento para una lectura.", "There is not enough movement for a reading yet."), muted);
    for (const card of cards) {
      const horizon = card.horizon === "short" ? say(lang, "Esta semana", "This week") : card.horizon === "medium" ? say(lang, "Este trimestre", "This quarter") : say(lang, "Este año", "This year");
      const tone = card.horizon === "long" ? green : card.horizon === "medium" ? "0.32 0.46 0.58" : gold;
      const bits = [
        ...wrap(card.lead, 92).map((part) => ({ part, size: 10, color: ink })),
        ...wrap(card.body, 96).map((part) => ({ part, size: 9, color: muted })),
        ...(card.evidence ? wrap(card.evidence, 96).map((part) => ({ part, size: 8, color: "0.42 0.36 0.24" })) : []),
        ...card.points.map((point) => ({ part: `${point.label}:  ${point.value}${point.note ? `  —  ${point.note}` : ""}`, size: 8, color: ink })),
      ];
      const extra = card.meter ? 16 : 0;
      const height = 42 + bits.length * 13 + extra;
      page.need(Math.min(height, 240));
      const top = page.y + 10;
      const bottom = page.y - height + 16;
      page.rect(28, bottom, 736, top - bottom, "0.97 0.98 0.97");
      page.rect(28, bottom, 5, top - bottom, tone);
      page.stroke(28, bottom, 736, top - bottom, linec);
      page.text(44, page.y, 8, horizon, tone);
      page.y -= 14;
      page.text(44, page.y, 12, clip(card.title, 72));
      page.y -= 16;
      for (const bit of bits) {
        page.need(14);
        page.text(44, page.y, bit.size, bit.part, bit.color);
        page.y -= 13;
      }
      if (card.meter) {
        const pct = Math.max(0, Math.min(100, card.meter.pct));
        page.rect(44, page.y - 2, 180, 6, "0.88 0.91 0.89");
        page.rect(44, page.y - 2, Math.max(2, pct * 1.8), 6, tone);
        page.text(234, page.y, 8, clip(card.meter.caption, 48), muted);
        page.y -= 16;
      }
      page.y -= 12;
    }
  }
  return pages.map((ops) => ops.join("\n"));
}

function save(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportWorkbook(ledger: LedgerState, key: string, lang: Lang, names: Names, pick: ExportPick) {
  const stamp = key || new Date().toISOString().slice(0, 10);
  save(`Faro_${sampleOn() ? "Ejemplo_" : ""}${stamp}.xlsx`, xlsx(buildSheets(ledger, key, lang, names, pick)));
}

export function exportPdf(ledger: LedgerState, key: string, lang: Lang, names: Names, pick: ExportPick) {
  const stamp = key || new Date().toISOString().slice(0, 10);
  const pages = buildPdfPages(ledger, key, lang, names, pick);
  save(`Faro_${sampleOn() ? "Ejemplo_" : ""}${stamp}.pdf`, pdfBlob(pages.length ? pages : ["BT /F1 12 Tf 40 740 Td (Faro) Tj ET"], true));
}

export const EXPORT_KINDS = KINDS;
