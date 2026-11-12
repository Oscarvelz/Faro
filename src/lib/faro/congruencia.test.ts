/**
 * Congruency pass (Oscar, 2026-11-11): the pure law behind the Estructura rework.
 * - Replace (the palette's new job): the user decides AT THE MOMENT — merge (the piece keeps its id,
 *   its purchases follow to the new name) or fresh (new id, the old purchases lose the name).
 * - Per-sub colours: every sub is born with its own preset — a deterministic shade of its category's
 *   family — and a hand-picked colour always wins.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { defaultStructure, replaceCatalogItem, replaceCandidates, type ReplaceTarget } from "./defaults";
import { colorForLine, subBase, subColorFor, subPresetColor } from "./colors";
import type { Structure } from "./types";

const walmart: ReplaceTarget = { nameKey: "", customName: "Walmart", icon: "Store", kind: "store", urlTemplate: "" };

describe("replace: merge keeps the id, fresh is born again", () => {
  test("merge: same id, same place, same hidden — new face; purchases keep their name", () => {
    const s = defaultStructure();
    const temu = s.catalog.find((c) => c.id === "temu")!;
    const out = replaceCatalogItem(s, "temu", walmart, "merge", () => "never-used");
    const now = out.catalog.find((c) => c.id === "temu")!;
    assert.equal(now.customName, "Walmart");
    assert.equal(now.hidden, temu.hidden);
    assert.equal(now.order, temu.order);
    assert.equal(out.catalog.length, s.catalog.length);
  });

  test("fresh: new id at the same slot — the old id is gone, so its purchases lose the name", () => {
    const s = defaultStructure();
    const temu = s.catalog.find((c) => c.id === "temu")!;
    const out = replaceCatalogItem(s, "temu", walmart, "fresh", () => "c-newid");
    assert.equal(out.catalog.some((c) => c.id === "temu"), false);
    const now = out.catalog.find((c) => c.id === "c-newid")!;
    assert.equal(now.customName, "Walmart");
    assert.equal(now.order, temu.order);
    assert.equal(now.hidden, temu.hidden);
    assert.equal(out.catalog.length, s.catalog.length);
  });

  test("candidates: same kind only, and never a piece the book already carries", () => {
    const s = defaultStructure();
    const grok = s.catalog.find((c) => c.kind === "ai")!;
    const cands = replaceCandidates(s, grok);
    assert.ok(cands.every((c) => c.kind === "ai"));
    assert.ok(cands.every((c) => !s.catalog.some((x) => x.id === c.id)));
  });
});

describe("per-sub colours: born with a preset, the hand wins", () => {
  test("the preset is deterministic — same sub, same colour, every device", () => {
    assert.equal(subPresetColor("#b7d4c4", "f-casa.renta"), subPresetColor("#b7d4c4", "f-casa.renta"));
  });

  test("sibling subs of one category are told apart, and stay in the family (a shade, not a stranger)", () => {
    const s = defaultStructure();
    const casa = s.categories.find((c) => c.id === "f-casa")!;
    const presets = casa.subs.map((sub) => subBase(s, "f-casa", sub.id));
    assert.ok(new Set(presets).size > 1, "subs of Casa must not all share one colour");
    for (const p of presets) assert.match(p, /^#[0-9a-f]{6}$/);
  });

  test("a hand-picked sub colour wins over the preset, and lines of that sub paint with it", () => {
    const base = defaultStructure();
    const casa = base.categories.find((c) => c.id === "f-casa")!;
    const renta = casa.subs[0]!;
    const s: Structure = {
      ...base,
      categories: base.categories.map((c) =>
        c.id === "f-casa" ? { ...c, subs: c.subs.map((x) => (x.id === renta.id ? { ...x, color: "#123456" } : x)) } : c,
      ),
    };
    assert.equal(subBase(s, "f-casa", renta.id), "#123456");
    assert.equal(colorForLine(s, "f-casa", renta.id), subColorFor(s, "f-casa", renta.id));
    // A line with no sub (or a dead sub id) keeps the category's paint, untouched.
    assert.equal(colorForLine(s, "f-casa"), colorForLine(base, "f-casa"));
    assert.equal(colorForLine(s, "f-casa", "no-such-sub"), colorForLine(base, "f-casa"));
  });
});

// 1.3.230 (Oscar's report): the membership sign (⇄, Repeat2) at the end of a subscription
// row's hand is a SIGN, not a button (the 1.3.222 law) — but it rendered as a bare span
// inside the card whose door only exempted button/input/a, so a tap on the sign fell
// through to the door and folded the open card under his finger. The fix exempts the
// sign in the door's guard: its tap is inert, and no member of the hand can ever fold
// or unfold the card as a side effect.
const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");

describe("the membership sign: a sign, tap-inert, never a door", () => {
  test("the sign renders as an aria-hidden span on subscription rows only — never a button", () => {
    assert.match(screens, /item\.kind === "sub" \? <span className="cat-badge" aria-hidden><Repeat2 className="size-4" \/><\/span>/);
    assert.ok(!/<button[^>]*>\s*<Repeat2/.test(screens), "no button in the catalog card may wear the repeat sign");
  });

  test("the card's door exempts the sign exactly like a tool — its tap folds nothing", () => {
    assert.match(screens, /closest\("button, input, a, \.cat-badge"\)/);
  });

  test("the four tools of the hand stay real buttons (rename · replace · eye · trash)", () => {
    const hand = screens.slice(screens.indexOf('className="cat-tools"'), screens.indexOf('className="cat-badge"'));
    const buttons = hand.match(/<button type="button"/g) ?? [];
    assert.equal(buttons.length, 4);
  });
});
