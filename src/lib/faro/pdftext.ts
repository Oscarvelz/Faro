/**
 * Reads the text layer of a statement PDF on the device (nothing is uploaded). Loaded only when a PDF is chosen:
 * this module, pdf.js (legacy build, for older phones) and its worker are their own files, kept out of the app's first load
 * and out of the offline precache; the service worker keeps them after the first use.
 */
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { PdfDoc } from "./pdfstmt";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const isPdf = (head: Uint8Array) => head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // "%PDF"

/** Words with their position on each page. A page with no words is a scanned image (no OCR here). */
export async function readPdf(data: ArrayBuffer): Promise<PdfDoc> {
  const task = pdfjs.getDocument({ data: new Uint8Array(data), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  const pages: PdfDoc["pages"] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const words: PdfDoc["pages"][number] = [];
      for (const it of tc.items) {
        if (!("str" in it) || !it.str) continue;
        words.push({ s: it.str, x: Math.round(it.transform[4] * 10) / 10, y: Math.round(it.transform[5] * 10) / 10 });
      }
      pages.push(words);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return { pages };
}
