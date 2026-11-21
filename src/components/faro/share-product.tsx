/**
 * La hoja del producto compartido (mapa §18, diseño 5c §2c — 1.3.362):
 * un enlace o una captura llegan a Faro y la hoja pregunta a cuál puerta
 * van, con lo leído ya puesto y editable — la espera, el plan, la compra
 * anotada o guardar la tienda. Una sola lectura se reparte; el precio
 * jamás se inventa: si no se leyó, el campo nace vacío con su frase.
 * Con red, la página se lee desde el aparato y lo leído se dice como
 * leído. Sin red, la hoja nace igual con lo que el compartir trajo.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Hourglass, ListChecks, ShoppingBag, Store, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "./provider";
import { addWish } from "@/lib/faro/waitlist";
import { addDrafts } from "@/lib/faro/drafts";
import { createPlan } from "@/lib/faro/plan";
import { parseAmount, uid } from "@/lib/faro/money";
import { todayIso } from "@/lib/faro/loans";
import {
  enrichProduct, productDraft, productPlanRow, readPageMeta, suggestsStore,
  type SharedProduct,
} from "@/lib/faro/sharelink";
import { parseScan } from "@/lib/faro/receiptparse";
import type { Currency } from "@/lib/faro/types";
import "./share-product.css";

/** Lee la página del producto desde el aparato (con su timeout): los
 * metadatos que ella misma publica. Si la tienda no deja leerla (CORS,
 * red), devuelve null y la hoja sigue con lo que el compartir trajo. */
export async function fetchProductMeta(url: string): Promise<ReturnType<typeof readPageMeta> | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    return readPageMeta(html);
  } catch {
    return null;
  }
}

type DoneKind = "wait" | "plan" | "buy" | "store" | null;

