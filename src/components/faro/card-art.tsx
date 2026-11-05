/**
 * Card art (1.3.107): small stylized credit cards drawn in SVG, never photos and never traced logos.
 * Presets get their issuer's look (Chase: dark blue wave + green accent; Wells Fargo: graphite with a red diagonal band
 * and a gold stripe; PayPal: navy with a big light-blue P). Any other card uses a generic style in its own colour.
 * The network is a simple mark (VISA as text, Mastercard as two circles). The last 4 is drawn only on the large art and
 * only from the user's own data.
 */
import type { ReactElement } from "react";
import { artOf } from "@/lib/faro/cards";
import type { CreditCard } from "@/lib/faro/types";

const mix = (hex: string, k: number) => {
  // k > 0 lightens toward white, k < 0 darkens toward black.
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

function Network({ net, light = true }: { net: string; light?: boolean }) {
  if (net === "mastercard") return <g><circle cx="70" cy="44" r="6" fill="#eb001b" /><circle cx="78" cy="44" r="6" fill="#f79e1b" fillOpacity=".92" /></g>;
  if (net === "visa") return <text x="82" y="49" textAnchor="end" fontSize="11" fontWeight="800" fontStyle="italic" fontFamily="Outfit, Arial, sans-serif" fill={light ? "#ffffff" : "#1a1f71"} letterSpacing=".3">VISA</text>;
  if (net === "amex") return <text x="82" y="48" textAnchor="end" fontSize="8.5" fontWeight="800" fontFamily="Outfit, Arial, sans-serif" fill="#ffffff">AMEX</text>;
  if (net === "discover") return <circle cx="77" cy="44" r="5.5" fill="#ff6000" />;
  return null;
}

export function CardArt({ card, big = false, className = "" }: { card: Pick<CreditCard, "art" | "mark" | "color" | "network" | "last4" | "id">; big?: boolean; className?: string }) {
  const art = artOf(card);
  const id = `ca-${card.id.replace(/[^a-z0-9]/gi, "")}-${big ? "b" : "s"}`;
  const c = card.color || "#5b6b78";
  const net = card.network || (art === "paypal" ? "mastercard" : art === "chase" || art === "wellsfargo" ? "visa" : "");
  let body: ReactElement;
  if (art === "chase") {
    body = (
      <>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0a2e6e" /><stop offset="1" stopColor="#1563c4" /></linearGradient></defs>
        <rect width="88" height="56" rx="6" fill={`url(#${id})`} />
        <path d="M0 34 C 20 22, 40 46, 60 30 S 84 22, 88 26 V56 H0Z" fill="#3d8fe6" fillOpacity=".35" />
        <path d="M0 42 C 24 32, 44 52, 66 38 S 84 34, 88 36 V56 H0Z" fill="#7fbaf5" fillOpacity=".22" />
        <rect x="8" y="9" width="22" height="3.6" rx="1.8" fill="#78d64b" />
      </>
    );
  } else if (art === "wellsfargo") {
    body = (
      <>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a3d42" /><stop offset="1" stopColor="#17181b" /></linearGradient></defs>
        <rect width="88" height="56" rx="6" fill={`url(#${id})`} />
        <path d="M36 0 H58 L30 56 H8Z" fill="#d71e28" />
        <path d="M59.5 0 H63 L35 56 H31.5Z" fill="#ffcd41" />
      </>
    );
  } else if (art === "paypal") {
    body = (
      <>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0c2257" /><stop offset="1" stopColor="#173a8a" /></linearGradient></defs>
        <rect width="88" height="56" rx="6" fill={`url(#${id})`} />
        {/* A big stylized P (two offset bowls), not the trademark wordmark. */}
        <path d="M14 46 L20 10 H34 C 44 10, 46 18, 44 23 C 42 30, 36 32, 29 32 H24 L21.5 46Z M25.5 25 H30 C 34 25, 36 23.5, 36.6 21 C 37.2 18.4, 35.4 17, 32 17 H27.4Z" fill="#5fb7f2" fillOpacity=".9" />
        <path d="M20 50 L25 20 H37 C 46 20, 48 27, 46.4 31.5 C 44.6 37.5, 39 39.5, 33 39.5 H29 L27 50Z" fill="#9fd3ff" fillOpacity=".28" />
      </>
    );
  } else {
    const a = mix(c, -0.35), b = mix(c, 0.12), d = mix(c, 0.4);
    body = (
      <>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={b} /><stop offset="1" stopColor={a} /></linearGradient></defs>
        <rect width="88" height="56" rx="6" fill={`url(#${id})`} />
        {art === "wave" ? <path d="M0 36 C 22 24, 42 48, 62 32 S 84 26, 88 28 V56 H0Z" fill={d} fillOpacity=".3" /> : null}
        {art === "band" ? <path d="M44 0 H62 L40 56 H22Z" fill={d} fillOpacity=".38" /> : null}
        {art === "glow" ? <circle cx="70" cy="10" r="30" fill={d} fillOpacity=".3" /> : null}
        <rect x="9" y="17" width="12" height="9" rx="2" fill="#e7c873" fillOpacity=".85" />
      </>
    );
  }
  return (
    <svg viewBox="0 0 88 56" className={`card-art${big ? " is-big" : ""} ${className}`} data-art={art} aria-hidden>
      {body}
      <Network net={net} light={art !== "plain" || true} />
      {big && card.last4 ? <text x="7" y="49" fontSize="7.6" fontWeight="600" fontFamily="'DejaVu Sans Mono', ui-monospace, monospace" fill="#ffffff" fillOpacity=".94" letterSpacing=".4">··{card.last4}</text> : null}
      <rect x=".4" y=".4" width="87.2" height="55.2" rx="5.7" fill="none" stroke="#ffffff" strokeOpacity=".16" strokeWidth=".8" />
    </svg>
  );
}
