/* 1.3.100: compact picker fields for the line editors. A field shows the choice as a chip (its mark + name) or a clear
 * placeholder; tapping it opens one sheet (its own Back layer) with the options grouped, a search when the list is long,
 * and an inline "add". The field that identifies a line (Cuotas → Ícono y color, Compras → Tienda, the other books → the
 * mark beside Concepto) also carries the line's icon and colour: its sheet adds the colour section (ColorPick, shared) and
 * the Faro icons, so the floating "Ícono y color" pill is gone from the editors.
 * The pencil beside the X turns on a manage state: checkboxes and one confirmation for many hidings; categories and
 * stores also rename inline and categories change colour, with the same data and rules as Compras → engranaje
 * (the manage action HIDES, exactly like that switch: lines keep their category and money history — and since
 * 1.3.186 the button says so: «Ocultar» with the eye-off icon, not «Borrar» with a bin; audit E-2). */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, EyeOff, Palette, Pencil, Plus, Repeat2, RotateCcw, Search, Sparkles, Store, Tag, Trash2, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { displayName, markUserVis } from "@/lib/faro/defaults";
import { categoryColor, subColorFor } from "@/lib/faro/colors";
import { namedIconFor, subIconFor } from "@/lib/faro/faces";
import { uid } from "@/lib/faro/money";
import { inkOn, washForInk } from "@/lib/faro/palette";
import { SUB_GROUPS, groupOf, libraryOf, libraryOff, normName, poolName, restoreLibrary } from "@/lib/faro/subs";
import { FREQ_BOUNDS, cadenceLabel, customFreqsFor, customToken, dropFreq, intervalOf, rememberFreq, sameCadence, type FreqUnit } from "@/lib/faro/cadence";
import { BrandMark, Glyph, LOOK_ICONS, SubMark } from "./icons";
import { ColorPick, LookGem } from "./color-pick";
import { useFaro } from "./provider";
import "./fit-form.css";

export type PickItem = { id: string; label: string; mark: ReactNode; group?: string; color?: string };
/** The line's look (Faro icon + colour), shown in and edited from the identifying field. */
export type Look = { glyph: string; color: string; onGlyph: (name: string) => void; onColor: (hex: string) => void };

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/** The trigger: looks like a field of the editor, holds the chosen chip or a placeholder. */
export function PickButton({ mark, text, placeholder, open, onOpen, test, compact, label }: { mark: ReactNode; text: string; placeholder: string; open: boolean; onOpen: () => void; test?: string; compact?: boolean; label?: string }) {
  return (
    <button type="button" className={`field fit-pick-btn${text ? " is-set" : ""}${compact ? " is-compact" : ""}`} aria-expanded={open} aria-haspopup="dialog" aria-label={compact ? label || text || placeholder : undefined} data-test={test} onClick={onOpen}>
      <span className="fit-pick-mark" aria-hidden>{mark}</span>
      {compact ? null : <span className="fit-pick-text">{text || placeholder}</span>}
      <ChevronDown className="fit-pick-chev" aria-hidden />
    </button>
  );
}

/* 1.3.102: the colour and the Faro icons live behind the palette button in the sheet's header ("Color e íconos"), at the
 * top of the sheet instead of after the whole list. Faro icon names, so the search can find them in both languages. */
