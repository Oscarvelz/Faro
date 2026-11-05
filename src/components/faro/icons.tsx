import {
  ArrowDownLeft,
  ArrowLeftRight,
  AudioLines,
  BarChart3,
  Bot,
  Briefcase,
  Calculator,
  Car,
  Circle,
  Cloud,
  Coffee,
  Compass,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Film,
  GraduationCap,
  Home,
  Info,
  Keyboard,
  Laptop,
  LayoutDashboard,
  Lock,
  Package,
  Palette,
  PawPrint,
  PiggyBank,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Shirt,
  ShoppingBag,
  Smartphone,
  Trash2,
  Upload,
  Users,
  Utensils,
  Waves,
  Baby,
  Banknote,
  Bike,
  BookOpen,
  Building2,
  Bus,
  Camera,
  Cat,
  Dog,
  Dumbbell,
  Flag,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  HandCoins,
  Headphones,
  Heart,
  Hourglass,
  Key,
  Mountain,
  Music,
  Palmtree,
  Pill,
  Ship,
  Sofa,
  Star,
  Stethoscope,
  Sun,
  Tent,
  TreePine,
  Trophy,
  Tv,
  Umbrella,
  Wallet,
  Anchor,
  Apple,
  Backpack,
  Bed,
  Cake,
  Fish,
  Flower2,
  Glasses,
  Lamp,
  Landmark,
  Leaf,
  Moon,
  Pizza,
  Watch,
  Wifi,
  Wrench,
  Bird,
  Bone,
  Carrot,
  Church,
  Coins,
  Croissant,
  Crown,
  Drum,
  Factory,
  Flame,
  Footprints,
  Guitar,
  Hammer,
  HandHeart,
  HeartPulse,
  Hospital,
  Hotel,
  IceCreamCone,
  Library,
  Lightbulb,
  Luggage,
  Map,
  Medal,
  Phone,
  Receipt,
  Ribbon,
  Rocket,
  Sailboat,
  School,
  Scissors,
  ShoppingCart,
  Snowflake,
  Soup,
  Sparkles,
  Sprout,
  Store,
  Target,
  Ticket,
  TrainFront,
  TreeDeciduous,
  Truck,
  WashingMachine,
  Wine,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SUB_POOL } from "@/lib/faro/subs";
import { useEffect, useState } from "react";

const MAP: Record<string, LucideIcon> = {
  ArrowDownLeft,
  ArrowLeftRight,
  AudioLines,
  BarChart3,
  Bot,
  Briefcase,
  Calculator,
  Car,
  Circle,
  Cloud,
  Coffee,
  Compass,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Film,
  GraduationCap,
  Home,
  Info,
  Keyboard,
  Laptop,
  LayoutDashboard,
  Lock,
  Package,
  Palette,
  PawPrint,
  PiggyBank,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Shirt,
  ShoppingBag,
  Smartphone,
  Trash2,
  Upload,
  Users,
  Utensils,
  Waves,
  Baby,
  Banknote,
  Bike,
  BookOpen,
  Building2,
  Bus,
  Camera,
  Cat,
  Dog,
  Dumbbell,
  Flag,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  HandCoins,
  Headphones,
  Heart,
  Hourglass,
  Key,
  Mountain,
  Music,
  Palmtree,
  Pill,
  Ship,
  Sofa,
  Star,
  Stethoscope,
  Sun,
  Tent,
  TreePine,
  Trophy,
  Tv,
  Umbrella,
  Wallet,
  Anchor,
  Apple,
  Backpack,
  Bed,
  Cake,
  Fish,
  Flower2,
  Glasses,
  Lamp,
  Landmark,
  Leaf,
  Moon,
  Pizza,
  Watch,
  Wifi,
  Wrench,
  Bird,
  Bone,
  Carrot,
  Church,
  Coins,
  Croissant,
  Crown,
  Drum,
  Factory,
  Flame,
  Footprints,
  Guitar,
  Hammer,
  HandHeart,
  HeartPulse,
  Hospital,
  Hotel,
  IceCreamCone,
  Library,
  Lightbulb,
  Luggage,
  Map,
  Medal,
  Phone,
  Receipt,
  Ribbon,
  Rocket,
  Sailboat,
  School,
  Scissors,
  ShoppingCart,
  Snowflake,
  Soup,
  Sparkles,
  Sprout,
  Store,
  Target,
  Ticket,
  TrainFront,
  TreeDeciduous,
  Truck,
  WashingMachine,
  Wine,
  Zap,
};

