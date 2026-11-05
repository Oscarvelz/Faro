import test from "node:test";
import assert from "node:assert/strict";
import { contrast, dedupe, deltaE, hexToHsv, hsvToHex, inkOn, minGap, parseHex, pushRecent, washForInk, INK_DARK, INK_LIGHT } from "./palette.ts";
import { PALETTE, tronize } from "./colors.ts";

// The quick set ColorPick shows (kept in sync with color-pick.tsx QUICK).
const QUICK = ["#e75e6a", "#ffa289", "#dc7106", "#b28d04", "#79a304", "#8dd28c", "#52d7c1", "#11a6aa", "#079ed9", "#6b89f9", "#bab3fe", "#ac72e3", "#e4a3e9", "#d562af", "#494d54"];

test("hex parse: short, long, hash, case, spaces; junk is null", () => {
  assert.equal(parseHex("#ABC"), "#aabbcc");
  assert.equal(parseHex("abc"), "#aabbcc");
  assert.equal(parseHex("  #12aBef "), "#12abef");
  assert.equal(parseHex("12abef"), "#12abef");
  for (const bad of ["", "#12", "#1234", "#gggggg", "12345678", "rgb(1,2,3)", undefined, null]) assert.equal(parseHex(bad as string), null, String(bad));
});

test("ΔE: identical 0, symmetric, black-white ≈ 1, unparseable is infinitely far", () => {
  assert.equal(deltaE("#3366cc", "#3366CC"), 0);
  assert.ok(Math.abs(deltaE("#000000", "#ffffff") - 1) < 0.01);
  assert.equal(deltaE("#123456", "#654321"), deltaE("#654321", "#123456"));
  assert.equal(deltaE("nope", "#ffffff"), Infinity);
  assert.ok(deltaE("rgb(255 0 0)", "#ff0000") < 1e-9);
  assert.ok(deltaE("hsl(0 100% 50%)", "#ff0000") < 1e-3);
});

test("dedupe drops near-duplicates in any rendering, keeps order", () => {
  assert.deepEqual(dedupe(["#ff0000", "#fe0101", "#0000ff"], 0.02), ["#ff0000", "#0000ff"]);
  // raw-distinct but washed-alike greys collapse once the day wash is a rendering
  const greys = ["#89939e", "#494d54"];
  assert.equal(dedupe(greys, 0.04).length, 2);
  assert.equal(dedupe(greys, 0.04, [(c) => c, washForInk]).length, 1);
});

test("quick set: subset of the old palette, clearly apart in raw, day bubble and Tron", () => {
  assert.ok(QUICK.every((c) => PALETTE.includes(c)));
  assert.ok(QUICK.length >= 12 && QUICK.length <= 16);
  assert.ok(minGap(QUICK) >= 0.07, `raw ${minGap(QUICK)}`);
  assert.ok(minGap(QUICK, washForInk) >= 0.04, `wash ${minGap(QUICK, washForInk)}`);
  assert.ok(minGap(QUICK, tronize) >= 0.08, `tron ${minGap(QUICK, tronize)}`);
  // and it is a real improvement over the 24
  assert.ok(minGap(PALETTE, washForInk) < 0.02);
  assert.deepEqual(dedupe(QUICK, 0.04, [(c) => c, washForInk, tronize]), QUICK);
});

test("removed colours stay valid colours (old data keeps them)", () => {
  for (const c of PALETTE.filter((x) => !QUICK.includes(x))) assert.equal(parseHex(c), c);
  assert.equal(tronize("#c3bdb3"), tronize("#c3bdb3"));
});

test("contrast adjust: ink flips to white on dark colours, dark on light; the better of the two inks (≥ 4 even at the mid-luminance worst case)", () => {
  assert.equal(inkOn("#ffffff"), INK_DARK);
  assert.equal(inkOn("#000000"), INK_LIGHT);
  assert.equal(inkOn("#1a237e"), INK_LIGHT);
  assert.equal(inkOn("#fff59d"), INK_DARK);
  for (let h = 0; h < 360; h += 15) for (const v of [0.15, 0.5, 0.85, 1]) {
    const c = hsvToHex(h, 0.9, v);
    assert.ok(contrast(c, inkOn(c)) >= 4 && contrast(c, inkOn(c)) >= Math.max(contrast(c, INK_DARK), contrast(c, INK_LIGHT)) - 1e-9, `${c} ${contrast(c, inkOn(c))}`);
  }
  // the day bubble wash keeps dark ink readable for any custom colour
  for (const c of ["#000000", "#0000ff", "#7a0019", "#003300"]) assert.ok(contrast(washForInk(c), INK_DARK) >= 7, c);
});

test("HSV round trip and recent list", () => {
  for (const c of ["#e75e6a", "#079ed9", "#494d54", "#000000", "#ffffff"]) {
    const [h, s, v] = hexToHsv(c)!;
    assert.equal(hsvToHex(h, s, v), c);
  }
  assert.equal(hsvToHex(0, 1, 1), "#ff0000");
  assert.equal(hsvToHex(120, 1, 1), "#00ff00");
  let r: string[] = [];
  for (const c of ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"]) r = pushRecent(r, c);
  assert.deepEqual(r, ["#777777", "#666666", "#555555", "#444444", "#333333", "#222222"]);
  assert.deepEqual(pushRecent(r, "#333"), ["#333333", "#777777", "#666666", "#555555", "#444444", "#222222"]);
  assert.deepEqual(pushRecent(undefined, "nope"), []);
});