const ICON_WORDS: Record<string, [string, string]> = {
  PiggyBank: ["Alcancía ahorro", "Piggy bank savings"], Wallet: ["Billetera", "Wallet"], Banknote: ["Billete efectivo", "Banknote cash"], HandCoins: ["Mano monedas pago", "Hand coins pay"], Gem: ["Gema joya", "Gem jewel"], Trophy: ["Trofeo", "Trophy"], Star: ["Estrella", "Star"], Flag: ["Bandera meta", "Flag goal"], Hourglass: ["Reloj de arena retiro", "Hourglass retirement"],
  Home: ["Casa hogar renta", "Home house rent"], Key: ["Llave", "Key"], Sofa: ["Sofá muebles", "Sofa furniture"], Building2: ["Edificio apartamento", "Building apartment"],
  Car: ["Carro auto", "Car"], Plane: ["Avión viaje vuelo", "Plane travel flight"], Bus: ["Bus autobús", "Bus"], Bike: ["Bicicleta", "Bike bicycle"], Fuel: ["Gasolina combustible", "Fuel gas"], Ship: ["Barco", "Ship"],
  Heart: ["Corazón amor", "Heart love"], Baby: ["Bebé", "Baby"], Stethoscope: ["Médico doctor salud", "Doctor health"], Pill: ["Pastilla medicina farmacia", "Pill medicine pharmacy"], Dumbbell: ["Pesas gimnasio", "Dumbbell gym"],
  GraduationCap: ["Graduación estudios universidad", "Graduation school college"], BookOpen: ["Libro lectura", "Book reading"], Briefcase: ["Maletín trabajo", "Briefcase work"], Laptop: ["Computadora laptop", "Laptop computer"],
  Utensils: ["Cubiertos comida restaurante", "Utensils food restaurant"], Coffee: ["Café", "Coffee"], Gift: ["Regalo", "Gift"], Shirt: ["Camisa ropa", "Shirt clothes"], ShoppingBag: ["Bolsa compras", "Shopping bag"],
  Palmtree: ["Palmera playa vacaciones", "Palm tree beach holiday"], Tent: ["Carpa camping", "Tent camping"], Mountain: ["Montaña", "Mountain"], Camera: ["Cámara foto", "Camera photo"],
  Dog: ["Perro mascota", "Dog pet"], Cat: ["Gato mascota", "Cat pet"], PawPrint: ["Huella mascota", "Paw print pet"],
  Music: ["Música", "Music"], Headphones: ["Audífonos", "Headphones"], Tv: ["Televisión tele", "TV television"], Gamepad2: ["Juegos videojuego", "Games gamepad"],
  Shield: ["Escudo seguro emergencia", "Shield insurance emergency"], Umbrella: ["Paraguas seguro", "Umbrella insurance"], TreePine: ["Pino árbol", "Pine tree"], Sun: ["Sol", "Sun"],
  Watch: ["Reloj", "Watch"], Glasses: ["Lentes gafas", "Glasses"], Backpack: ["Mochila", "Backpack"], Landmark: ["Banco", "Bank landmark"], Flower2: ["Flor", "Flower"], Leaf: ["Hoja", "Leaf"],
  Apple: ["Manzana fruta", "Apple fruit"], Cake: ["Pastel cumpleaños", "Cake birthday"], Pizza: ["Pizza", "Pizza"], Fish: ["Pez pescado", "Fish"], Anchor: ["Ancla", "Anchor"], Bed: ["Cama", "Bed"], Lamp: ["Lámpara", "Lamp"], Moon: ["Luna", "Moon"], Wifi: ["Wifi internet", "Wifi internet"], Wrench: ["Llave inglesa reparación", "Wrench repair"],
  Crown: ["Corona", "Crown"], Coins: ["Monedas", "Coins"], Sparkles: ["Brillos", "Sparkles"], Medal: ["Medalla", "Medal"], Rocket: ["Cohete", "Rocket"], Store: ["Tienda", "Store"], ShoppingCart: ["Carrito supermercado", "Shopping cart groceries"], Receipt: ["Recibo factura", "Receipt bill"],
  TrainFront: ["Tren metro", "Train metro"], Truck: ["Camión mudanza", "Truck moving"], Sailboat: ["Velero", "Sailboat"], Luggage: ["Maleta equipaje", "Luggage"], Map: ["Mapa", "Map"], Ticket: ["Boleto entrada", "Ticket"], Hotel: ["Hotel", "Hotel"],
  Wine: ["Vino", "Wine"], Croissant: ["Croissant pan", "Croissant bread"], Soup: ["Sopa", "Soup"], IceCreamCone: ["Helado", "Ice cream"], Carrot: ["Zanahoria verdura", "Carrot vegetable"],
  Flame: ["Llama fuego gas", "Flame fire gas"], Zap: ["Rayo luz electricidad", "Bolt power electricity"], Lightbulb: ["Bombillo idea luz", "Light bulb idea"], Target: ["Objetivo diana", "Target"], Ribbon: ["Lazo", "Ribbon"],
  HandHeart: ["Donación caridad", "Donation charity"], HeartPulse: ["Pulso salud", "Heart pulse health"], Hospital: ["Hospital", "Hospital"], School: ["Escuela colegio", "School"], Church: ["Iglesia diezmo", "Church tithe"], Library: ["Biblioteca", "Library"],
  Hammer: ["Martillo", "Hammer"], Scissors: ["Tijeras peluquería", "Scissors haircut"], Factory: ["Fábrica", "Factory"], WashingMachine: ["Lavadora lavandería", "Washing machine laundry"], Phone: ["Teléfono celular", "Phone"],
  Sprout: ["Brote planta", "Sprout plant"], TreeDeciduous: ["Árbol", "Tree"], Bird: ["Pájaro ave", "Bird"], Bone: ["Hueso", "Bone"], Footprints: ["Huellas pasos", "Footprints"], Guitar: ["Guitarra", "Guitar"], Drum: ["Tambor batería", "Drum"], Snowflake: ["Copo nieve", "Snowflake"],
};
const iconWords = (name: string, lang: string) => {
  const w = ICON_WORDS[name];
  return w ? `${w[lang === "en" ? 1 : 0]} ${w[lang === "en" ? 0 : 1]} ${name}` : name.replace(/([a-z])([A-Z0-9])/g, "$1 $2");
};
const iconLabel = (name: string, lang: string) => (ICON_WORDS[name]?.[lang === "en" ? 1 : 0] ?? name).split(" ")[0]!;