export const ICON_NAMES = Object.keys(MAP);

export const LOOK_ICONS = [
  "PiggyBank", "Wallet", "Banknote", "HandCoins", "Gem", "Trophy", "Star", "Flag", "Hourglass",
  "Home", "Key", "Sofa", "Building2",
  "Car", "Plane", "Bus", "Bike", "Fuel", "Ship",
  "Heart", "Baby", "Stethoscope", "Pill", "Dumbbell",
  "GraduationCap", "BookOpen", "Briefcase", "Laptop",
  "Utensils", "Coffee", "Gift", "Shirt", "ShoppingBag",
  "Palmtree", "Tent", "Mountain", "Camera",
  "Dog", "Cat", "PawPrint",
  "Music", "Headphones", "Tv", "Gamepad2",
  "Shield", "Umbrella", "TreePine", "Sun",
  "Watch", "Glasses", "Backpack", "Landmark", "Flower2", "Leaf",
  "Apple", "Cake", "Pizza", "Fish", "Anchor", "Bed", "Lamp", "Moon", "Wifi", "Wrench",
  "Crown", "Coins", "Sparkles", "Medal", "Rocket", "Store", "ShoppingCart", "Receipt",
  "TrainFront", "Truck", "Sailboat", "Luggage", "Map", "Ticket", "Hotel",
  "Wine", "Croissant", "Soup", "IceCreamCone", "Carrot",
  "Flame", "Zap", "Lightbulb", "Target", "Ribbon",
  "HandHeart", "HeartPulse", "Hospital", "School", "Church", "Library",
  "Hammer", "Scissors", "Factory", "WashingMachine", "Phone",
  "Sprout", "TreeDeciduous", "Bird", "Bone", "Footprints", "Guitar", "Drum", "Snowflake",
] as const;

const SECTION_ICON: Record<string, LucideIcon> = {
  desk: LayoutDashboard,
  income: ArrowDownLeft,
  fixed: Lock,
  variable: Waves,
  shops: ShoppingBag,
  subs: RefreshCw,
  stats: BarChart3,
  advice: Compass,
  settings: Settings,
};

export function SectionIcon({ id, className }: { id: string; className?: string }) {
  const I = SECTION_ICON[id] ?? Circle;
  return <I className={className ?? "size-4"} strokeWidth={1.75} aria-hidden />;
}

export function Glyph({ name, className }: { name: string; className?: string }) {
  if (name.startsWith("sub:")) return <SubMark id={name.slice(4)} className={className ?? "size-4"} />;
  if (name.startsWith("brand:")) return <BrandMark id={name.slice(6)} className={className ?? "size-4"} />;
  const I = MAP[name] ?? Circle;
  return <I className={className ?? "size-4"} strokeWidth={1.75} aria-hidden />;
}

