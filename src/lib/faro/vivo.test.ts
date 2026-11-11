// 1.3.201 — Cyberpunk vivo (Hark): fences for the living skin. Skin only — these pins guard scope, the figure law,
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