/** "Color e íconos": the colour (quick set, Personalizado, Mis colores, ● ACTUAL on its header line) and the Faro icons. */
function LookView({ look, lang, q, onDone, onInk }: { look: Look; lang: string; q: string; onDone?: () => void; onInk: (hex: string | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const ink = draft ?? look.color;
  const needle = normName(q);
  const icons = needle ? LOOK_ICONS.filter((name) => normName(iconWords(name, lang)).includes(needle)) : LOOK_ICONS;
  return (
    <>
      {needle ? null : (
        <section className="fit-look" data-test="look-color">
          <ColorPick value={look.color} glyph={look.glyph} onPick={look.onColor} onDraft={(c) => { setDraft(c); onInk(c); }} onConfirm={onDone} label={L(lang, "Color", "Colour")} />
        </section>
      )}
      <section className="fit-group" data-test="look-icons">
        <p className="fit-kicker">{L(lang, "Íconos de Faro", "Faro icons")}</p>
        {icons.length ? (
          <div className="look-icons fit-look-icons">
            {icons.map((name) => (
              <button key={name} type="button" data-icon={name} aria-pressed={look.glyph === name} aria-label={iconLabel(name, lang)} title={iconLabel(name, lang)} style={{ ["--ink" as string]: ink, background: washForInk(ink), color: inkOn(washForInk(ink)) }} onClick={() => { look.onGlyph(name); }}><Glyph name={name} /></button>
            ))}
          </div>
        ) : <p className="fit-empty">{L(lang, "Nada coincide", "No matches")}</p>}
      </section>
    </>
  );
}

/**
 * FACES (Oscar, 2026-11-11): a category's or subcategory's plate — its own colour as a soft wash,
 * its own glyph drawn in the colour's deep tone. The same plate everywhere the piece appears as
 * itself: Estructura's tree, the pickers, Compras. With onClick it becomes the door to the icon
 * picker — tapping the face to change the face, the gesture the category's colour ball set.
 */
export function PiecePlate({ color, icon, small, onClick, label }: { color: string; icon: string; small?: boolean; onClick?: () => void; label?: string }) {
  const wash = washForInk(color);
  const style = { background: wash, color: inkOn(wash) };
  const glyph = <Glyph name={icon} className={small ? "size-3.5" : "size-4"} />;
  if (onClick) return <button type="button" className={"piece-plate" + (small ? " is-sm" : "")} style={style} aria-label={label} onClick={onClick}>{glyph}</button>;
  return <span className={"piece-plate" + (small ? " is-sm" : "")} style={style} aria-hidden>{glyph}</span>;
}

/** The icon picker for a piece's face: the app's Faro icons, searchable, tinted with the piece's
 *  own colour — ColorPick's sibling, rendered inline where the piece is edited. */
export function IconPick({ value, color, onPick }: { value: string; color: string; onPick: (name: string) => void }) {
  const { lang } = useFaro();
  const [q, setQ] = useState("");
  const needle = normName(q);
  const icons = needle ? LOOK_ICONS.filter((name) => normName(iconWords(name, lang)).includes(needle)) : LOOK_ICONS;
  const wash = washForInk(color);
  return (
    <div className="icon-pick">
      <input className="field" value={q} placeholder={L(lang, "Buscar ícono", "Search icons")} aria-label={L(lang, "Buscar ícono", "Search icons")} onChange={(e) => setQ(e.target.value)} />
      {icons.length ? (
        <div className="look-icons icon-pick-grid">
          {icons.map((name) => (
            <button key={name} type="button" data-icon={name} aria-pressed={value === name} aria-label={iconLabel(name, lang)} title={iconLabel(name, lang)} style={{ ["--ink" as string]: color, background: wash, color: inkOn(wash) }} onClick={() => onPick(name)}><Glyph name={name} /></button>
          ))}
        </div>
      ) : <p className="fit-empty">{L(lang, "Nada coincide", "No matches")}</p>}
    </div>
  );
}

export type Manage = {
  /** Many deletions, one confirmation. `word` names the things ("íconos", "categorías"). */
  onDropMany: (ids: string[]) => void;
  word: [string, string, string, string];
  onRename?: (id: string, name: string) => void;
  onColor?: (id: string, hex: string) => void;
  onRestore?: () => void;
  /** 1.3.115 (Libros books): the verb of the red button and its confirmation ("Archivar"), and the confirmation's body. */
  verb?: [string, string];
  body?: string;
  /** 1.3.186 (R-2, cierra E-2): the structure pickers' manage action HIDES — the button and its
   *  confirmation say «Ocultar» and carry the eye-off icon instead of «Borrar» + bin. The action
   *  itself (and its non-danger confirmation, as it always was) does not change. */
  hide?: boolean;
};

export function PickSheet({ title, items, groups, value, onPick, onClose, add, manage, none, test, look, onLookDone, startEditing, onPalette }: {
  title: string;
  items: PickItem[];
  groups?: { id: string; label: string }[];
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
  add?: { placeholder: string; onAdd: (name: string) => void };
  manage?: Manage;
  none?: string;
  test?: string;
  /** The line's colour + Faro icons: behind the palette button ("Color e íconos"), or the whole sheet when there is no list. */
  look?: Look;
  /** A confirmed colour returns to the trigger. Oleada de botones 4 (R9): picking a
   *  Faro icon applies it and the sheet STAYS open — icon and colour in one visit;
   *  the sheet leaves through its normal exits (X, veil, Back). */
  onLookDone?: () => void;
  /** 1.3.115: a book's pencil opens its sheet straight in the manage state (✓ then leaves it for the list). */
  startEditing?: boolean;
  /** 1.3.115: a book's sheet — the palette in the head gives the ticked rows one colour and icon. */
  onPalette?: (ids: string[]) => void;
}) {
  const { lang, confirm } = useFaro();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(!!startEditing);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [paint, setPaint] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [lookOn, setLookOn] = useState(false);
  const [ink, setInk] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const listY = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  // A sheet that is only the look (no list to choose from) shows it straight away, with no palette button.
  const lookOnly = !!look && items.length === 0 && !add;
  const lookView = !!look && (lookOnly || lookOn);
  useLayer(true, onClose);
  // "Color e íconos" is its own Back step: Back (or the palette again) returns to the list, the next Back closes the sheet.
  useLayer(lookOn && !lookOnly, () => setLookOn(false));
  // The manage state is its own Back step: Back leaves it first, then closes the sheet.
  // 1.3.115: a sheet that opened in its manage state (a book's pencil) has one Back step: Back closes it.
  const [manageBase] = useState(!!startEditing);
  useLayer(editing && !manageBase, () => { setEditing(false); setSel(new Set()); setPaint(null); });
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const list = listRef.current;
      const on = list?.querySelector<HTMLElement>("[aria-pressed='true']");
      if (!list || !on) return;
      // Bring the chosen row into view with a little air above it, never under the list's top edge.
      const top = on.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 8;
      const bottom = top + on.offsetHeight + 16;
      if (top < list.scrollTop) list.scrollTop = Math.max(0, top);
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
      setScrolled(list.scrollTop > 2);
    });
    return () => { document.body.style.overflow = prev; };
  }, []);
  // Switching views: the sheet never shrinks (no jump), the list keeps its scroll, the look view starts at the top.
  const swap = (on: boolean) => {
    const sheet = sheetRef.current;
    const list = listRef.current;
    if (sheet) sheet.style.minHeight = `${sheet.getBoundingClientRect().height}px`;
    if (list && !lookView) listY.current = list.scrollTop;
    setQ("");
    setLookOn(on);
  };
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = lookView ? 0 : listY.current;
    setScrolled(list.scrollTop > 2);
  }, [lookView]);
  const toggleLook = () => {
    if (editing) { setEditing(false); setSel(new Set()); setPaint(null); }
    swap(!lookOn);
  };
  // 1.3.116: the palette with nothing ticked says what to do (a short note above the sheet) and nudges the checkboxes.
  const [hint, setHint] = useState<{ top?: number; bottom?: number } | null>(null);
  const [nudge, setNudge] = useState(0);
  const hintTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);
  const nudgeTicks = () => {
    const r = sheetRef.current?.getBoundingClientRect();
    // Its bottom 8 px above the sheet when there is room (two lines at large text too), else just under the sheet's head.
    setHint(!r ? { top: 16 } : r.top >= 110 ? { bottom: Math.round(innerHeight - r.top + 8) } : { top: Math.round(r.top + 56) });
    setNudge((n) => n + 1);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 2600);
  };
  const needle = normName(q);
  const shown = needle ? items.filter((it) => normName(it.label).includes(needle)) : items;
  const sections = groups?.length
    ? groups.map((g) => ({ ...g, rows: shown.filter((it) => (it.group ?? "") === g.id) })).filter((g) => g.rows.length)
    : [{ id: "", label: "", rows: shown }];
  const visibleIds = sections.flatMap((g) => g.rows.map((r) => r.id));
  const allOn = visibleIds.length > 0 && visibleIds.every((id) => sel.has(id));
  const toggle = (id: string) => setSel((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const commitAdd = () => {
    const n = name.trim();
    if (!n || !add) return;
    add.onAdd(n.slice(0, 40));
    setName("");
  };
  const dropSelected = () => {
    if (!manage || !sel.size) return;
    const ids = [...sel];
    const [one, many] = lang === "en" ? [manage.word[2], manage.word[3]] : [manage.word[0], manage.word[1]];
    const verb = manage.verb ? L(lang, manage.verb[0], manage.verb[1]) : manage.hide ? L(lang, "Ocultar", "Hide") : L(lang, "Borrar", "Delete");
    confirm({
      title: L(lang, `¿${verb} ${ids.length} ${ids.length === 1 ? one : many}?`, `${verb} ${ids.length} ${ids.length === 1 ? one : many}?`),
      body: manage.body ?? L(lang, "Las líneas que ya los usan los conservan, con todo su historial.", "Lines already using them keep them, with all their history."),
      // Only the books' sheets (1.3.115) ask in red; the editors' pickers keep their confirmation as it was.
      danger: manage.verb || manage.body ? true : undefined,
      yes: verb,
      run: () => { manage.onDropMany(ids); setSel(new Set()); },
    });
  };
  const body = (
    <div className="fit-scrim" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {hint ? <div className="pp-toast fit-toast" role="status" data-test="kit-tick-hint" style={hint.bottom != null ? { bottom: hint.bottom } : { top: hint.top }}>{L(lang, "Marca primero lo que quieres cambiar", "Tick what you want to change first")}</div> : null}
      <div ref={sheetRef} className={`fit-sheet${editing ? " is-editing" : ""}${lookView ? " is-look" : ""}${hint ? " is-nudge" : ""}`} data-nudge={nudge % 2} role="dialog" aria-modal="true" aria-label={title} data-test={test} onPointerDown={(e) => e.stopPropagation()}>
        <div className="fit-sheet-head">
          <strong>{title}</strong>
          {look && !lookOnly ? (
            <button type="button" className="fit-sheet-tool is-pal" data-test="look-pal" aria-pressed={lookOn} aria-label={L(lang, "Color e íconos", "Colour and icons")} title={L(lang, "Color e íconos", "Colour and icons")} onClick={toggleLook}>
              <Palette aria-hidden />
              <i className="fit-pal-dot" aria-hidden style={{ ["--sw" as string]: ink ?? look.color }} />
            </button>
          ) : null}
          {onPalette && editing ? (
            <button type="button" className="fit-sheet-tool is-pal is-kit-pal" data-test="kit-sheet-pal" aria-label={L(lang, "Color e íconos", "Colour and icons")} title={L(lang, "Color e íconos", "Colour and icons")} onClick={() => (sel.size ? onPalette([...sel]) : nudgeTicks())}>
              <Palette aria-hidden />
            </button>
          ) : null}
          {manage?.onRestore && !lookView ? (
            <button type="button" className="fit-sheet-tool" data-test="lib-restore" aria-label={L(lang, "Restaurar de fábrica", "Restore defaults")} onClick={manage.onRestore}><RotateCcw /></button>
          ) : null}
          {manage ? (
            <button type="button" className="fit-sheet-tool is-pen" data-test="lib-edit" aria-pressed={editing} aria-label={editing ? L(lang, "Listo", "Done") : L(lang, "Administrar", "Manage")} onClick={() => { if (lookOn && !editing) swap(false); setEditing((v) => !v); setSel(new Set()); setPaint(null); }}>{editing ? <Check /> : <Pencil />}</button>
          ) : null}
          <button type="button" className="fit-sheet-tool" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        {lookView || items.length > 8 ? (
          <label className="fit-search">
            <Search aria-hidden />
            <input value={q} data-test="pick-search" placeholder={lookView ? L(lang, "Buscar ícono", "Search icon") : L(lang, "Buscar", "Search")} aria-label={L(lang, "Buscar", "Search")} onChange={(e) => setQ(e.target.value)} />
          </label>
        ) : null}
        <div className={`fit-sheet-list${scrolled ? " is-scrolled" : ""}`} ref={listRef} data-view={lookView ? "look" : "list"} onScroll={(e) => { const v = e.currentTarget.scrollTop > 2; if (v !== scrolled) setScrolled(v); }}>
          {lookView && look ? (
            <div className="fit-view" key="look"><LookView look={look} lang={lang} q={q} onDone={onLookDone} onInk={setInk} /></div>
          ) : (
          <div className="fit-view" key="list">
          {none && !needle && !editing ? (
            <div className="fit-grid">
              <button type="button" className="fit-opt is-none" aria-pressed={!value} onClick={() => onPick("")}><span className="fit-opt-mark" aria-hidden><X /></span><span>{none}</span></button>
            </div>
          ) : null}
          {sections.map((g) => (
            <section key={g.id || "all"} className="fit-group">
              {g.label ? <p className="fit-kicker">{g.label}</p> : null}
              <div className="fit-grid">
                {g.rows.map((it) => editing ? (
                  <div key={it.id} className={`fit-opt is-manage${sel.has(it.id) ? " is-sel" : ""}`} data-id={it.id}>
                    <input type="checkbox" className="fit-check" aria-label={`${L(lang, "Elegir", "Select")} ${it.label}`} checked={sel.has(it.id)} onChange={() => toggle(it.id)} />
                    {manage?.onColor ? (
                      <button type="button" className="fit-opt-mark is-paint" aria-label={L(lang, "Color", "Colour")} aria-pressed={paint === it.id} onClick={() => setPaint(paint === it.id ? null : it.id)}>{it.mark}</button>
                    ) : <span className="fit-opt-mark" aria-hidden>{it.mark}</span>}
                    {manage?.onRename ? (
                      <input className="fit-rename" defaultValue={it.label} aria-label={L(lang, "Nombre", "Name")} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== it.label) manage.onRename!(it.id, v.slice(0, 40)); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                    ) : <span className="fit-opt-name" onClick={() => toggle(it.id)}>{it.label}</span>}
                  </div>
                ) : (
                  <button
                    key={it.id}
                    type="button"
                    className={`fit-opt${it.label.length > 16 ? " is-long" : ""}`}
                    data-id={it.id}
                    aria-pressed={value === it.id}
                    onClick={() => onPick(it.id)}
                  >
                    <span className="fit-opt-mark" aria-hidden>{it.mark}</span>
                    <span>{it.label}</span>
                  </button>
                ))}
              </div>
              {editing && paint && manage?.onColor && g.rows.some((r) => r.id === paint) ? (
                <div className="fit-paint" data-test="manage-color">
                  <ColorPick value={g.rows.find((r) => r.id === paint)?.color ?? "#888"} onPick={(hex) => manage.onColor!(paint, hex)} label={L(lang, "Color", "Colour")} />
                </div>
              ) : null}
            </section>
          ))}
          {!sections.some((g) => g.rows.length) ? <p className="fit-empty">{L(lang, "Nada coincide", "No matches")}</p> : null}
          </div>
          )}
        </div>
        {editing && manage ? (
          <div className="fit-manage-bar">
            <label className="fit-all"><input type="checkbox" className="fit-check" data-test="manage-all" aria-label={L(lang, "Seleccionar todo", "Select all")} checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(visibleIds))} /><span className="fit-all-long">{L(lang, "Seleccionar todo", "Select all")}</span><span className="fit-all-short" aria-hidden>{L(lang, "Todo", "All")}</span></label>
            <button type="button" className="btn danger fit-drop" data-test="manage-drop" disabled={!sel.size} onClick={dropSelected}>{manage.hide ? <EyeOff /> : <Trash2 />}{manage.verb ? L(lang, manage.verb[0], manage.verb[1]) : manage.hide ? L(lang, "Ocultar", "Hide") : L(lang, "Borrar", "Delete")}{sel.size ? ` (${sel.size})` : ""}</button>
          </div>
        ) : add && !lookView ? (
          <div className="fit-add">
            <input className="field" value={name} placeholder={add.placeholder} aria-label={add.placeholder} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitAdd(); } }} />
            <button type="button" className="fit-add-btn" aria-label={L(lang, "Añadir", "Add")} disabled={!name.trim()} onClick={commitAdd}><Plus /></button>
          </div>
        ) : null}
      </div>
    </div>
  );
  return createPortal(body, document.body);
}