export function Mark({ className, bold = false }: { className?: string; bold?: boolean }) {
  if (bold) {
    // Sturdier lighthouse for large sizes: wider lamp, tapered tower, a gallery line and a firmer base.
    return (
      <svg viewBox="0 0 32 32" className={className ?? "size-8"} aria-hidden>
        <path d="M16 3.2 21.3 12.4H10.7L16 3.2Z" fill="currentColor" />
        <path d="M13.3 13.6h5.4l1.05 10.4h-7.5L13.3 13.6Z" fill="currentColor" />
        <path d="M11.6 13.6h8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".75" />
        <path d="M6.6 27.1h18.8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className={className ?? "size-8"} aria-hidden>
      <path d="M16 4.5 20.4 13H11.6L16 4.5Z" fill="currentColor" />
      <rect x="14.2" y="13" width="3.6" height="10.5" rx="1" fill="currentColor" />
      <path d="M7.5 27h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({ id, className, src }: { id: string; className?: string; src?: string }) {
  const cls = className ?? "size-9";
  if (src) return <img src={src} alt="" className={cls} />;
  const letter: Record<string, string> = {
    amazon: "a",
    shein: "S",
    aliexpress: "A",
    temu: "T",
    grok: "G",
    gemini: "Ge",
    chatgpt: "C",
    claude: "Cl",
    meta: "M",
    paypal: "P",
    chase: "C",
    statefarm: "SF",
    primerica: "P",
    lafise: "Lf",
    banpro: "Bp",
    bac: "BAC",
  };
  if (id === "ebay") {
    return (
      <svg viewBox="0 0 32 32" className={cls} aria-hidden>
        <rect className="brand-ebay-plate" width="32" height="32" rx="8" />
        <text x="3.5" y="21" fontSize="12" fontFamily="Outfit, sans-serif" className="ebay-e">e</text>
        <text x="10.5" y="21" fontSize="12" fontFamily="Outfit, sans-serif" className="ebay-b">b</text>
        <text x="17.5" y="21" fontSize="12" fontFamily="Outfit, sans-serif" className="ebay-a">a</text>
        <text x="24.5" y="21" fontSize="12" fontFamily="Outfit, sans-serif" className="ebay-y">y</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className={`brand-${id} ${cls}`} aria-hidden>
      <rect className="brand-plate" width="32" height="32" rx="8" />
      <text x="16" y="21" textAnchor="middle" fontSize={letter[id] && letter[id].length > 2 ? 8.5 : letter[id] && letter[id].length > 1 ? 11 : 15} fontFamily="Outfit, sans-serif" className="brand-letter">
        {letter[id] ?? "•"}
      </text>
      {id === "amazon" ? <path className="brand-smile" d="M8 24c5 3 11 3 16 0" /> : null}
      {id === "shein" ? <path className="brand-accent" d="M8 26.5h16" fill="none" strokeWidth="1.7" strokeLinecap="round" /> : null}
    </svg>
  );
}

/* Subscription marks (1.3.75; 1.3.100 icon library): brand-colour plate with a Simple Icons path (CC0, lazy chunk), a
 * monogram or a tiny path; "data:" ids are the user's own icon. */
const SUB_SHAPE: Record<string, string> = {
  "@play": "M12.5 10.5v11l9-5.5z",
  "@note": "M13 22.5a2.5 2.5 0 1 1-1-2V10l9-2v11a2.5 2.5 0 1 1-1-2V11.2l-7 1.6z",
  "@cloud": "M11 22h11a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 11 22z",
  "@phone": "M11 8.5h3l1.5 4-2 1.3a9 9 0 0 0 4.7 4.7l1.3-2 4 1.5v3c0 1-1 2-2 1.9A14 14 0 0 1 9 10.5c0-1 1-2 2-2z",
  "@gym": "M7 13.5h2v5H7zM10 11.5h2.5v9H10zM12.5 15h7v2h-7zM19.5 11.5H22v9h-2.5zM23 13.5h2v5h-2z",
  "@game": "M11.5 11h9a4.5 4.5 0 0 1 4.4 5.4l-.7 3.6a2.3 2.3 0 0 1-4 1L18.6 19h-5.2l-1.6 2a2.3 2.3 0 0 1-4-1l-.7-3.6A4.5 4.5 0 0 1 11.5 11zm-.3 3v1.4H9.8v1.4h1.4v1.4h1.4v-1.4H14v-1.4h-1.4V14zm8.6.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm2.2 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  "@book": "M9 9.5c2.6-.6 5-.3 6.3 1v12c-1.3-1.1-3.7-1.4-6.3-.9zM23 9.5c-2.6-.6-5-.3-6.3 1v12c1.3-1.1 3.7-1.4 6.3-.9z",
  "@app": "M9 9h5.5v5.5H9zM17.5 9H23v5.5h-5.5zM9 17.5h5.5V23H9zM17.5 17.5H23V23h-5.5z",
  "@bolt": "M17.5 7.5 10 17.5h5l-1.5 7 8-10.5h-5z",
};
let siPaths: Record<string, string> | null = null;
let siLoading: Promise<Record<string, string>> | null = null;
/** Loads the brand paths chunk once (on first need); every SubMark re-renders with the real mark when it lands. */
function useSiPaths(need: boolean) {
  const [paths, setPaths] = useState(siPaths);
  useEffect(() => {
    if (!need || paths) return;
    let live = true;
    siLoading ??= import("@/lib/faro/brand-paths").then((m) => (siPaths = m.SI_PATHS));
    siLoading.then((p) => { if (live) setPaths(p); }).catch(() => { siLoading = null; });
    return () => { live = false; };
  }, [need, paths]);
  return paths;
}
export function SubMark({ id, className }: { id: string; className?: string }) {
  const cls = className ?? "size-4";
  const row = id.startsWith("data:") ? undefined : SUB_POOL.find((item) => item[0] === id);
  const mark = row?.[5] ?? "";
  const paths = useSiPaths(mark.startsWith("si:"));
  if (id.startsWith("data:")) return <img src={id} alt="" className={`sub-mark is-own ${cls}`} />;
  if (!row) return <RefreshCw className={cls} strokeWidth={1.75} aria-hidden />;
  const [, name, , bg, fg] = row;
  const si = mark.startsWith("si:") ? paths?.[mark.slice(3)] : undefined;
  // Until the chunk lands (first use only) a brand shows its initial on the same plate, so nothing jumps.
  const text = mark.startsWith("si:") ? (si ? "" : name.slice(0, 1)) : mark[0] === "@" ? "" : mark;
  const path = SUB_SHAPE[mark];
  return (
    <svg viewBox="0 0 32 32" className={`sub-mark ${cls}`} data-mark={id} aria-hidden>
      <rect width="32" height="32" rx="8" fill={bg} />
      {si ? <path d={si} fill={fg} transform="translate(7.5 7.5) scale(.7083)" /> : null}
      {path ? <path d={path} fill={fg} /> : null}
      {mark === "@ring" ? <><circle cx="16" cy="16" r="8" fill="none" stroke={fg} strokeWidth="1.8" /><path d="M14 12.5v7l5.5-3.5z" fill={fg} /></> : null}
      {mark === "@wave" ? <path d="M9.5 12.5c4.5-1.3 9-1 13 1M10.5 16.3c3.8-1 7.3-.7 10.5.9M11.5 19.8c3-.7 5.6-.5 8 .7" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" /> : null}
      {mark === "@wifi" ? <path d="M8.5 14a11 11 0 0 1 15 0M11.3 17a7 7 0 0 1 9.4 0M14.2 20a2.6 2.6 0 0 1 3.6 0" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" /> : null}
      {mark === "prime" ? <path d="M9 20.5c4.5 2.5 9.5 2.5 14 0" fill="none" stroke={id === "amazonprime" ? "#ff9900" : "#fff"} strokeWidth="1.8" strokeLinecap="round" /> : null}
      {text ? (
        <text x="16" y={mark === "prime" ? 18 : 21} textAnchor="middle" fill={fg} fontFamily="Outfit, sans-serif" fontWeight="700" fontSize={text.length > 3 ? 8.5 : text.length > 2 ? 10 : text.length > 1 ? 12 : 16}>{text}</text>
      ) : null}
    </svg>
  );
}