export function ProductSheet({ product, imageFile, onClose }: {
  product: SharedProduct;
  imageFile?: File;
  onClose: () => void;
}) {
  const { lang, has, commit, goTopic } = useFaro();
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const [prod, setProd] = useState<SharedProduct>(product);
  const [title, setTitle] = useState(product.title);
  const [store, setStore] = useState(product.store);
  const [price, setPrice] = useState(product.priceMinor != null ? String(product.priceMinor / 100) : "");
  const [currency, setCurrency] = useState<Currency>(product.currency);
  const [readNote, setReadNote] = useState<"share" | "page" | "image" | null>(product.priceFrom);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<DoneKind>(null);
  const ran = useRef(false);
  useLayer(true, onClose);

  // El enriquecimiento corre una vez: la página para el enlace, el OCR
  // para la captura. Lo que ya vino leído no se pisa.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let live = true;
    (async () => {
      if (product.url) {
        const meta = await fetchProductMeta(product.url);
        if (!live || !meta) return;
        setProd((p) => {
          const e = enrichProduct(p, meta);
          if (!p.title && e.title) setTitle(e.title);
          if (p.priceMinor == null && e.priceMinor != null) {
            setPrice(String(e.priceMinor / 100));
            setCurrency(e.currency);
            setReadNote("page");
          }
          return e;
        });
      } else if (imageFile) {
        setBusy(true);
        try {
          const run = await import("@/lib/faro/scanrun");
          const scanner = await run.openScanner();
          const img = await scanner.read(imageFile, () => {});
          scanner.stop();
          if (!live) return;
          const found = parseScan(img.lines, todayIso()).find((d) => d.amountMinor != null);
          if (found && found.amountMinor != null) {
            setPrice(String(found.amountMinor / 100));
            setCurrency(found.currency);
            setReadNote("image");
            setProd((p) => ({ ...p, priceMinor: found.amountMinor, currency: found.currency, priceFrom: "page" }));
          }
        } catch { /* sin lectura: el campo queda vacío con su frase */ }
        if (live) setBusy(false);
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceMinor = parseAmount(price);
  const current: SharedProduct = {
    ...prod,
    title: title.trim(),
    store: store.trim(),
    priceMinor,
    currency,
  };
  const suggested: DoneKind = imageFile ? "wait" : suggestsStore(current) ? "store" : "wait";
  const [imgSrc] = useState(() => product.imageUrl || (imageFile ? URL.createObjectURL(imageFile) : ""));

  const chip = (k: DoneKind) => (suggested === k ? <span className="shp-sug">{L("Sugerido", "Suggested")}</span> : null);

  function toWait() {
    commit((s) => addWish(s, {
      concept: current.title || current.store,
      amountMinor: current.priceMinor,
      currency: current.currency,
      store: current.store,
      ...(current.url ? { link: current.url } : {}),
    }, new Date()).state, L("Deseo en espera", "Wish waiting"));
    setDone("wait");
  }
  function toPlan() {
    const now = new Date().toISOString();
    const planId = uid();
    const name = current.title || current.store || L("De un enlace", "From a link");
    const row = productPlanRow(current, planId, todayIso(), now);
    commit((s) => addDrafts(createPlan(s, name, now, planId).state, [row]), name);
    setDone("plan");
  }
  function toBuy() {
    const now = new Date().toISOString();
    commit((s) => addDrafts(s, [productDraft(current, todayIso(), now)]), L("Compra compartida", "Shared purchase"));
    setDone("buy");
  }
  function toStore() {
    const name = current.store || current.title;
    if (!name) return;
    commit((s) => ({
      ...s,
      structure: {
        ...s.structure,
        catalog: [...s.structure.catalog, { id: `c-${uid().slice(0, 8)}`, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, kind: "store" as const, urlTemplate: "" }],
      },
    }), name);
    setDone("store");
  }

  const doneText: Record<Exclude<DoneKind, null>, [string, string]> = {
    wait: ["Está en tu lista de espera.", "It is on your waiting list."],
    plan: ["Nació un plan con esta fila.", "A plan was born with this row."],
    buy: ["Está en tu bandeja, para revisarlo en la mesa.", "It is in your tray, to review at the table."],
    store: ["La tienda quedó en tu catálogo.", "The store is in your catalog."],
  };

  return createPortal(
    <div className="scn-pop-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}>
      <div className="scn-pop shp-pop" role="dialog" aria-label={L("Producto compartido", "Shared product")}>
        <div className="shp-head">
          <strong>{L("Compartido contigo", "Shared with you")}</strong>
          <button type="button" className="shr-x" aria-label={L("Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        {imgSrc ? <img className="shp-img" src={prod.imageUrl || imgSrc} alt="" /> : null}
        <label className="shp-field">
          <span>{L("Qué es", "What it is")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L("El nombre del producto", "The product's name")} />
        </label>
        <div className="shp-row">
          <label className="shp-field shp-grow">
            <span>{L("Precio", "Price")}</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </label>
          <div className="shp-cur" role="group" aria-label={L("Moneda", "Currency")}>
            {(["USD", "NIO"] as Currency[]).map((c) => (
              <button key={c} type="button" className={currency === c ? "on" : ""} onClick={() => setCurrency(c)}>{c === "USD" ? "$" : "C$"}</button>
            ))}
          </div>
        </div>
        <label className="shp-field">
          <span>{L("Tienda", "Store")}</span>
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder={L("Dónde se vende", "Where it is sold")} />
        </label>
        <p className="shp-note">
          {readNote === "page" ? L("Precio leído de la página hoy — revísalo.", "Price read from the page today — check it.")
            : readNote === "image" ? L("Precio leído de la imagen — revísalo.", "Price read from the picture — check it.")
            : readNote === "share" ? L("El precio venía en lo que compartiste.", "The price came with what you shared.")
            : busy ? L("Leyendo la imagen…", "Reading the picture…")
            : L("Sin precio leído: ponlo tú y sigue.", "No price read: set it yourself and go on.")}
          {prod.url ? (
            <>{" "}<a className="shp-link" href={prod.url} target="_blank" rel="noreferrer">{L("Ver el producto", "See the product")}<ExternalLink aria-hidden /></a></>
          ) : null}
        </p>
        {done ? (
          <div className="shp-done">
            <p>{lang === "en" ? doneText[done][1] : doneText[done][0]}</p>
            <div className="shp-actions">
              {done === "wait" ? <button type="button" className="shp-ghost" onClick={() => { onClose(); goTopic("lista-espera", { screen: "advice", anchor: "advisor-waitlist" }, "compartir"); }}>{L("Ver la lista", "See the list")}</button> : null}
              <button type="button" className="shp-save" onClick={onClose}>{L("Cerrar", "Close")}</button>
            </div>
          </div>
        ) : (
          <div className="shp-doors">
            {has("advisor.waitlist") ? (
              <button type="button" className="scn-opt" onClick={toWait}>
                <Hourglass aria-hidden /><span>{L("A la lista de espera", "To the waiting list")}</span>{chip("wait")}
              </button>
            ) : null}
            {has("capture.plan") ? (
              <button type="button" className="scn-opt" onClick={toPlan}>
                <ListChecks aria-hidden /><span>{L("A la lista-plan", "To a plan list")}</span>{chip("plan")}
              </button>
            ) : null}
            {has("capture.tray") ? (
              <button type="button" className="scn-opt" onClick={toBuy}>
                <ShoppingBag aria-hidden /><span>{L("Anotarlo como compra", "Note it as a purchase")}</span>{chip("buy")}
              </button>
            ) : null}
            {prod.url ? (
              <button type="button" className="scn-opt" onClick={toStore}>
                <Store aria-hidden /><span>{L("Guardar la tienda", "Save the store")}</span>{chip("store")}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
