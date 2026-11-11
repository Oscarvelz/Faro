import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultStructure } from "./defaults.ts";
import { namedIconFor, subIconFor, SUB_ICON_PRESETS } from "./faces.ts";

// FACES (Oscar, 2026-11-11): every factory sub resolves to a real, curated glyph — never the
// "Circle" placeholder it was born with — and every preset name must be a glyph the app can
// actually draw (checked against the factory ids themselves, the full census).
test("every factory subcategory resolves to a curated preset face", () => {
  const s = defaultStructure();
  for (const cat of s.categories) {
    for (const sub of cat.subs) {
      const face = subIconFor(s, cat.id, sub.id);
      assert.ok(SUB_ICON_PRESETS[sub.id], `${sub.id} must have a curated preset`);
      assert.equal(face, SUB_ICON_PRESETS[sub.id], `${sub.id} should resolve to its preset`);
      assert.notEqual(face, "Circle");
      // Note: the "otros" (miscellany) subs wear Package BY DESIGN — a box for odds and ends is
      // their curated face, not the neutral fallback leaking through.
    }
  }
});

test("a stored, chosen icon always wins over the preset", () => {
  const s = defaultStructure();
  const casa = s.categories.find((c) => c.id === "f-casa")!;
  const renta = casa.subs.find((x) => x.id === "f.casa.renta")!;
  renta.icon = "Gem";
  assert.equal(subIconFor(s, "f-casa", "f.casa.renta"), "Gem");
});

test("a user-created sub wears its category's face until it gets its own", () => {
  const s = defaultStructure();
  const casa = s.categories.find((c) => c.id === "f-casa")!;
  casa.subs.push({ id: "s-custom1", nameKey: "", customName: "Mudanza", icon: "Circle", hidden: false, order: 99 });
  assert.equal(subIconFor(s, "f-casa", "s-custom1"), "Home"); // Casa's own face
});

test("categories: curated faces pass through; the placeholder falls back to neutral", () => {
  const s = defaultStructure();
  const casa = s.categories.find((c) => c.id === "f-casa")!;
  assert.equal(namedIconFor(casa), "Home");
  assert.equal(namedIconFor({ ...casa, icon: "Circle" }), "Package");
  assert.equal(namedIconFor({ ...casa, icon: "" }), "Package");
});

test("an unknown sub resolves to the neutral face rather than crashing", () => {
  const s = defaultStructure();
  assert.equal(subIconFor(s, "f-casa", "nope"), "Package");
  assert.equal(subIconFor(s, "nope", "nope"), "Package");
});