/** Compras: the store, as a chip with its brand mark (or the line's icon in its colour); the sheet lists every store with
 * an inline "add", a manage state, and — when the editor hands its look — the colour and Faro icons of the line. */
export function StorePick({ value, onChange, look }: { value: string; onChange: (id: string) => void; look?: Look }) {
  const { t, session, commit, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const stores = (session?.ledger.structure.catalog ?? []).filter((c) => c.kind === "store" && (!c.hidden || c.id === value)).sort((a, b) => a.order - b.order);
  const cur = stores.find((s) => s.id === value);
  const markOf = (s: (typeof stores)[number]) => <BrandMark id={s.id} src={s.icon.startsWith("data:") ? s.icon : undefined} className="fit-brand" />;
  const empty = look && look.glyph && look.glyph !== "Circle" ? <LookGem color={look.color} glyph={look.glyph} /> : look ? <LookGem color={look.color} glyph="Store" /> : <Store />;
  return (
    <>
      <PickButton test="store-pick" open={open} onOpen={() => setOpen(true)} mark={cur ? markOf(cur) : empty} text={cur ? displayName(cur, lang) : ""} placeholder={L(lang, "Elegir", "Choose")} />
      {open ? (
        <PickSheet
          test="store-sheet"
          title={look ? L(lang, "Tienda, ícono y color", "Store, icon, colour") : t("store")}
          value={value}
          none={L(lang, "Sin tienda", "No store")}
          items={stores.filter((s) => !s.hidden).map((s) => ({ id: s.id, label: displayName(s, lang), mark: markOf(s) }))}
          onClose={() => setOpen(false)}
          onPick={(id) => { onChange(id); setOpen(false); }}
          look={look}
          onLookDone={() => setOpen(false)}
          manage={{
            hide: true,
            word: ["tienda", "tiendas", "store", "stores"],
            onDropMany: (ids) => { if (ids.includes(value)) onChange(""); commit((st) => ({ ...st, structure: { ...st.structure, catalog: st.structure.catalog.map((c) => (ids.includes(c.id) ? { ...c, hidden: true } : c)) } }), L(lang, "Tiendas", "Stores")); },
            onRename: (id, name) => commit((st) => ({ ...st, structure: { ...st.structure, catalog: st.structure.catalog.map((c) => (c.id === id ? { ...c, customName: name } : c)) } }), name),
          }}
          add={{
            placeholder: t("shops.addStore"),
            onAdd: (name) => {
              const id = `c-${uid().slice(0, 8)}`;
              commit((st) => ({ ...st, structure: { ...st.structure, catalog: [...st.structure.catalog, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, kind: "store", urlTemplate: "" }] } }), name);
              onChange(id);
              setOpen(false);
            },
          }}
        />
      ) : null}
    </>
  );
}

