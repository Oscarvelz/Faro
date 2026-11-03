/**
 * Faro manual — link map.
 *
 * [[Term]] in any topic text becomes a tappable link. A term points at a TOPIC; the topic's own
 * `go` ({screen, anchor, fold, lens}) says where that is. So a place is described once, in topics.ts,
 * and both "Ir allí" and every [[Term]] that names it land on the same element.
 *
 * Both languages map to the same topic. Matching is exact (case-sensitive), longest first.
 */
import { findTopic, type Go } from "./topics";

export const LINKS: Record<string, string> = {
  // Screens
  Central: "central", Desk: "central",
  Libros: "libros", Books: "libros",
  Estudio: "estudio", Study: "estudio",
  Asesor: "asesor", Advisor: "asesor",
  Ingresos: "ingresos", Income: "ingresos",
  Cuotas: "cuotas", Plans: "cuotas",
  "Mesa de cambio": "mesa-cambio", "Exchange desk": "mesa-cambio",
  Calendario: "calendario", Calendar: "calendario",
  Vista: "vista", View: "vista",
  // Central
  Pagos: "pagos", Payments: "pagos",
  "Semáforo de deuda": "semaforo", "Debt signal": "semaforo",
  "Oportunidad de mejora": "oportunidad", "Room to improve": "oportunidad",
  "Traer recurrentes": "traer-recurrentes", "Bring recurring items": "traer-recurrentes",
  "Si apartas": "si-apartas", "If you set aside": "si-apartas",
  Cuentas: "cuentas", Accounts: "cuentas",
  "Moneda de vista": "moneda-vista", "View currency": "moneda-vista",
  "Punto de sincronización": "sync", "Sync dot": "sync",
  Deshacer: "deshacer", Undo: "deshacer",
  // Books
  "Intacto, usado y queda": "bote", "Untouched, used and left": "bote",
  "Reportar lo usado": "reportar-usado", "Report what you used": "reportar-usado",
  Tiendas: "tiendas", Stores: "tiendas",
  "Categorías de compra": "categorias-compra", "Purchase categories": "categorias-compra",
  "Ícono y color": "icono-color", "Icon and colour": "icono-color",
  "Editor de líneas": "editor", "Line editor": "editor",
  "Agregar de la lista": "f-lista", "Add from the list": "f-lista",
  Recurrente: "f-recurrente", Recurring: "f-recurrente",
  "Saldo que aún debes": "f-saldo-deuda", "Balance still owed": "f-saldo-deuda",
  "Fórmula en el monto": "formula-monto", "Formula in the amount": "formula-monto",
  // Savings
  Ahorros: "ahorros-todas", Savings: "ahorros-todas",
  Meta: "meta", Goal: "meta",
  Retiro: "retiro", Retirement: "retiro",
  Emergencia: "emergencia", Emergency: "emergencia",
  // Study
  "Cinco chequeos": "pilares", "Five checks": "pilares",
  "Próximos pagos": "proximos-pagos", "Payments ahead": "proximos-pagos",
  "Ahorro y colchón": "colchon", "Savings and cushion": "colchon",
  "Colchón real": "kn-cushion", "Real cushion": "kn-cushion",
  // Exchange desk
  "Tasa de cambio": "tasa", "Exchange rate": "tasa",
  Calculadora: "calculadora", Calculator: "calculadora",
  Guardados: "guardados", Saved: "guardados",
  // Settings
  Tema: "temas", Theme: "temas",
  Estructura: "estructura", Structure: "estructura",
  Reglas: "reglas", Rules: "reglas",
  "Meta de ahorro": "meta-ahorro", "Savings goal": "meta-ahorro",
  "Meses de colchón": "meses-colchon", "Months of cushion": "meses-colchon",
  "Atajos de + y −": "atajos-mas-menos", "+/− shortcuts": "atajos-mas-menos",
  "Copias de seguridad": "copias", Backups: "copias",
  "Manual de uso": "manual", "User manual": "manual",
  Ajustes: "ajustes", Settings: "ajustes",
};

/**
 * Feature names that are NOT written as [[links]] but should read as names (gentle emphasis:
 * weight 600, no underline). Matched as whole words in bubble and manual text.
 */
