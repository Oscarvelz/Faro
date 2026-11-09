import { BCN_AS_OF, BCN_RATE_E4 } from "./money";
import type {
  CatalogItem,
  Category,
  Lang,
  LedgerState,
  Named,
  PurchaseCat,
  Settings,
  Structure,
  StructureBase,
  Sub,
  TemplateId,
  ThemeId,
} from "./types";
import { DEFAULT_SHORTCUTS } from "./types";

type Lab = Record<string, { es: string; en: string }>;

export const LABELS: Lab = {
  "f.casa": { es: "Casa", en: "Home" },
  "f.casa.renta": { es: "Renta", en: "Rent" },
  "f.casa.hipoteca": { es: "Hipoteca", en: "Mortgage" },
  "f.casa.servicios": { es: "Servicios", en: "Utilities" },
  "f.casa.gas": { es: "Gas", en: "Gas" },
  "f.casa.youtube": { es: "Youtube", en: "YouTube" },
  "f.casa.celular": { es: "Celular", en: "Mobile" },
  "f.casa.telefono": { es: "Teléfono fijo", en: "Landline" },
  "f.casa.agua": { es: "Agua", en: "Water" },
  "f.casa.predial": { es: "Predial", en: "Property tax" },
  "f.casa.internet": { es: "Internet", en: "Internet" },
  "f.casa.otros": { es: "Otros", en: "Other" },
  "f.transporte": { es: "Transporte", en: "Transport" },
  "f.transporte.gasolina": { es: "Gasolina", en: "Fuel" },
  "f.transporte.publico": { es: "Público", en: "Transit" },
  "f.transporte.electrico": { es: "Eléctrico", en: "Electric" },
  "f.familia": { es: "Familia", en: "Family" },
  "f.familia.colegiaturas": { es: "Colegiaturas", en: "Tuition" },
  "f.familia.hijo1": { es: "Hijo 1", en: "Child 1" },
  "f.familia.hijo2": { es: "Hijo 2", en: "Child 2" },
  "f.familia.otros": { es: "Otros", en: "Other" },
  "f.familia.formativas": { es: "Formativas", en: "Activities" },
  "f.familia.funeraria": { es: "Funeraria", en: "Funeral" },
  "f.seguros": { es: "Seguros", en: "Insurance" },
  "f.seguros.auto": { es: "Auto", en: "Auto" },
  "f.seguros.vida": { es: "Vida", en: "Life" },
  "f.seguros.medico": { es: "Médico", en: "Medical" },
  "f.ahorro": { es: "Ahorro", en: "Savings" },
  "f.ahorro.meta": { es: "Meta", en: "Goal" },
  "f.ahorro.retiro": { es: "Retiro", en: "Retirement" },
  "f.ahorro.emergencia": { es: "Emergencia", en: "Emergency" },
  "f.remesas": { es: "Remesas", en: "Remittances" },
  "f.remesas.envios": { es: "Envíos", en: "Transfers" },
  "f.creditos": { es: "Créditos", en: "Credit" },
  "f.creditos.tarjetas": { es: "Tarjetas", en: "Cards" },
  "f.creditos.automotriz": { es: "Automotriz", en: "Auto loan" },
  "f.creditos.consumo": { es: "Consumo", en: "Consumer" },
  "f.creditos.personal": { es: "Personal", en: "Personal" },
  "f.alimentos": { es: "Alimentos", en: "Food" },
  "f.alimentos.despensa": { es: "Despensa", en: "Groceries" },
  "f.alimentos.higiene": { es: "Higiene", en: "Toiletries" },
  "f.mascotas": { es: "Mascotas", en: "Pets" },
  "f.mascotas.alimento": { es: "Alimento", en: "Food" },
  "f.mascotas.otros": { es: "Otros", en: "Other" },
  "f.negocio": { es: "Negocio", en: "Business" },
  "f.negocio.local": { es: "Renta local", en: "Shop rent" },
  "f.negocio.inventario": { es: "Inventario", en: "Inventory" },
  "f.negocio.impuestos": { es: "Impuestos", en: "Taxes" },
  "f.negocio.nomina": { es: "Nómina", en: "Payroll" },
  "v.casa": { es: "Casa", en: "Home" },
  "v.casa.reparaciones": { es: "Reparaciones", en: "Repairs" },
  "v.casa.mantenimiento": { es: "Mantenimiento", en: "Maintenance" },
  "v.casa.mejora": { es: "Mejora", en: "Improvement" },
  "v.transporte": { es: "Transporte", en: "Transport" },
  "v.transporte.mantenimiento": { es: "Mantenimiento", en: "Maintenance" },
  "v.transporte.estacionamiento": { es: "Estacionamiento", en: "Parking" },
  "v.transporte.taxi": { es: "Taxi", en: "Taxi" },
  "v.transporte.tenencia": { es: "Tenencia", en: "Registration" },
  "v.mascotas": { es: "Mascotas", en: "Pets" },
  "v.mascotas.vet": { es: "Veterinario", en: "Vet" },
  "v.mascotas.juguetes": { es: "Juguetes", en: "Toys" },
  "v.entretenimiento": { es: "Entretenimiento", en: "Entertainment" },
  "v.entretenimiento.eventos": { es: "Eventos", en: "Events" },
  "v.entretenimiento.restaurantes": { es: "Restaurantes", en: "Restaurants" },
  "v.entretenimiento.fiestas": { es: "Fiestas", en: "Parties" },
  "v.entretenimiento.xuper": { es: "XUPER TV", en: "XUPER TV" },
  "v.entretenimiento.tv": { es: "TV paga", en: "Paid TV" },
  "v.viajes": { es: "Viajes", en: "Travel" },
  "v.viajes.hotel": { es: "Hotel", en: "Hotel" },
  "v.viajes.transporte": { es: "Transporte", en: "Transport" },
  "v.viajes.comidas": { es: "Comidas", en: "Meals" },
  "v.viajes.regalos": { es: "Regalos", en: "Gifts" },
  "v.viajes.entretenimiento": { es: "Entretenimiento", en: "Entertainment" },
  "v.personales": { es: "Personales", en: "Personal" },
  "v.personales.ropa": { es: "Ropa", en: "Clothes" },
  "v.personales.salud": { es: "Salud", en: "Health" },
  "v.personales.belleza": { es: "Belleza", en: "Grooming" },
  "v.personales.lavanderia": { es: "Lavandería", en: "Laundry" },
  "v.personales.otros": { es: "Otros", en: "Other" },
  "v.familia": { es: "Familia", en: "Family" },
  "v.familia.libros": { es: "Libros", en: "Books" },
  "v.familia.juguetes": { es: "Juguetes", en: "Toys" },
  "v.hormiga": { es: "Gastos hormiga", en: "Leak spending" },
  "v.hormiga.cafe": { es: "Cigarros / café", en: "Cigarettes / coffee" },
  "v.hormiga.dulces": { es: "Bebidas / dulces", en: "Drinks / sweets" },
  "v.remesas": { es: "Remesas", en: "Remittances" },
  "v.remesas.envios": { es: "Envíos", en: "Transfers" },
  "v.estudio": { es: "Estudio", en: "Study" },
  "v.estudio.matricula": { es: "Matrícula", en: "Tuition" },
  "v.estudio.materiales": { es: "Materiales", en: "Materials" },
  "v.estudio.herramientas": { es: "Herramientas", en: "Tools" },
  "p.ropa": { es: "Ropa", en: "Clothes" },
  "p.tech": { es: "Tecnología", en: "Technology" },
  "p.gadget": { es: "Gadgets", en: "Gadgets" },
  "p.hogar": { es: "Hogar", en: "Home" },
  "p.otros": { es: "Otros", en: "Other" },
  "p.ia": { es: "Inteligencia artificial", en: "Artificial intelligence" },
  "c.temu": { es: "Temu", en: "Temu" },
  "c.shein": { es: "Shein", en: "Shein" },
  "c.ebay": { es: "eBay", en: "eBay" },
  "c.aliexpress": { es: "AliExpress", en: "AliExpress" },
  "c.amazon": { es: "Amazon", en: "Amazon" },
  "c.grok": { es: "Grok", en: "Grok" },
  "c.gemini": { es: "Gemini", en: "Gemini" },
  "c.chatgpt": { es: "ChatGPT", en: "ChatGPT" },
  "c.claude": { es: "Claude", en: "Claude" },
  "c.meta": { es: "Meta AI", en: "Meta AI" },
  "c.metropcs": { es: "MetroPCS", en: "MetroPCS" },
  "c.styling": { es: "AI Styling", en: "AI Styling" },
  "c.googleone": { es: "Google One", en: "Google One" },
  "c.eleven": { es: "ElevenReader", en: "ElevenReader" },
  "c.groksub": { es: "Grok", en: "Grok" },
};