/** Compras: the purchase category, as a chip with its colour; picker lists them with an inline "add" and a manage state. */
export function PurchaseCatPick({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t, session, commit, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const cats = (session?.ledger.structure.purchases ?? []).filter((p) => !p.hidden || p.id === value).sort((a, b) => a.order - b.order);
  const cur = cats.find((p) => p.id === value);
  const dot = (p: (typeof cats)[number]) => <PiecePlate small color={categoryColor(p.id, p.color)} icon={namedIconFor(p)} />;
  return (
    <>
      <PickButton test="cat-pick" open={open} onOpen={() => setOpen(true)} mark={cur ? dot(cur) : <Tag />} text={cur ? displayName(cur, lang) : ""} placeholder={L(lang, "Elegir", "Choose")} />
      {open ? (
        <PickSheet
          test="cat-sheet"
          title={t("category")}
          value={value}
          none={L(lang, "Ninguna", "None")}
          items={cats.filter((p) => !p.hidden).map((p) => ({ id: p.id, label: displayName(p, lang), mark: dot(p), color: categoryColor(p.id, p.color) }))}
          onClose={() => setOpen(false)}
          onPick={(id) => { onChange(id); setOpen(false); }}
          manage={{
            hide: true,
            word: ["categoría", "categorías", "category", "categories"],
            onDropMany: (ids) => { if (ids.includes(value)) onChange(""); commit((st) => ({ ...st, structure: { ...st.structure, purchases: st.structure.purchases.map((p) => (ids.includes(p.id) ? { ...p, hidden: true } : p)) } }), L(lang, "Categorías", "Categories")); },
            onRename: (id, name) => commit((st) => ({ ...st, structure: { ...st.structure, purchases: st.structure.purchases.map((p) => (p.id === id ? { ...p, customName: name } : p)) } }), name),
            onColor: (id, hex) => commit((st) => ({ ...st, structure: { ...st.structure, purchases: st.structure.purchases.map((p) => (p.id === id ? { ...p, color: hex } : p)) } }), hex),
          }}
          add={{
            placeholder: t("shops.addCat"),
            onAdd: (name) => {
              const id = `p-${uid().slice(0, 8)}`;
              commit((st) => ({ ...st, structure: { ...st.structure, purchases: [...st.structure.purchases, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99 }] } }), name);
              onChange(id);
              setOpen(false);
            },
          }}
        />
      ) : null}
    </>
  );
}

