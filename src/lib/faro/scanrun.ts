/**
 * Escanear (1.3.101): reads receipt photos and subscription screenshots on the device. Nothing is uploaded or kept.
 * Reuses the Retiro OCR stack (tesseract.js 7 + eng/spa "fast" data in ./ocr/, lazy, cached by the SW after first use).
 * One worker serves the whole batch (loaded once), images go one at a time, and stop() ends it at once.
 * Gives the parser lines with their boxes, and crops a small thumbnail per draft and the app-icon tile beside a block.
 */
import type { OcrBox, OcrLine } from "./receiptparse";
import { shrinkIcon } from "./icon";
import { OCR_TIMEOUT_MS, withOcrTimeout } from "./ocrrun";

export type ScanStage = "load" | "read";
export type ScanImage = { lines: OcrLine[]; text: string; w: number; h: number; dark: boolean; canvas: HTMLCanvasElement; ms: number };
type Worker = { recognize: (img: Blob, o?: unknown, out?: unknown) => Promise<{ data: ScanData }>; terminate: () => Promise<unknown> };
type Bbox = { x0: number; y0: number; x1: number; y1: number };
type ScanData = { text: string; blocks?: { paragraphs: { lines: { text: string; bbox: Bbox; words: { text: string; bbox: Bbox }[] }[] }[] }[] | null };

/** Colour copy of the picture, at most 1280 px wide / 2800 px tall (tall phone screenshots keep their text size). */
async function draw(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const k = Math.min(1, 1280 / bmp.width, 2800 / bmp.height);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

/** Greyscale for the reader; a dark-mode screenshot is inverted (black text on white reads best). */
async function forOcr(c: HTMLCanvasElement): Promise<{ blob: Blob; dark: boolean }> {
  const o = document.createElement("canvas");
  o.width = c.width; o.height = c.height;
  const g = o.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(c, 0, 0);
  const img = g.getImageData(0, 0, o.width, o.height);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    d[i] = d[i + 1] = d[i + 2] = y;
    sum += y;
  }
  const dark = sum / (d.length / 4) < 110;
  if (dark) for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
  g.putImageData(img, 0, 0);
  const blob = await new Promise<Blob>((ok, no) => o.toBlob((b) => (b ? ok(b) : no(new Error("canvas"))), "image/png"));
  return { blob, dark };
}

/** Lines from words; a lone 1–2 letter "word" far right of the text (an app icon read as "A") is dropped. */
function linesOf(data: ScanData, w: number): OcrLine[] {
  const out: OcrLine[] = [];
  for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) {
    const words = (l.words ?? []).filter((x) => x.text.trim());
    const keep = words.filter((x, i) => {
      if (i === 0) return true;
      const gap = x.bbox.x0 - words[i - 1].bbox.x1;
      return !(x.text.trim().length <= 2 && x.bbox.x0 > w * 0.62 && gap > w * 0.12);
    });
    if (!keep.length) continue;
    const text = keep.map((x) => x.text).join(" ").trim();
    const box = { x0: Math.min(...keep.map((x) => x.bbox.x0)), y0: Math.min(...keep.map((x) => x.bbox.y0)), x1: Math.max(...keep.map((x) => x.bbox.x1)), y1: Math.max(...keep.map((x) => x.bbox.y1)) };
    out.push({ text, box });
  }
  if (!out.length && data.text) for (const t of data.text.split(/\r?\n/)) if (t.trim()) out.push({ text: t.trim() });
  return out;
}

export type Scanner = { read: (file: Blob, onProgress: (stage: ScanStage, p: number) => void) => Promise<ScanImage>; stop: () => void };

/** Opens the reader once for a batch. Test hook: window.__faroScanText = ["text of image 1", …] skips the OCR. */
export async function openScanner(): Promise<Scanner> {
  const inject = (window as Window & { __faroScanText?: string[] }).__faroScanText;
  let stopped = false;
  let worker: Worker | null = null;
  let report: (stage: ScanStage, p: number) => void = () => {};
  let n = 0;
  // 1.3.163 (audit P5): the shared OCR watchdog (ocrrun.withOcrTimeout, 90 s). A wedged worker is
  // terminated and forgotten, so the picture fails loudly and the NEXT picture reboots a fresh one.
  const killWorker = () => { const w = worker; worker = null; if (w) void w.terminate().catch(() => {}); };
  const boot = async () => {
    const base = new URL("./ocr/", import.meta.url).href;
    const T = (await import(/* @vite-ignore */ `${base}tesseract.esm.min.js`)) as { default?: unknown; createWorker?: unknown };
    const createWorker = ((T.default as { createWorker?: unknown } | undefined)?.createWorker ?? T.createWorker) as (langs: string[], oem: number, opts: Record<string, unknown>) => Promise<Worker>;
    worker = await withOcrTimeout(createWorker(["eng", "spa"], 1, {
      workerPath: `${base}worker.min.js`, corePath: base, langPath: base, gzip: true, workerBlobURL: false, cacheMethod: "none",
      logger: (m: { status?: string; progress?: number }) => report(m.status === "recognizing text" ? "read" : "load", typeof m.progress === "number" ? m.progress : 0),
    }), OCR_TIMEOUT_MS, killWorker);
    if (stopped) { void worker.terminate().catch(() => {}); throw new Error("stopped"); }
  };
  return {
    async read(file, onProgress) {
      if (stopped) throw new Error("stopped");
      report = onProgress;
      const t0 = performance.now();
      const canvas = await draw(file);
      const i = n++;
      if (inject) {
        onProgress("read", 1);
        const text = inject[i] ?? inject[inject.length - 1] ?? "";
        const lines = text.split(/\r?\n/).filter((x) => x.trim()).map((t) => ({ text: t.trim() }));
        return { lines, text, w: canvas.width, h: canvas.height, dark: false, canvas, ms: 0 };
      }
      if (!worker) { onProgress("load", 0); await boot(); }
      const { blob, dark } = await forOcr(canvas);
      onProgress("read", 0);
      const { data } = await withOcrTimeout(worker!.recognize(blob, {}, { text: true, blocks: true }), OCR_TIMEOUT_MS, killWorker);
      if (stopped) throw new Error("stopped");
      return { lines: linesOf(data, canvas.width), text: data.text || "", w: canvas.width, h: canvas.height, dark, canvas, ms: Math.round(performance.now() - t0) };
    },
    stop() {
      stopped = true;
      if (worker) void worker.terminate().catch(() => {});
      worker = null;
    },
  };
}