export const NAME_TERMS: string[] = [
  "Tengo", "Gastaré", "Queda", "Usado", "Tasa", "Cobros", "Me deben", "Debo", "Bono", "Archivo", "Acumulado", "Promedio",
  "Este periodo", "Desplegar todo", "Ir allí", "Más en el manual", "Poner en el campo", "Aplicar al plan", "Copiar plan",
  "Guardar copia ahora", "Restaurar", "Entendido", "Fijos", "Variables", "Compras",
  "Have", "Spending", "Left", "Used", "Rate", "Collections", "Owed to me", "I owe", "Payment", "Archive", "Accumulated",
  "Average", "This period", "Unfold all", "Go there", "More in the manual", "Put in the field", "Apply to the plan", "Copy plan",
  "Save a copy now", "Restore", "Got it", "Fixed", "Variable", "Shopping",
];

const TERMS_LONGEST_FIRST = Object.keys(LINKS).sort((a, b) => b.length - a.length);
export function linkTerms(): readonly string[] {
  return TERMS_LONGEST_FIRST;
}

/** Where a [[Term]] goes: the `go` of the topic it names. */
export function linkDest(term: string): { topic: string; go: Go } | null {
  const id = LINKS[term];
  const topic = id ? findTopic(id) : null;
  return topic?.go ? { topic: topic.id, go: topic.go } : null;
}

/**
 * Anchor registry: every data-anchor the topics point at, and where Phase 2 adds it.
 * (Documentation + test fixture: the playwright test asserts each one exists on its screen.)
 */