/** Fijos / Variables: the category (with its colour) and its subcategory, as chips; same sheet, inline add and manage
 * state as Compras. The manage action hides («Ocultar»), exactly like the eye in Ajustes → Estructura: lines keep their category and history. */
export function CategoryPick({ group, value, onChange }: { group: "fixed" | "variable"; value: string; onChange: (id: string) => void }) {
  const { t, session, commit, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const all = (session?.ledger.structure.categories ?? []).filter((c) => c.group === group).sort((a, b) => a.order - b.order);
  const cur = all.find((c) => c.id === value);
  const dot = (c: (typeof all)[number]) => <PiecePlate small color={categoryColor(c.id, c.color)} icon={namedIconFor(c)} />;
  const patch = (ids: string[], fn: (c: (typeof all)[number]) => (typeof all)[number], label: string) =>
    commit((st) => ({ ...st, structure: { ...st.structure, categories: st.structure.categories.map((c) => (ids.includes(c.id) ? fn(c) : c)) } }), label);
  return (
    <>
      <PickButton test="fcat-pick" open={open} onOpen={() => setOpen(true)} mark={cur ? dot(cur) : <Tag />} text={cur ? displayName(cur, lang) : ""} placeholder={L(lang, "Elegir", "Choose")} />
      {open ? (
        <PickSheet
          test="fcat-sheet"
          title={t("category")}
          value={value}
          none={L(lang, "Ninguna", "None")}
          items={all.filter((c) => !c.hidden).map((c) => ({ id: c.id, label: displayName(c, lang), mark: dot(c), color: categoryColor(c.id, c.color) }))}
          onClose={() => setOpen(false)}
          onPick={(id) => { onChange(id); setOpen(false); }}
          manage={{
            hide: true,
            word: ["categoría", "categorías", "category", "categories"],
            onDropMany: (ids) => { if (ids.includes(value)) onChange(""); commit((st) => ({ ...st, structure: markUserVis({ ...st.structure, categories: st.structure.categories.map((c) => (ids.includes(c.id) ? { ...c, hidden: true } : c)) }, ids, true) }), L(lang, "Categorías", "Categories")); },
            onRename: (id, name) => patch([id], (c) => ({ ...c, customName: name }), name),
            onColor: (id, hex) => patch([id], (c) => ({ ...c, color: hex }), hex),
          }}
          add={{
            placeholder: L(lang, "Nueva categoría", "New category"),
            onAdd: (name) => {
              const id = `c-${uid().slice(0, 8)}`;
              commit((st) => ({ ...st, structure: { ...st.structure, categories: [...st.structure.categories, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, group, role: "", subs: [] }] } }), name);
              onChange(id);
              setOpen(false);
            },
          }}
        />
      ) : null}
    </>
  );
}

