/**
 * La bandeja de enlaces y textos compartidos (mapa §18 — 1.3.362): la PWA
 * guarda lo compartido bajo su llave del service worker (sw.js takeShare)
 * y esta pieza lo recoge cuando hay un libro abierto: un enlace abre la
 * hoja del producto con sus puertas; un texto sin enlace es un recibo
 * digital y se lee SIN OCR, con su texto exacto, por la puerta de
 * recibos de siempre. La misma puerta de recibo sirve a la bandeja de
 * documentos de Android (doc-inbox.tsx). Nada se consume si el modo no
 * alcanza el asiento de la puerta: la compartición espera, sin perderse.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ReceiptText, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "./provider";
import { ProductSheet } from "./share-product";
import { ReviewTable } from "./review-table";
import { openImport } from "./bank-dock";
import { productFromShare, urlFromText, type SharedProduct } from "@/lib/faro/sharelink";
import { parseScan } from "@/lib/faro/receiptparse";
import { scanToDraft, type ScanCardLike } from "@/lib/faro/scanadapter";
import { addDrafts } from "@/lib/faro/drafts";
import { uid } from "@/lib/faro/money";
import { todayIso } from "@/lib/faro/loans";
import type { Draft } from "@/lib/faro/types";
import "./share-inbox.css";

const SHARE_CACHE = "share-inbox";
const LINK_KEY = "./share-link-inbox";

type LinkShare = { title: string; text: string; at: string };

/** El recibo digital: el texto exacto se parsea como un escaneo, sin
 * pasar por OCR, y cae en la bandeja con la fuente honesta «share». Si
 * el texto no lee como recibo, la puerta del estado de cuenta queda
 * ofrecida — nada se pierde. */
export function TextReceiptPop({ text, onClose }: { text: string; onClose: () => void }) {
  const { lang, has, commit, session } = useFaro();
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const [landed, setLanded] = useState<number | null>(null);
  const [review, setReview] = useState(false);
  useLayer(true, onClose);
  const ledger = session?.ledger;

  function land() {
    if (!ledger) return;
    const drafts: Draft[] = parseScan(text, todayIso()).map((d) => {
      const card: ScanCardLike = {
        id: uid(), book: d.type === "subscription" ? "subscription" : d.book,
        concept: d.concept, amount: d.amountMinor == null ? "" : (d.amountMinor / 100).toFixed(2),
        currency: d.currency, date: d.date || todayIso(), cadence: d.cadence, note: d.note,
        brand: d.brand, crop: "", useCrop: false, generic: d.generic,
        category: d.category, sub: d.sub, unsure: [...d.unsure], dup: false,
      };
      return { ...scanToDraft(d, card, ledger), source: "share" as const };
    });
    if (drafts.length && has("capture.tray")) {
      commit((s) => addDrafts(s, drafts), L("Recibo digital", "Digital receipt"));
    }
    setLanded(drafts.length);
  }

  function asStatement() {
    openImport([new File([text], "compartido.txt", { type: "text/plain" })]);
    onClose();
  }

  if (review) return <ReviewTable onClose={onClose} />;
  return createPortal(
    <div className="scn-pop-scrim shr-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}>
      <div className="scn-pop shr-pop" role="dialog" aria-label={L("Recibo digital", "Digital receipt")}>
        <div className="shr-head">
          <ReceiptText aria-hidden />
          <strong>{L("Recibo digital", "Digital receipt")}</strong>
          <button type="button" className="shr-x" aria-label={L("Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        {landed == null ? (
          <>
            <p className="shr-sub">{L("Este texto llegó compartido. Lo leo tal cual, sin foto: si es un recibo, cae en tu bandeja para revisarlo en la mesa.", "This text arrived shared. I read it as-is, no photo: if it is a receipt, it lands in your tray to review at the table.")}</p>
            <button type="button" className="scn-opt" data-opt="receipt" onClick={land}>
              <ReceiptText aria-hidden /><span>{L("Leerlo como recibo", "Read it as a receipt")}</span>
            </button>
            {has("inbox.bank") ? (
              <button type="button" className="scn-opt" data-opt="statement" onClick={asStatement}>
                <ReceiptText aria-hidden /><span>{L("Es un estado de cuenta", "It is a bank statement")}</span>
              </button>
            ) : null}
          </>
        ) : landed > 0 ? (
          <>
            <p className="shr-sub">{L(`${landed} en tu bandeja. Revísalos en la mesa de siempre.`, `${landed} in your tray. Review them at the usual table.`)}</p>
            <button type="button" className="scn-opt" data-opt="review" onClick={() => setReview(true)}>
              <ReceiptText aria-hidden /><span>{L("Revisar ahora", "Review now")}</span>
            </button>
            <button type="button" className="scn-opt" data-opt="later" onClick={onClose}>
              <X aria-hidden /><span>{L("Luego", "Later")}</span>
            </button>
          </>
        ) : (
          <>
            <p className="shr-sub">{L("No leí un recibo en este texto.", "I could not read a receipt in this text.")}</p>
            {has("inbox.bank") ? (
              <button type="button" className="scn-opt" data-opt="statement" onClick={asStatement}>
                <ReceiptText aria-hidden /><span>{L("Tratarlo como estado de cuenta", "Treat it as a bank statement")}</span>
              </button>
            ) : null}
            <button type="button" className="scn-opt" data-opt="later" onClick={onClose}>
              <X aria-hidden /><span>{L("Cerrar", "Close")}</span>
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function LinkInbox() {
  const { session, has } = useFaro();
  const [product, setProduct] = useState<SharedProduct | null>(null);
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const ready = !!session;

  useEffect(() => {
    if (!ready) return;
    let live = true;
    (async () => {
      try {
        if (!("caches" in window)) return;
        const cache = await caches.open(SHARE_CACHE);
        const hit = await cache.match(LINK_KEY);
        if (!hit) return;
        const list = (await hit.json().catch(() => [])) as LinkShare[];
        if (!live || !Array.isArray(list) || !list.length) return;
        const first = list[0];
        const prod = productFromShare(first.title || "", first.text || "");
        // La puerta manda antes de consumir: sin su asiento, la
        // compartición se queda guardada para cuando el modo la alcance.
        if (prod && !has("inbox.link")) return;
        if (!prod && !has("inbox.image-receipt")) return;
        const rest = list.slice(1);
        if (rest.length) await cache.put(LINK_KEY, new Response(JSON.stringify(rest), { headers: { "content-type": "application/json" } }));
        else await cache.delete(LINK_KEY);
        if (!live) return;
        if (prod) setProduct(prod);
        else setReceiptText(first.text || first.title || "");
      } catch { /* sin bandeja: nada que recoger */ }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (product) return <ProductSheet product={product} onClose={() => setProduct(null)} />;
  if (receiptText != null) return <TextReceiptPop text={receiptText} onClose={() => setReceiptText(null)} />;
  return null;
}

/** ¿Este texto de la bandeja de documentos es una compartición con
 * puertas (enlace o recibo) y no un estado de cuenta? Lo dice su
 * contenido: trae una URL, o su nombre es el de la cáscara para el texto
 * compartido. */
export function isDoorText(name: string, type: string, text: string): boolean {
  if (/compartido\.txt$/i.test(name || "")) return true;
  return (type || "").trim().toLowerCase() === "text/plain" && !!urlFromText(text) && text.length < 4000;
}
