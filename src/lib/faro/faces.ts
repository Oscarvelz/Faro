import type { Named, Structure } from "./types";

/**
 * FACES (Oscar, 2026-11-11): every category and subcategory wears its own icon in a plate of its
 * own colour — in Estructura and everywhere else the piece appears as itself. The data always
 * had the field (Named.icon); the factory categories were curated (Casa = Home, Transporte =
 * Car…) but every factory SUB was born wearing the placeholder "Circle", and most surfaces
 * rendered only a colour dot. Resolution mirrors the per-sub preset colours (colors.ts):
 * a stored, deliberately chosen icon always wins; the "Circle" placeholder means "never
 * dressed", and then the curated preset for a factory sub applies; a sub with no preset
 * (a user-created one) wears its category's face until it gets its own; a piece with nothing
 * at all wears the neutral Package. No migration: existing books gain faces at read time.
 */
export const SUB_ICON_PRESETS: Record<string, string> = {
  "f.casa.renta": "Key",
  "f.casa.hipoteca": "Landmark",
  "f.casa.servicios": "Wrench",
  "f.casa.gas": "Flame",
  "f.casa.youtube": "Tv",
  "f.casa.celular": "Smartphone",
  "f.casa.telefono": "Phone",
  "f.casa.agua": "Waves",
  "f.casa.predial": "Receipt",
  "f.casa.internet": "Wifi",
  "f.casa.otros": "Package",
  "f.transporte.gasolina": "Fuel",
  "f.transporte.publico": "Bus",
  "f.transporte.electrico": "Zap",
  "f.familia.colegiaturas": "GraduationCap",
  "f.familia.hijo1": "Backpack",
  "f.familia.hijo2": "Baby",
  "f.familia.otros": "Package",
  "f.familia.formativas": "BookOpen",
  "f.familia.funeraria": "Flower2",
  "f.seguros.auto": "Car",
  "f.seguros.vida": "Heart",
  "f.seguros.medico": "Stethoscope",
  "f.ahorro.meta": "Target",
  "f.ahorro.retiro": "Hourglass",
  "f.ahorro.emergencia": "Umbrella",
  "f.remesas.envios": "Send",
  "f.creditos.tarjetas": "CreditCard",
  "f.creditos.automotriz": "Car",
  "f.creditos.consumo": "ShoppingBag",
  "f.creditos.personal": "Wallet",
  "f.alimentos.despensa": "ShoppingCart",
  "f.alimentos.higiene": "Sparkles",
  "f.mascotas.alimento": "Bone",
  "f.mascotas.otros": "Package",
  "v.casa.reparaciones": "Hammer",
  "v.casa.mantenimiento": "Wrench",
  "v.casa.mejora": "Lamp",
  "v.transporte.mantenimiento": "Wrench",
  "v.transporte.estacionamiento": "Map",
  "v.transporte.taxi": "Car",
  "v.transporte.tenencia": "Receipt",
  "v.mascotas.vet": "Stethoscope",
  "v.mascotas.juguetes": "Bone",
  "v.entretenimiento.eventos": "Ticket",
  "v.entretenimiento.restaurantes": "Utensils",
  "v.entretenimiento.fiestas": "Cake",
  "v.entretenimiento.xuper": "Star",
  "v.entretenimiento.tv": "Tv",
  "v.viajes.hotel": "Hotel",
  "v.viajes.transporte": "Plane",
  "v.viajes.comidas": "Utensils",
  "v.viajes.regalos": "Gift",
  "v.viajes.entretenimiento": "Gamepad2",
  "v.personales.ropa": "Shirt",
  "v.personales.salud": "HeartPulse",
  "v.personales.belleza": "Scissors",
  "v.personales.lavanderia": "WashingMachine",
  "v.personales.otros": "Package",
  "v.familia.libros": "BookOpen",
  "v.familia.juguetes": "Gamepad2",
  "v.hormiga.cafe": "Coffee",
  "v.hormiga.dulces": "IceCreamCone",
  "v.remesas.envios": "Send",
  "v.estudio.matricula": "GraduationCap",
  "v.estudio.materiales": "BookOpen",
  "v.estudio.herramientas": "Wrench",
  "f.negocio.local": "Store",
  "f.negocio.inventario": "Package",
  "f.negocio.impuestos": "Receipt",
  "f.negocio.nomina": "HandCoins",
};

/** Any Named piece's face: its stored icon, unless it still wears the "Circle" placeholder. */
export function namedIconFor(piece: Named): string {
  return piece.icon && piece.icon !== "Circle" ? piece.icon : "Package";
}

/** A subcategory's face: stored wins, then the factory preset, then its category's face. */
export function subIconFor(structure: Structure, catId: string, subId: string): string {
  const cat = structure.categories.find((c) => c.id === catId);
  const sub = cat?.subs.find((s) => s.id === subId);
  if (!sub) return "Package";
  if (sub.icon && sub.icon !== "Circle") return sub.icon;
  return SUB_ICON_PRESETS[sub.id] ?? (cat ? namedIconFor(cat) : "Package");
}