export function SubPick({ categoryId, value, onChange }: { categoryId: string; value: string; onChange: (id: string) => void }) {
  const { t, session, commit, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const cat = session?.ledger.structure.categories.find((c) => c.id === categoryId);
  const subs = (cat?.subs ?? []).slice().sort((a, b) => a.order - b.order);
  const cur = subs.find((x) => x.id === value);
  const patchSubs = (fn: (list: typeof subs) => typeof subs, label: string) =>
    commit((st) => ({ ...st, structure: { ...st.structure, categories: st.structure.categories.map((c) => (c.id === categoryId ? { ...c, subs: fn(c.subs) } : c)) } }), label);
  return (
    <>
      <PickButton test="sub-pick" open={open} onOpen={() => setOpen(true)} mark={cur && session?.ledger.structure ? <PiecePlate small color={subColorFor(session.ledger.structure, categoryId, cur.id)} icon={subIconFor(session.ledger.structure, categoryId, cur.id)} /> : <Tag />} text={cur ? displayName(cur, lang) : ""} placeholder={L(lang, "Elegir", "Choose")} />
      {open ? (
        <PickSheet
          test="sub-sheet"
          title={t("sub")}
          value={value}
          none={L(lang, "Ninguna", "None")}
          items={subs.filter((x) => !x.hidden).map((x) => ({ id: x.id, label: displayName(x, lang), mark: session?.ledger.structure ? <PiecePlate small color={subColorFor(session.ledger.structure, categoryId, x.id)} icon={subIconFor(session.ledger.structure, categoryId, x.id)} /> : <Tag /> }))}
          onClose={() => setOpen(false)}
          onPick={(id) => { onChange(id); setOpen(false); }}
          manage={{
            hide: true,
            word: ["subcategoría", "subcategorías", "subcategory", "subcategories"],
            onDropMany: (ids) => { if (ids.includes(value)) onChange(""); commit((st) => ({ ...st, structure: markUserVis({ ...st.structure, categories: st.structure.categories.map((c) => (c.id === categoryId ? { ...c, subs: c.subs.map((x) => (ids.includes(x.id) ? { ...x, hidden: true } : x)) } : c)) }, ids, true) }), t("sub")); },
            onRename: (id, name) => patchSubs((list) => list.map((x) => (x.id === id ? { ...x, customName: name } : x)), name),
          }}
          add={{
            placeholder: L(lang, "Nueva subcategoría", "New subcategory"),
            onAdd: (name) => {
              const id = `s-${uid().slice(0, 8)}`;
              patchSubs((list) => [...list, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99 }], name);
              onChange(id);
              setOpen(false);
            },
          }}
        />
      ) : null}
    </>
  );
}

/** Cuotas: "Ícono y color" — a brand from the library (`sub:<id>`) or a Faro icon, plus the line's colour. */
export function BrandIconPick({ value, suggest, onChange, compact, look }: { value: string; suggest: string; onChange: (icon: string, label: string) => void; compact?: boolean; look?: Look }) {
  const { session, commit, confirm, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const lookHere: Look | undefined = look ? { ...look, onGlyph: (name) => { look.onGlyph(name); onChange(name, ""); } } : undefined;
  const off = libraryOff(session?.ledger);
  const lib = useMemo(() => libraryOf(session?.ledger), [session?.ledger]);
  const own = value === "RefreshCw" || value === "Circle" ? "" : value;
  const shown = own || suggest;
  const id = shown.startsWith("sub:") ? shown.slice(4) : "";
  // A Faro icon (or an older Lucide icon) shows in the line's colour.
  const other = !id && own ? own : "";
  const items: PickItem[] = lib.map((row) => ({ id: row[0], label: poolName(row[0], lang), mark: <SubMark id={row[0]} className="fit-brand" />, group: groupOf(row[0]) }));
  const label = id ? (id.startsWith("data:") ? L(lang, "Ícono propio", "Own icon") : poolName(id, lang)) : other ? L(lang, "Ícono de Faro", "Faro icon") : "";
  const mark = id ? <SubMark id={id} className="fit-brand" /> : other ? (look ? <LookGem color={look.color} glyph={other} /> : <Glyph name={other} />) : look ? <LookGem color={look.color} glyph="Sparkles" /> : <Sparkles />;
  return (
    <>
      <PickButton test="brand-pick" compact={compact} label={L(lang, "Ícono y color", "Icon and colour")} open={open} onOpen={() => setOpen(true)} mark={mark} text={label} placeholder={L(lang, "Elegir", "Choose")} />
      {open ? (
        <PickSheet
          test="brand-sheet"
          title={look ? L(lang, "Ícono y color", "Icon and colour") : L(lang, "Marca de la cuota", "Payment brand")}
          value={id}
          none={L(lang, "Sin marca", "No brand")}
          items={items}
          groups={SUB_GROUPS.map(([g, es, en]) => ({ id: g, label: L(lang, es, en) }))}
          onClose={() => setOpen(false)}
          onPick={(pick) => { onChange(pick ? `sub:${pick}` : "", pick ? poolName(pick, lang) : ""); setOpen(false); }}
          look={lookHere}
          onLookDone={() => setOpen(false)}
          manage={{
            word: ["ícono", "íconos", "icon", "icons"],
            onDropMany: (ids) => commit((s) => ({ ...s, subIconsOff: [...new Set([...(s.subIconsOff ?? []), ...ids.filter((x) => lib.some((r) => r[0] === x))])] }), L(lang, "Íconos", "Icons")),
            onRestore: off.size ? () => confirm({
              title: L(lang, "Restaurar de fábrica", "Restore defaults"),
              body: L(lang, "Vuelven todos los íconos borrados. No se cambia ninguna cuota.", "Every deleted icon comes back. No payment is changed."),
              yes: L(lang, "Restaurar", "Restore"),
              run: () => commit((s) => restoreLibrary(s), L(lang, "Íconos", "Icons")),
            }) : undefined,
          }}
        />
      ) : null}
    </>
  );
}

/** The other books: the line's icon and colour as a compact mark beside Concepto; the sheet is colour + Faro icons. */
export function LookPick({ look }: { look: Look }) {
  const { lang } = useFaro();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickButton test="look-pick" compact label={L(lang, "Ícono y color", "Icon and colour")} open={open} onOpen={() => setOpen(true)} mark={<LookGem color={look.color} glyph={look.glyph && look.glyph !== "Circle" ? look.glyph : undefined} />} text="" placeholder="" />
      {open ? <PickSheet test="look-sheet" title={L(lang, "Ícono y color", "Icon and colour")} value="" items={[]} onPick={() => {}} onClose={() => setOpen(false)} look={look} onLookDone={() => setOpen(false)} /> : null}
    </>
  );
}

/* ---------- Frecuencia with "Otro…" (1.3.100) ---------- */
const UNITS: [FreqUnit, string, string][] = [["d", "días", "days"], ["w", "semanas", "weeks"], ["m", "meses", "months"], ["y", "años", "years"]];