/** A small JPEG of the draft's source lines (the whole picture when there are no boxes). Lives in memory only. */
export function cropThumb(c: HTMLCanvasElement, box: OcrBox | null): string {
  const pad = 10;
  const x = box ? Math.max(0, box.x0 - pad) : 0, y = box ? Math.max(0, box.y0 - pad) : 0;
  const w = box ? Math.min(c.width - x, box.x1 - box.x0 + pad * 2) : c.width, h = box ? Math.min(c.height - y, box.y1 - box.y0 + pad * 2) : c.height;
  const k = Math.min(1, 220 / w, 132 / h);
  const t = document.createElement("canvas");
  t.width = Math.max(1, Math.round(w * k)); t.height = Math.max(1, Math.round(h * k));
  const g = t.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(c, x, y, w, h, 0, 0, t.width, t.height);
  return t.toDataURL("image/jpeg", 0.72);
}

/**
 * The app-icon tile beside a subscription block (Google Play draws it at the right edge, level with the name):
 * the background is the region's edge colour; the tile is the box of pixels clearly unlike it. Shrunk to 64 px with
 * rounded corners (transparent) through shrinkIcon, so it costs ~2 KB in the synced ledger. "" when nothing square is there.
 */
export async function cropIcon(c: HTMLCanvasElement, box: OcrBox | null): Promise<string> {
  if (!box) return "";
  const W = c.width;
  const bh = box.y1 - box.y0;
  const rx0 = Math.round(Math.max(box.x1 + W * 0.02, W * 0.5));
  if (rx0 > W - W * 0.06) return "";
  const ry0 = Math.max(0, Math.round(box.y0 - bh * 0.45)), ry1 = Math.min(c.height, Math.round(box.y1 + bh * 0.45));
  const rw = W - rx0, rh = ry1 - ry0;
  if (rw < 8 || rh < 8) return "";
  const d = c.getContext("2d", { willReadFrequently: true })!.getImageData(rx0, ry0, rw, rh).data;
  const px = (x: number, y: number) => { const i = (y * rw + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  // Background: median of the region's border.
  const edge: number[][] = [];
  for (let x = 0; x < rw; x += 3) { edge.push(px(x, 0), px(x, rh - 1)); }
  for (let y = 0; y < rh; y += 3) { edge.push(px(0, y), px(rw - 1, y)); }
  const med = [0, 1, 2].map((k) => edge.map((e) => e[k]).sort((a, b) => a - b)[edge.length >> 1]);
  const far = (p: number[]) => Math.abs(p[0] - med[0]) + Math.abs(p[1] - med[1]) + Math.abs(p[2] - med[2]) > 60;
  // The tile is the longest run of rows that hold enough "unlike" pixels (a 3 px separator line is a short run), then the
  // longest run of columns inside those rows.
  const run = (v: number[], min: number): [number, number] => {
    let best: [number, number] = [-1, -1], at = -1;
    for (let i = 0; i <= v.length; i++) {
      if (i < v.length && v[i] > min) { if (at < 0) at = i; continue; }
      if (at >= 0 && i - at > best[1] - best[0] + 1) best = [at, i - 1];
      at = -1;
    }
    return best;
  };
  const rows = new Array(rh).fill(0);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) if (far(px(x, y))) rows[y]++;
  const [y0, y1] = run(rows, rw * 0.04);
  if (y0 < 0) return "";
  const cols = new Array(rw).fill(0);
  for (let y = y0; y <= y1; y++) for (let x = 0; x < rw; x++) if (far(px(x, y))) cols[x]++;
  const [x0, x1] = run(cols, (y1 - y0 + 1) * 0.08);
  if (x0 < 0 || x1 <= x0 || y1 <= y0) return "";
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w / h < 0.6 || w / h > 1.6 || Math.max(w, h) < W * 0.05 || Math.max(w, h) > W * 0.35) return "";
  const side = Math.max(w, h);
  const sx = Math.max(0, Math.round(x0 + w / 2 - side / 2)), sy = Math.max(0, Math.round(y0 + h / 2 - side / 2));
  const t = document.createElement("canvas");
  t.width = t.height = 128;
  const g = t.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.beginPath();
  (g as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect?.(0, 0, 128, 128, 28);
  g.clip();
  g.drawImage(c, rx0 + sx, ry0 + sy, side, side, 0, 0, 128, 128);
  const blob = await new Promise<Blob | null>((ok) => t.toBlob(ok, "image/png"));
  if (!blob) return "";
  try { return await shrinkIcon(new File([blob], "icon.png", { type: "image/png" })); } catch { return ""; }
}
