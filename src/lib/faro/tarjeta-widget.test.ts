// 1.3.250 — Ajustes: UNA tarjeta «Widget» (Oscar, 2026-11-13 16:36 EST, fotos
// 234808/234809). Las dos ventanas del widget vivían en dos tarjetas sueltas —
// «Widget: ocultar montos» (la fila del equipo, solo Android) y «Categorías
// fijas del widget» (las fijas del libro, 1.3.246) — y su orden fue meterlas
// juntas en su tarjeta principal, llamada «Widget» (singular, corregido por él
// dos veces). Y darle a la sección de fijas una mejor cara: su título se salía
// por el borde derecho de la tarjeta (la T final cortada contra el marco),
// contra su ley de que los textos nunca rompen el diseño. Estas cercas guardan
// la fusión: una sola tarjeta con ese nombre y esa ancla, las dos secciones
// dentro en su orden (ocultar montos primero, las fijas debajo), cada control
// con su maquinaria intacta, y el encabezado corto en su registro de sección.
// 1.3.253: la tarjeta se pliega con la lógica de Ajustes (el acordeón openFold
// compartido, id «widget») — nace plegada en cada visita como sus vecinas, su
// cabecera es la fila de pliegue de la casa y el salto del Manual la abre por
// faro-open (fold: "widget" en el tema widget-android), como Idioma o Copias.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const host = fs.readFileSync(new URL("../../components/faro/widget-host.tsx", import.meta.url), "utf8");
const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../../components/faro/sample-mode.css", import.meta.url), "utf8");
const i18n = fs.readFileSync(new URL("./i18n.ts", import.meta.url), "utf8");
const topics = fs.readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");

const count = (src: string, needle: string) => src.split(needle).length - 1;

test("tarjeta-widget: Ajustes pinta UNA tarjeta — WidgetCard una vez, y las dos tarjetas viejas ya no existen", () => {
  // RE-FIJADO en 1.3.253: la tarjeta recibe el acordeón de Ajustes por props
  // (open/onToggle) — la intención queda: se pinta exactamente una vez.
  assert.equal(count(screens, "<WidgetCard "), 1, "screens renders the merged card exactly once");
  assert.ok(screens.includes('<WidgetCard open={openFold === "widget"} onToggle={() => toggle("widget")} />'), "the card joins the shared Settings accordion as fold «widget»");
  assert.ok(!screens.includes("WidgetRow") && !screens.includes("WidgetPinsCard"), "screens no longer names the old cards");
  assert.ok(!host.includes("export function WidgetRow") && !host.includes("export function WidgetPinsCard"), "the old components are gone from widget-host");
  assert.ok(host.includes("export function WidgetCard"), "the merged card exists");
});

test("tarjeta-widget: una sola ancla aj-widget y ninguna aj-widgetpins — el salto del Manual cae en la tarjeta fusionada", () => {
  assert.equal(count(host, 'data-anchor="aj-widget"'), 1, "exactly one card carries the widget anchor");
  assert.ok(!host.includes("aj-widgetpins") && !screens.includes("aj-widgetpins"), "the pins card's old anchor is retired");
});

test("tarjeta-widget: la tarjeta se llama «Widget» y guarda el orden de su foto — ocultar montos primero, las fijas debajo", () => {
  assert.ok(host.includes('<h2 className="serif">Widget</h2>'), "the card's own title is «Widget», untranslated");
  const flip = host.indexOf('role="switch"');
  const pins = host.indexOf('t("settings.widgetpins")');
  assert.ok(flip > -1 && pins > -1 && flip < pins, "the hide-amounts switch sits above the pins section");
});

test("tarjeta-widget: cada control conserva su maquinaria — el interruptor local y el Desfijar por el commit normal", () => {
  assert.ok(host.includes("WIDGET_HIDE_KEY") && host.includes("WIDGET_REFRESH") && host.includes("widgetHide(pref, lockOn())"), "the toggle still writes its device-local pref and refreshes the photo");
  assert.ok(host.includes("inAndroidApp()"), "the hide-amounts section keeps its Android gate inside the card");
  assert.ok(host.includes("toggleWidgetPin") && host.includes('t("widget.pin.remove")'), "unpinning still goes through the normal commit path");
});

test("tarjeta-widget: el encabezado de las fijas cabe en su casa — corto, en su registro de sección, en ambos idiomas", () => {
  // RE-FIJADO en 1.3.251: la sección creció la segunda familia de fijas (las piezas
  // del catálogo) y el encabezado se acortó otra vez con la misma doctrina — la
  // palabra se adapta, el diseño no se estira: dentro de la tarjeta «Widget»,
  // «Fijadas» / "Pinned" dice la verdad sobre las dos familias.
  assert.ok(i18n.includes('"settings.widgetpins": "Fijadas"'), "ES heading is the short form");
  assert.ok(i18n.includes('"settings.widgetpins": "Pinned"'), "EN heading is the short form");
  assert.ok(!i18n.includes("Categorías fijas del widget") && !i18n.includes("Widget pinned categories"), "the overflowing titles are gone");
  assert.ok(host.includes("wpin-h") && host.includes("wpin-sec"), "the heading rides the section register inside the card");
  assert.ok(css.includes(".wpin-sec") && !css.includes(".wpin-head"), "the section's CSS replaced the old card-head rules");
});

test("tarjeta-widget: la tarjeta se pliega como sus vecinas — cabecera de pliegue de la casa y contenido tras la puerta", () => {
  assert.ok(host.includes('data-fold="widget"'), "the card carries its fold id, like every Fold section (data-fold)");
  assert.ok(host.includes('className="manual-row fold-btn aj-row"') && host.includes("aria-expanded={open}"), "the header is the house fold row, announcing its state");
  assert.ok(host.includes('className={open ? "fold-chev is-open" : "fold-chev"}'), "the chevron is the house fold chevron, turning when open");
  assert.ok(host.includes("onClick={onToggle}") && host.includes("onToggle()"), "the row toggles by tap and by Enter/Space, like the Fold component");
  const gate = host.indexOf("{open ? (");
  const flip = host.indexOf('role="switch"');
  const pins = host.indexOf('t("settings.widgetpins")');
  assert.ok(gate > -1 && flip > gate && pins > gate, "both sections live INSIDE the fold — nothing renders until it opens");
});

test("tarjeta-widget: nace plegada en cada visita y el salto del Manual la abre — la ley de las vecinas", () => {
  assert.ok(screens.includes("const [openFold, setOpenFold] = useState<string | null>(null);"), "the shared accordion starts with every fold closed on each visit — Widget inherits it, no state of its own");
  assert.ok(host.includes("WidgetCard({ open, onToggle }") && !host.includes("faro.widget.open"), "the fold state arrives by props from the accordion — the card invents no persistence key of its own");
  assert.ok(screens.includes('"account", "widget"'), "Settings answers faro-open for «widget», like the other folds");
  assert.ok(topics.includes('fold: "widget", anchor: "aj-widget"'), "the widget-android topic opens the fold first, then lands on the anchor — the house jump for folded cards");
});