export const ANCHORS: Record<string, { screen: string; where: string }> = {
  "top-brand": { screen: "any", where: "shell.tsx .brand-mini (top-row)" },
  "top-sync": { screen: "any", where: "shell.tsx i.sync-dot" },
  "top-undo": { screen: "any", where: "shell.tsx .hist-nav" },
  "top-export": { screen: "any", where: "export-panel.tsx trigger button" },
  "top-theme": { screen: "any", where: "shell.tsx first .theme-toggle (sun/moon)" },
  "top-view": { screen: "any", where: "shell.tsx .view-anchor" },
  "top-search": { screen: "any", where: "shell.tsx .search-anchor" },
  "top-cal": { screen: "any", where: "shell.tsx .cal-anchor (calendar, inside .desk-grid)" },
  "top-coin": { screen: "any", where: "shell.tsx .currency-bubble" },
  "top-gear": { screen: "any", where: "shell.tsx .phone-gear" },
  "nav-dock": { screen: "any", where: "shell.tsx DockNav <nav.dock> (phone) / .rail (wide)" },
  "desk-left": { screen: "desk", where: "screens.tsx .desk-bar > span:nth-child(1)" },
  "desk-used": { screen: "desk", where: "screens.tsx .desk-bar > span:nth-child(2)" },
  "desk-rate": { screen: "desk", where: "screens.tsx .desk-bar > button" },
  "lens-have": { screen: "desk", where: "screens.tsx .lens.is-have (reuse data-lens)" },
  "lens-spend": { screen: "desk", where: "screens.tsx .lens.is-spend" },
  "lens-debt": { screen: "desk", where: "screens.tsx .lens.is-debt" },
  "desk-plus": { screen: "desk", where: "screens.tsx .lens-corner.is-plus" },
  "desk-minus": { screen: "desk", where: "screens.tsx .lens-corner.is-minus" },
  "desk-semaforo": { screen: "desk", where: "screens.tsx .debt-lamp" },
  "desk-opportunity": { screen: "desk", where: "screens.tsx p.desk-kicker" },
  "desk-list": { screen: "desk", where: "screens.tsx section.card.span-all" },
  "desk-start": { screen: "desk", where: "screens.tsx row with desk.first / desk.copy" },
  "desk-save": { screen: "desk", where: "screens.tsx section.save-band" },
  "desk-pockets": { screen: "desk", where: "screens.tsx .save-segs" },
  "desk-accounts": { screen: "desk", where: "screens.tsx button.bank-tap" },
  "desk-aside": { screen: "desk", where: "screens.tsx block with vault.aside" },
  lever: { screen: "desk|vault", where: "screens.tsx VaultLever root (+ faro-open listener)" },
  cobros: { screen: "cobros", where: "screens.tsx Cobros root section" },
  "cobros-in": { screen: "cobros", where: "screens.tsx Cobros side=in .cobro-swap" },
  "cobros-file": { screen: "cobros", where: "screens.tsx Cobros .cobro-file-head (in)" },
  "cobros-out": { screen: "cobros", where: "screens.tsx DueOwe .cobro-swap" },
  "cobros-out-file": { screen: "cobros", where: "screens.tsx DueOwe .cobro-file-head" },
  "books-tabs": { screen: "books", where: "shell.tsx .seg (Libros tabs)" },
  "book-card": { screen: "books", where: "screens.tsx LinesBlock section.card" },
  "book-filter": { screen: "books", where: "screens.tsx .filter-btn" },
  "book-add": { screen: "books", where: "screens.tsx .plus-mark" },
  "book-span": { screen: "books", where: "screens.tsx SpanCut .span-cut (+ faro-open listener)" },
  "book-pot": { screen: "books", where: "screens.tsx PotReport .pot" },
  "shops-gear": { screen: "shops", where: "screens.tsx .shop-gear (+ faro-open opens it)" },
  "vault-tabs": { screen: "vault", where: "shell.tsx .vault-bar" },
  "vault-sort": { screen: "vault", where: "screens.tsx button.vault-lamp" },
  "stats-tools": { screen: "stats", where: "charts.tsx StatFoldProvider top tools row" },
  "kn-*": { screen: "stats", where: "study2.tsx KeyNumbers row per insight id (data-anchor=`kn-${id}`)" },
  "pulse|health|pace|agenda|waffle|where|sankey|rule|plan|movers|time|cushion|owed|numeros": {
    screen: "stats",
    where: "charts.tsx StatFold root: data-anchor={id} data-fold={id}",
  },
  coach: { screen: "advice", where: "panorama.tsx CoachHero section.coach" },
  "coach-steps": { screen: "advice", where: "panorama.tsx ol.coach-steps" },
  "coach-pillars": { screen: "advice", where: "panorama.tsx .coach .pano-pillars" },
  "coach-words": { screen: "advice", where: "panorama.tsx button.coach-words (+ faro-open)" },
  "advice-unfold": { screen: "advice", where: "screens.tsx label.unfold-all" },
  "advice-tower": { screen: "advice", where: "screens.tsx section.advice-hero-2" },
  "advice-tiles": { screen: "advice", where: "screens.tsx .a2-tiles" },
  "advice-findings": { screen: "advice", where: "screens.tsx first finding card" },
  "advice-short": { screen: "advice", where: "screens.tsx article.advice-card.is-short (+ faro-open)" },
  "advice-medium": { screen: "advice", where: "screens.tsx article.advice-card.is-medium (+ faro-open)" },
  "advice-long": { screen: "advice", where: "screens.tsx article.advice-card.is-long (+ faro-open)" },
  "advice-plan": { screen: "advice", where: "screens.tsx section.advice-card.is-start (+ faro-open 'plan')" },
  "advice-sim": { screen: "advice", where: "screens.tsx .advice-sim" },
  "tools-rate": { screen: "tools", where: "instruments.tsx section.rate-plate (+ faro-open)" },
  "tools-convert": { screen: "tools", where: "instruments.tsx converter card" },
  "tools-calc": { screen: "tools", where: "instruments.tsx .calc-launch" },
  "tools-slips": { screen: "tools", where: "instruments.tsx slips card" },
  "aj-manual": { screen: "settings", where: "screens.tsx Settings new row 'Manual de uso'" },
  "aj-lang|aj-theme|aj-structure|aj-keys|aj-gestures|aj-backup|aj-account": {
    screen: "settings",
    where: "screens.tsx Settings <Fold id=…> section.card (lang, theme, structure, rate, keys, gestures, backup, account)",
  },
  "aj-tree": { screen: "settings", where: "screens.tsx StructureTree root" },
  "aj-catalog": { screen: "settings", where: "screens.tsx CatalogEditor root" },
  "aj-rules|aj-goal|aj-green|aj-yellow|aj-months|aj-rate": { screen: "settings", where: "screens.tsx Fold 'rate' and each label" },
  "aj-activity": { screen: "settings", where: "screens.tsx h2 Actividad" },
  "aj-lock": { screen: "settings", where: "gates.tsx UserButton lock block" },
};