export function displayName(item: { nameKey: string; customName: string }, lang: Lang): string {
  const custom = item.customName.trim();
  if (custom) return custom;
  return LABELS[item.nameKey]?.[lang] ?? item.nameKey;
}

function sub(key: string, order: number): Sub {
  return { id: key, nameKey: key, customName: "", icon: "Circle", hidden: false, order };
}

function category(
  id: string,
  group: "fixed" | "variable",
  role: string,
  icon: string,
  order: number,
  subs: string[],
): Category {
  const prefix = group === "fixed" ? "f" : "v";
  return {
    id,
    nameKey: `${prefix}.${id}`,
    customName: "",
    icon,
    hidden: false,
    order,
    group,
    role,
    subs: subs.map((s, i) => sub(`${prefix}.${id}.${s}`, i)),
  };
}

function purchase(id: string, icon: string, order: number): PurchaseCat {
  return { id, nameKey: `p.${id}`, customName: "", icon, hidden: false, order };
}

function item(
  id: string,
  kind: CatalogItem["kind"],
  icon: string,
  order: number,
  urlTemplate = "",
): CatalogItem {
  return { id, nameKey: `c.${id}`, customName: "", icon, hidden: false, order, kind, urlTemplate };
}

export function defaultStructure(): Structure {
  return {
    base: "completa",
    categories: [
      category("casa", "fixed", "housing", "Home", 0, ["renta", "hipoteca", "servicios", "gas", "youtube", "celular", "telefono", "agua", "predial", "internet", "otros"]),
      category("transporte", "fixed", "transport", "Car", 1, ["gasolina", "publico", "electrico"]),
      category("familia", "fixed", "family", "Users", 2, ["colegiaturas", "hijo1", "hijo2", "otros", "formativas", "funeraria"]),
      category("seguros", "fixed", "insurance", "Shield", 3, ["auto", "vida", "medico"]),
      category("ahorro", "fixed", "savings", "PiggyBank", 4, ["meta", "retiro", "emergencia"]),
      category("remesas", "fixed", "remittance", "Send", 5, ["envios"]),
      category("creditos", "fixed", "debt", "CreditCard", 6, ["tarjetas", "automotriz", "consumo", "personal"]),
      category("alimentos", "fixed", "food", "Utensils", 7, ["despensa", "higiene"]),
      category("mascotas", "fixed", "pets", "PawPrint", 8, ["alimento", "otros"]),
      category("casa", "variable", "housing", "Home", 0, ["reparaciones", "mantenimiento", "mejora"]),
      category("transporte", "variable", "transport", "Car", 1, ["mantenimiento", "estacionamiento", "taxi", "tenencia"]),
      category("mascotas", "variable", "pets", "PawPrint", 2, ["vet", "juguetes"]),
      category("entretenimiento", "variable", "leisure", "Film", 3, ["eventos", "restaurantes", "fiestas", "xuper", "tv"]),
      category("viajes", "variable", "travel", "Plane", 4, ["hotel", "transporte", "comidas", "regalos", "entretenimiento"]),
      category("personales", "variable", "personal", "Shirt", 5, ["ropa", "salud", "belleza", "lavanderia", "otros"]),
      category("familia", "variable", "family", "Users", 6, ["libros", "juguetes"]),
      category("hormiga", "variable", "petty", "Coffee", 7, ["cafe", "dulces"]),
      category("remesas", "variable", "remittance", "Send", 8, ["envios"]),
    ].map((c, i) => ({ ...c, id: `${c.group === "fixed" ? "f" : "v"}-${c.id}`, order: i })),
    purchases: [
      purchase("ropa", "Shirt", 0),
      purchase("tech", "Laptop", 1),
      purchase("gadget", "Smartphone", 2),
      purchase("hogar", "Home", 3),
      purchase("otros", "Package", 4),
      purchase("ia", "Bot", 5),
    ],
    catalog: [
      item("temu", "store", "brand:temu", 0, "https://www.temu.com/search_result.html?search_key={code}"),
      item("shein", "store", "brand:shein", 1, "https://us.shein.com/pdsearch/{code}/"),
      item("ebay", "store", "brand:ebay", 2, "https://www.ebay.com/itm/{code}"),
      item("aliexpress", "store", "brand:aliexpress", 3, "https://www.aliexpress.com/item/{code}.html"),
      item("amazon", "store", "brand:amazon", 4, "https://www.amazon.com/dp/{code}"),
      item("grok", "ai", "brand:grok", 0, "https://grok.com"),
      item("gemini", "ai", "brand:gemini", 1, "https://gemini.google.com"),
      item("chatgpt", "ai", "brand:chatgpt", 2, "https://chatgpt.com"),
      item("claude", "ai", "brand:claude", 3, "https://claude.ai"),
      item("meta", "ai", "brand:meta", 4, "https://www.meta.ai"),
      item("metropcs", "sub", "Smartphone", 0),
      item("styling", "sub", "Palette", 1),
      item("googleone", "sub", "Cloud", 2, "https://one.google.com"),
      item("eleven", "sub", "AudioLines", 3),
      item("groksub", "sub", "brand:grok", 4, "https://grok.com"),
    ],
  };
}

