import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

// Oscar's center law (2026-11-10, «Windows» line): EVERY window in Faro sits at
// the precise center of the screen — confirmations, help cards, picker sheets,
// scan sheets, the share chooser. 1.3.191 centered only the exit dialog
// (.ask-back.is-center); this wave makes centering each scrim's only placement
// at every width. The WINDOW moves — its interior, buttons and design do not.
// These fences pin the placement in each family's own stylesheet so no future
// wave quietly re-anchors a window to the bottom.

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const styles = read("../../styles.css");
const fit = read("../../components/faro/fit-form.css");
const bank = read("../../components/faro/bank.css");
const scan = read("../../components/faro/scan.css");
const stmt = read("../../components/faro/stmt.css");
const share = read("../../components/faro/share-inbox.css");

describe("la ley del centro — toda ventana al centro preciso", () => {
  it("confirmaciones (.ask): centradas siempre, nunca al fondo", () => {
    assert.match(styles, /\.ask-back\s*\{[^}]*place-items:\s*center/);
    assert.ok(!/\.ask-back\s*\{[^}]*place-items:\s*end/.test(styles), ".ask-back no ancla al fondo");
  });

  it("la ayuda (.xp): centrada siempre", () => {
    assert.match(styles, /\.xp-scrim\s*\{[^}]*align-items:\s*center/);
    assert.ok(!/\.xp-scrim\s*\{[^}]*align-items:\s*end/.test(styles), ".xp-scrim no ancla al fondo");
  });

  it("los selectores (.fit, PickSheet): centrados siempre", () => {
    assert.match(fit, /\.fit-scrim\s*\{[^}]*place-items:\s*center/);
    assert.ok(!/\.fit-scrim\s*\{[^}]*place-items:\s*end/.test(fit), ".fit-scrim no ancla al fondo");
  });

  it("la importación (.imp) y su selector de categoría: centrados", () => {
    assert.match(bank, /\.imp-scrim\s*\{[^}]*align-items:\s*center/);
    assert.match(bank, /\.imp-pick-scrim\s*\{[^}]*justify-content:\s*center/);
  });

  it("el escaneo (.scn) y el estado (.stm): centrados", () => {
    assert.match(scan, /\.scn-scrim\s*\{[^}]*align-items:\s*center/);
    assert.match(stmt, /\.stm-scrim\s*\{[^}]*align-items:\s*center/);
  });

  it("el selector de compartidos (.shr): centrado", () => {
    assert.match(share, /\.shr-scrim\s*\{[^}]*align-items:\s*center/);
  });
});