/** The frequency sheet: presets, the user's saved ones (removable in edit state) and "Otro…" with a "Cada N …" setter. */
export function FreqSheet({ value, presets, onPick, onClose, startSetter }: { value: string; presets: string[]; onPick: (token: string) => void; onClose: () => void; startSetter?: boolean }) {
  const { lang, session, commit, confirm } = useFaro();
  const [setter, setSetter] = useState(!!startSetter);
  const [editing, setEditing] = useState(false);
  const iv = intervalOf(value);
  const [n, setN] = useState(() => (iv ? String(iv.unit === "d" && iv.every % 7 === 0 && value.endsWith("w") ? iv.every / 7 : iv.every) : "2"));
  const [unit, setUnit] = useState<FreqUnit>(() => (value.endsWith("w") ? "w" : iv?.unit ?? "w"));
  const [err, setErr] = useState(false);
  useLayer(true, onClose);
  // From the list, the setter is its own Back step; opened straight on "Otro…" it shares the sheet's.
  useLayer(setter && !startSetter, () => setSetter(false));
  // The edit state is its own Back step too (same as the pencil in the other sheets).
  useLayer(editing, () => setEditing(false));
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const mine = customFreqsFor(session?.ledger, presets);
  const extra = value && intervalOf(value) && ![...presets, ...mine].some((c) => sameCadence(c, value)) ? [value] : [];
  const save = () => {
    const token = customToken(Number(n), unit);
    if (!token) { setErr(true); return; }
    if (!presets.some((c) => sameCadence(c, token))) commit((s) => rememberFreq(s, token), cadenceLabel(token, lang));
    onPick(presets.find((c) => sameCadence(c, token)) ?? token);
  };
  const opt = (c: string, own = false) => (
    <button key={c} type="button" className={`fit-opt is-freq${own ? " is-own" : ""}`} data-id={c} aria-pressed={!editing && sameCadence(value, c)}
      aria-label={editing && own ? `${L(lang, "Borrar", "Delete")} ${cadenceLabel(c, lang)}` : undefined}
      onClick={() => {
        if (!editing) { onPick(c); return; }
        if (!own) return;
        confirm({
          title: L(lang, "Borrar frecuencia", "Delete frequency"),
          body: L(lang, `${cadenceLabel(c, lang)} sale de la lista. Las líneas que ya la usan la conservan.`, `${cadenceLabel(c, lang)} leaves the list. Lines already using it keep it.`),
          yes: L(lang, "Borrar", "Delete"),
          run: () => commit((s) => dropFreq(s, c), cadenceLabel(c, lang)),
        });
      }}>
      <span>{cadenceLabel(c, lang)}</span>
      {editing && own ? <i className="fit-opt-x" aria-hidden><X /></i> : null}
    </button>
  );
  const body = (
    <div className="fit-scrim" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`fit-sheet is-freq${editing ? " is-editing" : ""}`} role="dialog" aria-modal="true" aria-label={L(lang, "Frecuencia", "Frequency")} data-test="freq-sheet" onPointerDown={(e) => e.stopPropagation()}>
        <div className="fit-sheet-head">
          <strong>{setter ? L(lang, "Otra frecuencia", "Other frequency") : L(lang, "Frecuencia", "Frequency")}</strong>
          {!setter && mine.length ? (
            <button type="button" className="fit-sheet-tool" data-test="freq-edit" aria-pressed={editing} aria-label={editing ? L(lang, "Listo", "Done") : L(lang, "Editar lista", "Edit list")} onClick={() => setEditing((v) => !v)}>{editing ? <Check /> : <Pencil />}</button>
          ) : null}
          <button type="button" className="fit-sheet-tool" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        {setter ? (
          <div className="freq-set" data-test="freq-set">
            <div className="freq-set-row">
              <span>{L(lang, "Cada", "Every")}</span>
              <input className="field num" inputMode="numeric" aria-label={L(lang, "Cuántos", "How many")} value={n} autoFocus onChange={(e) => { setN(e.target.value.replace(/\D/g, "").slice(0, 3)); setErr(false); }} />
              <em>1–{FREQ_BOUNDS[unit]}</em>
              <p className={`freq-set-read${err ? " bad" : ""}`}>{err ? L(lang, "Fuera de rango", "Out of range") : customToken(Number(n), unit) ? cadenceLabel(customToken(Number(n), unit), lang) : "—"}</p>
            </div>
            <div className="freq-set-units" role="group" aria-label={L(lang, "Unidad", "Unit")}>
              {UNITS.map(([u, es, en]) => <button key={u} type="button" data-unit={u} aria-pressed={unit === u} onClick={() => { setUnit(u); setErr(false); }}>{L(lang, es, en)}</button>)}
            </div>
            
            <div className="fit-actions freq-set-actions">
              <button type="button" className="btn secondary" onClick={() => (startSetter ? onClose() : setSetter(false))}>{L(lang, "Cancelar", "Cancel")}</button>
              <button type="button" className="btn" data-test="freq-save" onClick={save}>{L(lang, "Guardar", "Save")}</button>
            </div>
          </div>
        ) : (
          <div className="fit-sheet-list">
            <div className="fit-grid">{[...presets, ...extra].map((c) => opt(c))}</div>
            {mine.length ? (
              <section className="fit-group">
                <p className="fit-kicker">{L(lang, "Tus frecuencias", "Your frequencies")}</p>
                <div className="fit-grid">{mine.map((c) => opt(c, true))}</div>
              </section>
            ) : null}
            {editing ? null : (
              <div className="fit-grid">
                <button type="button" className="fit-opt is-other" data-test="freq-other" onClick={() => setSetter(true)}><span className="fit-opt-mark" aria-hidden><Plus /></span><span>{L(lang, "Otro…", "Other…")}</span></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  return createPortal(body, document.body);
}

/** The Frecuencia field of the line editors: a field-like button with the chosen rhythm; opens FreqSheet. */
export function FreqPick({ value, presets, onChange }: { value: string; presets: string[]; onChange: (token: string) => void }) {
  const { lang } = useFaro();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickButton test="freq-pick" open={open} onOpen={() => setOpen(true)} mark={<Repeat2 />} text={cadenceLabel(value, lang)} placeholder={L(lang, "Elegir", "Choose")} />
      {open ? <FreqSheet value={value} presets={presets} onClose={() => setOpen(false)} onPick={(c) => { onChange(c); setOpen(false); }} /> : null}
    </>
  );
}