/** Default categories missing from a ledger (by id), e.g. to put back what the user deleted. */
export function missingDefaults(structure: Structure): Category[] {
  const have = new Set(structure.categories.map((c) => c.id));
  return defaultStructure().categories.filter((c) => !have.has(c.id));
}

/** Puts every missing default category back (at the end of its book); never touches the user's own ones or any line. */
export function restoreDefaultCategories(state: LedgerState): LedgerState {
  const add = missingDefaults(state.structure);
  if (!add.length) return state;
  const next = [...state.structure.categories];
  for (const c of add) next.push({ ...c, order: next.filter((x) => x.group === c.group).length });
  return { ...state, structure: { ...state.structure, categories: next } };
}

/** 1.3.86: Remesas (fixed and variable) added once to ledgers made before it existed. The "remesas" seed flag keeps a deleted one deleted. */
export function withRemesas(state: LedgerState): { ledger: LedgerState; added: boolean } {
  const seeds = state.settings.seeds ?? [];
  if (seeds.includes("remesas")) return { ledger: state, added: false };
  const want = defaultStructure().categories.filter((c) => c.role === "remittance" && !state.structure.categories.some((x) => x.id === c.id));
  const categories = [...state.structure.categories];
  for (const c of want) categories.push({ ...c, order: categories.filter((x) => x.group === c.group).length });
  return {
    added: true,
    ledger: { ...state, structure: { ...state.structure, categories }, settings: { ...state.settings, seeds: [...seeds, "remesas"] }, revision: state.revision + 1, updatedAt: new Date().toISOString() },
  };
}

