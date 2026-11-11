// 1.3.201 (+1.3.202 sweep rule) — Cyberpunk vivo (Hark): fences for the living skin. Skin only — these pins guard scope, the figure law,
// the motion rules and the battery/visibility pauses; they hold no behaviour of the app.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../components/faro/cyberpunk-vivo.css", import.meta.url), "utf8");
const ts = fs.readFileSync(new URL("../../components/faro/cp-city.ts", import.meta.url), "utf8");
const strip = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every top-level and nested style rule's selector list (keyframe steps excluded). */
function selectors(src: string): string[] {
  const out: string[] = [];
  const body = src.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const re = /([^{}@;]+)\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push(m[1].trim());
  return out.filter(Boolean);
}

test("vivo: every rule is fenced to Cyberpunk (the two layers hide everywhere else)", () => {
  for (const sel of selectors(strip)) {
    for (const one of sel.split(/,(?![^(]*\))/).map((s) => s.trim())) {
      if (one === ".cp-city" || one === ".cp-scan") continue; // `display: none` outside the theme
      assert.ok(one.startsWith('html[data-theme="cyberpunk"]'), `selector not fenced: ${one}`);
    }
  }
  assert.match(strip, /\.cp-city, \.cp-scan \{ display: none; \}/);
  assert.ok(!css.includes('data-theme="tron"') && !css.includes("[data-theme=tron]"), "vivo never names Tron");
});

test("vivo: no money figure is ever animated or painted (Faro's figure law)", () => {
  for (const sel of selectors(strip)) assert.ok(!/\.(num|figure|lens-value)\b|desk-bar strong|desk-kicker strong/.test(sel), `figure targeted: ${sel}`);
});

