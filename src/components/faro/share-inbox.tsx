/**
 * Faro for Android (1.3.111, Phase 2): screenshots or photos shared to Faro from another app (a bank app, the gallery)
 * wait in the app; once Faro is open and unlocked this asks what they are and opens the existing preview: the card
 * screenshot reader (Tarjetas) or the receipt scan (Foto o captura). Nothing is saved until he confirms in that preview.
 * Loaded lazily and only inside the Android app (shell.tsx), so the browser and the PWA never download it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CreditCard, Images, ReceiptText, X } from "lucide-react";
import { native } from "@/spa/native";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "./provider";
import { CardScan } from "./cards";
import { ScanSheet } from "./receipt-scan";
import "./scan.css";
import "./share-inbox.css";

const CH = 512 * 1024;

function pull(): File[] {
  const n = native();
  if (!n?.sharedCount || !n.sharedInfo || !n.sharedChunk) return [];
  const out: File[] = [];
  const count = Math.min(12, Number(n.sharedCount()) || 0);
  for (let i = 0; i < count; i++) {
    let info: { name?: string; type?: string } = {};
    try { info = JSON.parse(n.sharedInfo(i) || "{}"); } catch { /* keep defaults */ }
    const parts: Uint8Array[] = [];
    let off = 0;
    for (;;) {
      const b = n.sharedChunk(i, off, CH);
      if (!b) break;
      const bin = atob(b);
      const u = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
      parts.push(u);
      off += u.length;
      if (u.length < CH) break;
    }
    if (off > 0) out.push(new File(parts as BlobPart[], info.name || `captura-${i + 1}.jpg`, { type: info.type || "image/jpeg" }));
  }
  try { n.sharedClear?.(); } catch { /* ignore */ }
  return out;
}

function Ask({ count, onCards, onReceipt, onClose }: { count: number; onCards: () => void; onReceipt: () => void; onClose: () => void }) {
  const { lang } = useFaro();
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const first = useRef<HTMLButtonElement>(null);
  useLayer(true, onClose);
  useEffect(() => { first.current?.focus({ preventScroll: true }); }, []);
  const what = count === 1 ? L("1 imagen recibida", "1 picture received") : L(`${count} imágenes recibidas`, `${count} pictures received`);
  return (
    <div className="scn-pop-scrim shr-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}>
      <div className="scn-pop shr-pop" role="dialog" aria-label={what}>
        <div className="shr-head">
          <Images aria-hidden />
          <strong>{what}</strong>
          <button type="button" className="shr-x" aria-label={L("Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <p className="shr-sub">{L("¿Qué son? Revisas todo antes de guardar.", "What are they? You review everything before saving.")}</p>
        <button ref={first} type="button" className="scn-opt" data-opt="cards" onClick={onCards}>
          <CreditCard aria-hidden /><span>{L("Tarjeta de crédito", "Credit card")}</span>
        </button>
        <button type="button" className="scn-opt" data-opt="receipt" onClick={onReceipt}>
          <ReceiptText aria-hidden /><span>{L("Recibo o gasto", "Receipt or expense")}</span>
        </button>
      </div>
    </div>
  );
}

export default function ShareInbox() {
  const [files, setFiles] = useState<File[] | null>(null);
  const [mode, setMode] = useState<"ask" | "cards" | "receipt">("ask");
  useEffect(() => {
    const take = () => {
      const f = pull();
      if (f.length) { setFiles(f); setMode("ask"); }
    };
    take();
    window.addEventListener("faronative-share", take);
    return () => window.removeEventListener("faronative-share", take);
  }, []);
  if (!files) return null;
  const close = () => { setFiles(null); setMode("ask"); };
  if (mode === "cards") return <CardScan files={files} onClose={close} />;
  if (mode === "receipt") return createPortal(<ScanSheet files={files} from="purchase" onClose={close} />, document.body);
  return createPortal(<Ask count={files.length} onCards={() => setMode("cards")} onReceipt={() => setMode("receipt")} onClose={close} />, document.body);
}