export function defaultSettings(lang: Lang, theme: ThemeId): Settings {
  return {
    lang,
    theme,
    display: "NIO",
    rateE4: BCN_RATE_E4,
    rateSource: "BCN",
    rateAsOf: BCN_AS_OF,
    savingsGoalPct: 20,
    debtGreenPct: 30,
    debtYellowPct: 40,
    emergencyMonths: 3,
    shortcuts: { ...DEFAULT_SHORTCUTS },
    gestures: {},
    seeds: ["remesas"],
  };
}

export function createInitial(lang: Lang = "es", theme: ThemeId = "claro"): LedgerState {
  return {
    v: 1,
    structure: defaultStructure(),
    months: {},
    settings: defaultSettings(lang, theme),
    audit: [],
    revision: 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * The namer the naming surfaces (Asesor, Insights, advice) must use (contrato, regla 2):
 * a hidden category, subconcept or purchase yields NO name, so labels fall back to the line's
 * own concept or to «Otros» instead of naming what the user folded away. The line's own
 * concept is never touched — only the structure's names follow visibility.
 */
export function visibleNamer(structure: Structure, names: ReturnType<typeof makeNamer>): ReturnType<typeof makeNamer> {
  const hiddenCats = new Set(structure.categories.filter((c) => c.hidden).map((c) => c.id));
  const hiddenSubs = new Map<string, boolean>();
  for (const c of structure.categories) for (const s of c.subs) hiddenSubs.set(s.id, c.hidden || s.hidden);
  const hiddenPurchases = new Set(structure.purchases.filter((p) => p.hidden).map((p) => p.id));
  return {
    cat: (id: string) => (hiddenCats.has(id) ? "" : names.cat(id)),
    sub: (id: string) => (hiddenSubs.get(id) ? "" : names.sub(id)),
    purchase: (id: string) => (hiddenPurchases.has(id) ? "" : names.purchase(id)),
    catalog: names.catalog,
  };
}

export function makeNamer(structure: Structure, lang: Lang) {
  const cat = (id: string) => {
    const found = structure.categories.find((c) => c.id === id);
    return found ? displayName(found, lang) : "";
  };
  const subName = (id: string) => {
    for (const c of structure.categories) {
      const s = c.subs.find((x) => x.id === id);
      if (s) return displayName(s, lang);
    }
    return "";
  };
  const purchaseName = (id: string) => {
    const p = structure.purchases.find((x) => x.id === id);
    return p ? displayName(p, lang) : "";
  };
  const catalog = (id: string) => {
    const c = structure.catalog.find((x) => x.id === id);
    return c ? displayName(c, lang) : "";
  };
  return { cat, sub: subName, purchase: purchaseName, catalog };
}

function mapSubs(cat: Category, ids: string[], hidden: boolean, userVis: Record<string, boolean>): Category {
  return {
    ...cat,
    subs: cat.subs.map((s) => (ids.some((id) => s.id.endsWith(`.${id}`)) && !(s.id in userVis) ? { ...s, hidden } : s)),
  };
}

/**
 * Records visibility the user set by hand (the eyes in Estructura, the pickers' hide), by category/sub id.
 * Templates read the record and never override it: what the user hid stays hidden, what they showed stays shown.
 */
export function markUserVis(structure: Structure, ids: string[], hidden: boolean): Structure {
  if (!ids.length) return structure;
  const userVis = { ...(structure.userVis ?? {}) };
  for (const id of ids) userVis[id] = hidden;
  return { ...structure, userVis };
}

export function applyTemplate(structure: Structure, id: TemplateId): Structure {
  const userVis = structure.userVis ?? {};
  let categories = structure.categories.map((c) => ({ ...c, subs: c.subs.map((s) => ({ ...s })) }));
  const touch = (catId: string, fn: (c: Category) => Category) => {
    categories = categories.map((c) => (c.id === catId ? fn(c) : c));
  };
  if (id === "soltero") {
    touch("f-familia", (c) => mapSubs(c, ["colegiaturas", "hijo1", "hijo2", "formativas", "funeraria"], true, userVis));
    // D-6 (1.3.139): Soltero cubre la rama de familia ENTERA — la variable (libros, juguetes)
    // ya no queda visible a medias, que era el riesgo R-7 de la asesoría.
    touch("v-familia", (c) => mapSubs(c, ["libros", "juguetes"], true, userVis));
  }
  if (id === "familia") {
    const showBranch = (c: Category): Category => ({
      ...c,
      hidden: c.id in userVis ? c.hidden : false,
      subs: c.subs.map((s) => (s.id in userVis ? s : { ...s, hidden: false })),
    });
    touch("f-familia", showBranch);
    touch("v-familia", showBranch);
  }
  if (id === "estudiante") {
    touch("f-casa", (c) => mapSubs(c, ["hipoteca", "predial"], true, userVis));
    touch("f-seguros", (c) => mapSubs(c, ["vida"], true, userVis));
  }
  let next: Structure = { ...structure, categories };
  if (id === "estudiante" && !next.categories.some((c) => c.id === "v-estudio" || c.nameKey === "v.estudio")) {
    const cat = category("estudio", "variable", "study", "GraduationCap", next.categories.length, ["matricula", "materiales", "herramientas"]);
    next = { ...next, categories: [...next.categories, { ...cat, id: "v-estudio" }] };
  }
  if (id === "negocio" && !next.categories.some((c) => c.id === "f-negocio" || c.nameKey === "f.negocio")) {
    const cat = category("negocio", "fixed", "business", "Briefcase", next.categories.length, ["local", "inventario", "impuestos", "nomina"]);
    next = { ...next, categories: [...next.categories, { ...cat, id: "f-negocio" }] };
  }
  // The base is recorded in the same returned structure as the patch itself: one commit,
  // one undo — Deshacer restores the flags and the base together (asesoría §3.1).
  return { ...next, base: id };
}

const BASE_NAMES: Record<StructureBase, { es: string; en: string }> = {
  completa: { es: "Completa", en: "Complete" },
  soltero: { es: "Soltero", en: "Single" },
  familia: { es: "Familia", en: "Family" },
  estudiante: { es: "Estudiante", en: "Student" },
  negocio: { es: "Negocio", en: "Business" },
};

/** Display name of a registered base (for the status line and the selector). */
export function baseName(base: StructureBase, lang: Lang): string {
  return BASE_NAMES[base][lang];
}

/**
 * The truthful status line under the template selector (replaces the old fixed Familia note):
 * the registered base — or that none is registered — plus, when the user's hand has set
 * visibility (userVis), that those adjustments stand and the templates respect them.
 */
export function structureStatusLine(structure: Structure, lang: Lang): string {
  const hand = Object.keys(structure.userVis ?? {}).length;
  const handEs = hand === 1 ? "1 ajuste a mano" : `${hand} ajustes a mano`;
  const handEn = hand === 1 ? "1 hand adjustment" : `${hand} hand adjustments`;
  if (!structure.base) {
    if (lang === "es") return hand ? `Sin base registrada · con tus ajustes a mano (${handEs}).` : "Sin base registrada: ninguna plantilla se ha aplicado a este libro.";
    return hand ? `No base registered · with your hand adjustments (${handEn}).` : "No base registered: no template has been applied to this book.";
  }
  const name = baseName(structure.base, lang);
  if (lang === "es") return hand ? `Base: ${name} · con tus ajustes a mano (${handEs}): tu mano manda.` : `Base: ${name}${structure.base === "completa" ? " — todo visible" : ""}.`;
  return hand ? `Base: ${name} · with your hand adjustments (${handEn}): your hand wins.` : `Base: ${name}${structure.base === "completa" ? " — everything visible" : ""}.`;
}

export function templateBlurb(id: TemplateId, lang: Lang): string {
  const copy: Record<TemplateId, { es: string; en: string }> = {
    soltero: {
      es: "Oculta colegiaturas, hijos, formativas, funeraria, libros y juguetes. No borra movimientos.",
      en: "Hides tuition, children, activities, funeral, books, and toys. It does not delete entries.",
    },
    familia: {
      es: "Vuelve a mostrar la rama de familia, fija y variable. Lo que ocultaste a mano se queda oculto.",
      en: "Shows the family branch again, fixed and variable. What you hid by hand stays hidden.",
    },
    estudiante: {
      es: "Oculta hipoteca, predial y seguro de vida, y agrega Estudio si no existe.",
      en: "Hides mortgage, property tax, and life insurance, and adds Study if missing.",
    },
    negocio: {
      es: "Agrega Negocio con renta del local, inventario, impuestos y nómina, si no existe.",
      en: "Adds Business with shop rent, inventory, taxes, and payroll, if missing.",
    },
  };
  return copy[id][lang];
}

/**
 * One-line concrete example per starting point (Oscar's amendment, 2026-11-07): where a structure
 * is chosen, each option says in plain words what it actually does — never an abstract slogan.
 */
export function templateExample(id: TemplateId, lang: Lang): string {
  const copy: Record<TemplateId, { es: string; en: string }> = {
    soltero: {
      es: "Sin hijos en casa: esconde colegiaturas, hijos, funeraria y los libros y juguetes de familia.",
      en: "No kids at home: it hides tuition, children, funeral, and the family's books and toys.",
    },
    familia: {
      es: "Vuelve a mostrar toda la rama de familia: colegiaturas, hijos, libros y juguetes.",
      en: "It shows the whole family branch again: tuition, children, books and toys.",
    },
    estudiante: {
      es: "Estudias y no tienes casa propia: agrega Estudio y esconde hipoteca, predial y seguro de vida.",
      en: "You're studying and don't own a home: it adds Study and hides mortgage, property tax and life insurance.",
    },
    negocio: {
      es: "Vendes por tu cuenta: agrega Negocio con local, inventario, impuestos y nómina.",
      en: "You sell on your own: it adds Business with shop rent, inventory, taxes and payroll.",
    },
  };
  return copy[id][lang];
}

/**
 * The computed preview of applying a template to THIS ledger (asesoría §3.3, D-5): the real diff —
 * what will hide, what will show, what will be added, what the user's hand protects — with the
 * recorded-line count spoken plainly for anything about to hide. No generic blurb: if the diff is
 * empty, the preview says so and there is nothing to confirm.
 */
export function templatePreview(state: LedgerState, id: TemplateId, lang: Lang): { body: string; empty: boolean } {
  const cur = state.structure;
  const real = applyTemplate(cur, id);
  const raw = applyTemplate({ ...cur, userVis: {} }, id);
  const byId = (s: Structure) => new Map(s.categories.map((c) => [c.id, c]));
  const curCats = byId(cur);
  const realCats = byId(real);
  const rawCats = byId(raw);
  const hide: string[] = [];
  const show: string[] = [];
  const add: string[] = [];
  const kept: string[] = [];
  const hidingSubs = new Map<string, Set<string>>(); // catId -> subIds about to hide
  const hidingCats = new Set<string>();
  for (const rc of real.categories) {
    const cc = curCats.get(rc.id);
    if (!cc) {
      add.push(displayName(rc, lang));
      continue;
    }
    const rawC = rawCats.get(rc.id);
    if (cc.hidden !== rc.hidden) (rc.hidden ? hide : show).push(displayName(rc, lang));
    else if (rawC && rawC.hidden !== cc.hidden) kept.push(displayName(rc, lang));
    if (!cc.hidden && rc.hidden) hidingCats.add(rc.id);
    for (const rs of rc.subs) {
      const cs = cc.subs.find((s) => s.id === rs.id);
      if (!cs) continue;
      const rawS = rawC?.subs.find((s) => s.id === rs.id);
      if (cs.hidden !== rs.hidden) {
        (rs.hidden ? hide : show).push(displayName(rs, lang));
        if (rs.hidden) {
          const set = hidingSubs.get(rc.id) ?? new Set<string>();
          set.add(rs.id);
          hidingSubs.set(rc.id, set);
        }
      } else if (rawS && rawS.hidden !== cs.hidden) kept.push(displayName(rs, lang));
    }
  }
  const empty = !hide.length && !show.length && !add.length;
  const lines: string[] = [];
  if (empty) lines.push(lang === "es" ? "No cambiaría nada en tu estructura." : "It would change nothing in your structure.");
  if (hide.length) lines.push(lang === "es" ? `Se oculta: ${hide.join(", ")}.` : `Hides: ${hide.join(", ")}.`);
  if (show.length) lines.push(lang === "es" ? `Se muestra: ${show.join(", ")}.` : `Shows: ${show.join(", ")}.`);
  if (add.length) lines.push(lang === "es" ? `Se agrega: ${add.join(", ")}.` : `Adds: ${add.join(", ")}.`);
  // What is about to hide and holds recorded lines: the count, spoken plainly (amendment 4 —
  // changing templates never moves data; hidden lines keep counting and come back on show).
  const allLines = Object.values(state.months).flatMap((m) => m.lines);
  for (const [catId, subIds] of hidingSubs) {
    const cat = curCats.get(catId);
    if (!cat) continue;
    const n = allLines.filter((l) => subIds.has(l.subId)).length;
    if (!n) continue;
    const name = displayName(cat, lang);
    lines.push(
      lang === "es"
        ? `Tienes ${n} ${n === 1 ? "movimiento" : "movimientos"} en ${name}: seguirán contando y reaparecerán cuando vuelvas a mostrar la rama.`
        : `You have ${n} ${n === 1 ? "entry" : "entries"} in ${name}: they will keep counting and will reappear when you show the branch again.`,
    );
  }
  for (const catId of hidingCats) {
    const cat = curCats.get(catId);
    if (!cat || hidingSubs.has(catId)) continue;
    const n = allLines.filter((l) => l.categoryId === catId).length;
    if (!n) continue;
    const name = displayName(cat, lang);
    lines.push(
      lang === "es"
        ? `Tienes ${n} ${n === 1 ? "movimiento" : "movimientos"} en ${name}: seguirán contando y reaparecerán cuando vuelvas a mostrar la rama.`
        : `You have ${n} ${n === 1 ? "entry" : "entries"} in ${name}: they will keep counting and will reappear when you show the branch again.`,
    );
  }
  if (kept.length) lines.push(lang === "es" ? `Protegido por tu mano (no cambia): ${kept.join(", ")}.` : `Protected by your hand (unchanged): ${kept.join(", ")}.`);
  return { body: lines.join("\n"), empty };
}

export function moveNamed<T extends Named>(items: T[], id: string, dir: -1 | 1): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return items;
  const next = [...sorted];
  const a = next[i];
  const b = next[j];
  if (!a || !b) return items;
  next[i] = b;
  next[j] = a;
  return next.map((item, idx) => ({ ...item, order: idx }));
}

export function isLedger(x: unknown): x is LedgerState {
  if (!x || typeof x !== "object") return false;
  const o = x as Partial<LedgerState>;
  return o.v === 1 && !!o.structure && !!o.months && !!o.settings && typeof o.revision === "number";
}

/**
 * isLedgerDeep — la validación con dientes de la oleada 2 del corazón (1.3.166). isLedger solo
 * comprueba presencia; un libro con un campo corrupto (months[mk].lines = "corrupt-string") lo
 * pasaba, explotaba en el arranque y la cuarentena se negaba a apartarlo — el libro entero se
 * sustituía en silencio por uno nuevo (auditoría del corazón, C1). Esta versión comprueba, a
 * nivel de campo, las formas que los motores y el provider desreferencian de verdad: buckets con
 * `lines` como array de objetos-línea, las categorías de la estructura, los ajustes que se leen
 * al arrancar y el bloque imports. Los campos opcionales modernos NO se exigen: un libro de
 * forma vieja (sin people/imports/loans/cards/…) sigue siendo un libro válido y jamás debe ir a
 * cuarentena. Si algo separa «dañado» de «nuevo/vacío», gana siempre la preservación.
 */
const isObjD = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStrD = (v: unknown): v is string => typeof v === "string";
const isFinD = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function isLedgerDeep(x: unknown): x is LedgerState {
  if (!isLedger(x)) return false;
  const s = x as unknown as Record<string, unknown>;
  if (!isStrD(s.updatedAt)) return false;
  // months: objeto de buckets; cada bucket un objeto con lines = array de objetos-línea.
  if (!isObjD(s.months)) return false;
  for (const bucket of Object.values(s.months as Record<string, unknown>)) {
    if (!isObjD(bucket) || !Array.isArray(bucket.lines)) return false;
    for (const l of bucket.lines as unknown[]) {
      if (!isObjD(l)) return false;
      if (!isStrD(l.id) || !isStrD(l.kind) || !isStrD(l.concept) || !isStrD(l.currency)) return false;
      if (!isFinD(l.amountMinor)) return false;
    }
  }
  // structure: las categorías que nombran y ordenan todo lo demás.
  if (!isObjD(s.structure)) return false;
  const st = s.structure;
  if (!Array.isArray(st.categories)) return false;
  for (const c of st.categories as unknown[]) {
    if (!isObjD(c) || !isStrD(c.id) || !Array.isArray(c.subs)) return false;
  }
  if (st.purchases !== undefined && !Array.isArray(st.purchases)) return false;
  if (st.catalog !== undefined && !Array.isArray(st.catalog)) return false;
  // settings: los campos que el provider lee al arrancar (idioma, tema, moneda, tipo de cambio).
  if (!isObjD(s.settings)) return false;
  const set = s.settings;
  if (!isStrD(set.lang) || !isStrD(set.theme) || !isStrD(set.display)) return false;
  if (!isFinD(set.rateE4)) return false;
  // audit e imports: si están, tienen que tener su forma (su ausencia es forma vieja, válida).
  if (s.audit !== undefined && !Array.isArray(s.audit)) return false;
  if (s.imports !== undefined) {
    if (!isObjD(s.imports)) return false;
    if (!Array.isArray(s.imports.sources) || !Array.isArray(s.imports.rules) || !isObjD(s.imports.maps)) return false;
  }
  return true;
}
