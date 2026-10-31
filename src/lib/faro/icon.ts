// Shrinks an uploaded icon to the smallest image that still looks clean at icon size,
// so it costs almost nothing in the synced ledger. 64 px covers a 22 px icon on 3x screens.
const SIZE = 64;
const BUDGET = 2400; // data-URL characters (~1.7 KB of image)

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}

export async function shrinkIcon(file: File): Promise<string> {
  const img = await decode(file);
  const iw = img.width, ih = img.height;
  const r = iw / ih;
  // Nearly square photos fill the tile; wide or tall logos keep their whole shape inside it.
  const cover = r > 0.8 && r < 1.25;
  const sx = cover ? (iw - Math.min(iw, ih)) / 2 : 0;
  const sy = cover ? (ih - Math.min(iw, ih)) / 2 : 0;
  const sw = cover ? Math.min(iw, ih) : iw;
  const sh = cover ? Math.min(iw, ih) : ih;
  // Halve in steps: one big jump down aliases thin lines and text.
  let src: CanvasImageSource = img;
  let w = sw, h = sh, ox = sx, oy = sy;
  while (Math.max(w, h) > SIZE * 2) {
    const step = canvas(w / 2, h / 2);
    step.ctx.drawImage(src, ox, oy, w, h, 0, 0, step.c.width, step.c.height);
    src = step.c; w = step.c.width; h = step.c.height; ox = 0; oy = 0;
  }
  const out = canvas(SIZE, SIZE);
  const k = SIZE / Math.max(w, h);
  const dw = w * k, dh = h * k;
  out.ctx.drawImage(src, ox, oy, w, h, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
  // Does the icon use transparency? Then it must stay in a format that keeps it.
  const px = out.ctx.getImageData(0, 0, SIZE, SIZE).data;
  let alpha = false;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { alpha = true; break; }
  const webp = out.c.toDataURL("image/webp", 0.8).startsWith("data:image/webp");
  const type = webp ? "image/webp" : alpha ? "image/png" : "image/jpeg";
  if (type === "image/png") return out.c.toDataURL(type);
  let best = "";
  for (const q of [0.82, 0.74, 0.66, 0.58, 0.5]) {
    best = out.c.toDataURL(type, q);
    if (best.length <= BUDGET) break;
  }
  return best;
}
