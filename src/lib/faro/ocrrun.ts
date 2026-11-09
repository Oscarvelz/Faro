/**
 * On-device OCR for a retirement statement photo (nothing is uploaded). Loaded only when "Leer estado" is used:
 * tesseract.js, its worker, the WASM core and the eng+spa "fast" data live in ./ocr/ next to the app, out of the bundle and
 * out of precache.json; the service worker keeps them in their own cache after the first use.
 */
type Progress = (stage: "load" | "read", ratio: number) => void;

/** 1.3.163 (audit P5): the OCR watchdog bound. A healthy read of one picture takes seconds; a
 *  wedged tesseract worker used to spin forever with no way out. After this long, the worker is
 *  terminated and the read FAILS LOUDLY (the caller's catch marks the picture as not read)
 *  instead of hanging the sheet. 90 seconds, per worker boot and per picture. */
export const OCR_TIMEOUT_MS = 90_000;

export function withOcrTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try { onTimeout(); } catch { /* the kill is best-effort; the failure is the point */ }
      reject(new Error("ocr-timeout"));
    }, ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** ~1600px long side, greyscale, as a PNG blob: fast to read and good enough for printed statements. */
export async function shrink(file: Blob, longSide = 1600): Promise<{ blob: Blob; thumb: string }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, longSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  g.putImageData(img, 0, 0);
  const blob = await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("canvas"))), "image/png"));
  // A small thumbnail for the review sheet (kept only in memory while it is open).
  const t = document.createElement("canvas");
  const tk = 160 / Math.max(w, h);
  t.width = Math.round(w * tk); t.height = Math.round(h * tk);
  t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height);
  return { blob, thumb: t.toDataURL("image/jpeg", 0.7) };
}

export async function readImage(file: Blob, onProgress: Progress): Promise<{ text: string; thumb: string }> {
  const base = new URL("./ocr/", import.meta.url).href;
  onProgress("load", 0);
  const { blob, thumb } = await shrink(file);
  const T = (await import(/* @vite-ignore */ `${base}tesseract.esm.min.js`)) as { default?: unknown; createWorker?: unknown };
  const createWorker = ((T.default as { createWorker?: unknown } | undefined)?.createWorker ?? T.createWorker) as (
    langs: string[], oem: number, opts: Record<string, unknown>,
  ) => Promise<{ recognize: (img: Blob) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> }>;
  type W = Awaited<ReturnType<typeof createWorker>>;
  let worker: W | null = null;
  const kill = () => { const w = worker; worker = null; if (w) void w.terminate().catch(() => {}); };
  try {
    worker = await withOcrTimeout(createWorker(["eng", "spa"], 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      gzip: true,
      workerBlobURL: false,
      cacheMethod: "none",
      logger: (m: { status?: string; progress?: number }) => {
        const p = typeof m.progress === "number" ? m.progress : 0;
        onProgress(m.status === "recognizing text" ? "read" : "load", p);
      },
    }), OCR_TIMEOUT_MS, kill);
    const { data } = await withOcrTimeout(worker.recognize(blob), OCR_TIMEOUT_MS, kill);
    return { text: data.text || "", thumb };
  } finally {
    kill();
  }
}
