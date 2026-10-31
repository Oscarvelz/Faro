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

function mapSubs(cat: Category, ids: string[], hidden: boolean): Category {
  return {
    ...cat,
    subs: cat.subs.map((s) => (ids.some((id) => s.id.endsWith(`.${id}`)) ? { ...s, hidden } : s)),
  };
}

export function applyTemplate(structure: Structure, id: TemplateId): Structure {
  let categories = structure.categories.map((c) => ({ ...c, subs: c.subs.map((s) => ({ ...s })) }));
  const touch = (catId: string, fn: (c: Category) => Category) => {
    categories = categories.map((c) => (c.id === catId ? fn(c) : c));
  };
  if (id === "soltero") {
    touch("f-familia", (c) => mapSubs(c, ["colegiaturas", "hijo1", "hijo2", "formativas", "funeraria"], true));
  }
  if (id === "familia") {
    touch("f-familia", (c) => ({ ...c, hidden: false, subs: c.subs.map((s) => ({ ...s, hidden: false })) }));
    touch("v-familia", (c) => ({ ...c, hidden: false, subs: c.subs.map((s) => ({ ...s, hidden: false })) }));
  }
  if (id === "estudiante") {
    touch("f-casa", (c) => mapSubs(c, ["hipoteca", "predial"], true));
    touch("f-seguros", (c) => mapSubs(c, ["vida"], true));
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
  return next;
}

export function templateBlurb(id: TemplateId, lang: Lang): string {
  const copy: Record<TemplateId, { es: string; en: string }> = {
    soltero: {
      es: "Oculta colegiaturas, hijos, formativas y funeraria. No borra movimientos.",
      en: "Hides tuition, children, activities, and funeral. It does not delete entries.",
    },
    familia: {
      es: "Vuelve a mostrar toda la rama de familia, fija y variable.",
      en: "Shows the full family branch again, fixed and variable.",
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