test("vivo: ambient keyframes move only transform/opacity; ambient lives behind the motion guard", () => {
  for (const name of ["cp-rain-near", "cp-spin-a", "cp-spin-b", "cp-lit", "cp-beacon", "cp-sign", "cp-kata-buzz"]) {
    const m = strip.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\}\\s*(?=@keyframes|/\\*|@media|$)`));
    assert.ok(m, `missing keyframes ${name}`);
    const props = [...m[1].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]);
    for (const p of props) assert.ok(p === "transform" || p === "opacity", `${name} animates ${p}`);
  }
  const guard = strip.slice(strip.indexOf("@media (prefers-reduced-motion: no-preference)"), strip.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(guard.includes("cp-rain-near") && guard.includes("cp-spin-a"), "ambient applications sit behind the no-preference guard");
  const rm = strip.slice(strip.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(rm, /\.cp-city > i:is\(\.cp-rainbox, \.cp-spin\) \{ display: none; \}/);
  assert.match(rm, /\.cp-scan \{ display: none; \}/);
});

test("vivo: the city pauses when hidden, during a float drag, while a screen changes, and calms on battery", () => {
  assert.match(strip, /:is\(\[data-hidden\], \[data-cp-still\], \[data-cp-calm\]\) :is\(\.cp-city i, \.cp-city b, \.cp-kata\) \{ animation-play-state: paused !important; \}/);
  assert.match(strip, /\[data-cp-hush\] :is\(\.cp-rain, \.cp-spin\) \{ animation-play-state: paused !important; \}/);
  assert.match(strip, /\[data-cp-calm\] \.cp-city > i:is\(\.cp-rainbox, \.cp-spin\) \{ display: none; \}/);
  assert.match(ts, /attributeFilter: \["data-moving"\]/);
  assert.match(ts, /b\.level <= 0\.2/);
  assert.match(ts, /saveData/);
});

test("vivo: the script touches only data-* attributes on html (fit/native/statusbar observers stay quiet)", () => {
  assert.ok(!/classList\.(add|remove|toggle)|\.className\s*=\s*[^"]*\+|style\.|setAttribute\("(class|style)"/.test(ts.replace(/city\.className = "cp-city"|sweep\.className = "cp-scan"/g, "")), "no class/style writes beyond the two mounts");
  for (const a of ts.matchAll(/html\.(?:set|remove)Attribute\("([^"]+)"/g)) assert.ok(a[1].startsWith("data-cp-"), `unexpected attribute ${a[1]}`);
});

test("vivo: the card lock-on is a transition, never an animation (cards keep their own entrances)", () => {
  assert.ok(!/\.card[^{]*\{[^}]*animation\s*:/.test(strip), "no animation on .card");
  assert.match(strip, /\.card \{ transition: border-color \.27s steps\(3, jump-end\); \}/);
});

// 1.3.202 (Oscar): the yellow signal sweep fires ONLY on a main-screen switch — Central ↔ Libros ↔ Estudio and
// Estudio ↔ Asesor. Never on Tengo/Gastaré/Pagos, Debo tabs, lenses, the books inside Libros, or Ajustes.
import { isScreenSwitch, SCREEN_NAVS } from "../../components/faro/cp-switch.ts";

type FakeNav = { cls: string; matches(sel: string): boolean };
const nav = (cls: string): FakeNav => ({ cls, matches: (sel) => sel.split(",").some((s) => s.trim().split(".").filter(Boolean).every((c) => cls.split(" ").includes(c))) });
const btn = (n: FakeNav, current: boolean) => ({ parentElement: n, getAttribute: (a: string) => (a === "aria-current" && current ? "page" : null) });
/** A switch inside nav n: one button loses "page", another gains it (what React writes in one commit). */
const swap = (n: FakeNav) => [{ target: btn(n, false), oldValue: "page" }, { target: btn(n, true), oldValue: null }];

test("vivo 1.3.202: the sweep fires on Central ↔ Libros ↔ Estudio (dock) and Estudio ↔ Asesor (study pair)", () => {
  assert.equal(SCREEN_NAVS, ".dock, .seg.is-pair");
  assert.equal(isScreenSwitch(swap(nav("dock"))), true, "dock tap or swipe between main screens");
  assert.equal(isScreenSwitch(swap(nav("seg is-follow is-pair"))), true, "Estudio ↔ Asesor");
});

test("vivo 1.3.202: no sweep on books, Tengo/Gastaré/Pagos, Debo tabs, vault, lenses or Ajustes", () => {
  for (const cls of ["seg is-follow is-four", "seg is-follow", "vault-bar", "seg", "rail", "dock-face", "debt-tabs", "side-dock"])
    assert.equal(isScreenSwitch(swap(nav(cls))), false, `no sweep for .${cls.replace(/ /g, ".")}`);
  // Lenses are aria-pressed (never observed); the dock entering/leaving Ajustes only gains or only loses.
  const d = nav("dock");
  assert.equal(isScreenSwitch([{ target: btn(d, true), oldValue: null }]), false, "Ajustes → Central");
  assert.equal(isScreenSwitch([{ target: btn(d, false), oldValue: "page" }]), false, "Central → Ajustes");
  // Two different navs each moving half a step is not a switch.
  assert.equal(isScreenSwitch([{ target: btn(nav("dock"), false), oldValue: "page" }, { target: btn(nav("dock"), true), oldValue: null }]), false);
});

test("vivo 1.3.202: the sweep reads only aria-current, no longer the entrance animations", () => {
  assert.match(ts, /new MutationObserver\(\(recs\) => \{ if \(isScreenSwitch\(recs\)\) fire\(\); \}\)/);
  assert.match(ts, /attributeFilter: \["aria-current"\]/);
  const anim = ts.slice(ts.indexOf('addEventListener("animationstart"'), ts.indexOf("const fire"));
  assert.ok(!/scan\.animate|fire\(/.test(anim), "entrance animations only hush the rain, never sweep");
});

// 1.3.203 — Cyberpunk HUD (savings chips, split debt meter, Estudio cards): skin fences only.
const hud = fs.readFileSync(new URL("../../components/faro/cyberpunk-hud.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const debtsCss = fs.readFileSync(new URL("../../components/faro/debts.css", import.meta.url), "utf8");

test("hud: every rule is fenced to Cyberpunk; the split meter is hidden in every other theme", () => {
  for (const sel of selectors(hud)) {
    for (const one of sel.split(/,(?![^(]*\))/).map((s) => s.trim())) {
      if (/^(\d+%|from|to)\b/.test(one)) continue;
      assert.ok(one.startsWith('html:root[data-theme="cyberpunk"]'), `selector not fenced: ${one}`);
    }
  }
  assert.match(debtsCss, /\.ds-cp \{ display: none; \}/);
});

test("hud: no money figure is ever animated (Faro's figure law); motion sits behind the guard", () => {
  const rules = [...hud.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)].filter((m) => /animation(-name)?\s*:/.test(m[2]) && !/animation:\s*none/.test(m[2]));
  for (const [, sel] of rules) assert.ok(!/(> button b|\bstrong\b|\.num\b|\.a2-col b|\.ds-cp b)/.test(sel), `figure animated: ${sel.trim()}`);
  const outside = hud.replace(/@media \(prefers-reduced-motion: (no-preference|reduce)\) \{[\s\S]*?\n\}/g, "").replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  assert.ok(!/animation\s*:\s*(?!none)[a-z]/.test(outside.replace(/animation: cp-ts-ring[^;]*;/, "")), "every animation lives behind a motion guard (the tablet ring replaces the house's own ring)");
});
