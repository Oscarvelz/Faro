// Búsqueda de Ajustes desde la lupa de arriba (1.3.142, Oscar 2026-11-08: estando en Ajustes, la barra de
// arriba solo encontraba cosas de los libros). El índice son los temas del manual que aterrizan en Ajustes;
// estas pruebas corren sobre los temas REALES, para que un tema nuevo sin destino, un destino repetido o un
// renombre rompan la suite aquí y no en el teléfono de Oscar.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MANUAL_TOPICS } from "../manual/topics.ts";
import { searchSettings } from "./settings-search.ts";

describe("searchSettings", () => {
  it("encuentra cada tarjeta de Ajustes por su nombre", () => {
    const cases: Array<[string, string]> = [
      ["idioma", "aj-lang"],
      ["tema", "aj-theme"],
      ["estructura", "aj-structure"],
      ["bancos", "aj-banks"],
      ["importar", "aj-import"],
      ["copias", "aj-backup"],
      ["cuenta", "aj-account"],
      ["atajos de teclado", "aj-keys"],
    ];
    for (const [q, anchor] of cases) {
      const hits = searchSettings(MANUAL_TOPICS, q, "es");
      assert.ok(hits.length > 0, `sin resultados para «${q}»`);
      assert.equal(hits[0]!.go.anchor, anchor, `«${q}» debía llevar primero a ${anchor}, llevó a ${hits[0]!.go.anchor}`);
    }
  });

  it("encuentra los ajustes de dentro de una tarjeta", () => {
    assert.equal(searchSettings(MANUAL_TOPICS, "huella", "es")[0]!.go.anchor, "aj-lock");
    assert.equal(searchSettings(MANUAL_TOPICS, "meta de ahorro", "es")[0]!.go.anchor, "aj-goal");
    assert.equal(searchSettings(MANUAL_TOPICS, "límite verde", "es")[0]!.go.anchor, "aj-green");
    assert.equal(searchSettings(MANUAL_TOPICS, "tasa manual", "es")[0]!.go.anchor, "aj-rate");
    assert.equal(searchSettings(MANUAL_TOPICS, "catálogo", "es")[0]!.go.anchor, "aj-catalog");
    assert.equal(searchSettings(MANUAL_TOPICS, "actividad", "es")[0]!.go.anchor, "aj-activity");
  });

  it("es ciega a acentos y mayúsculas, y perdona una errata larga", () => {
    assert.equal(searchSettings(MANUAL_TOPICS, "CATALOGO", "es")[0]!.go.anchor, "aj-catalog");
    assert.equal(searchSettings(MANUAL_TOPICS, "estruktura", "es")[0]!.go.anchor, "aj-structure");
  });

  it("funciona en inglés con los mismos destinos", () => {
    assert.equal(searchSettings(MANUAL_TOPICS, "fingerprint", "en")[0]!.go.anchor, "aj-lock");
    assert.equal(searchSettings(MANUAL_TOPICS, "backups", "en")[0]!.go.anchor, "aj-backup");
    assert.equal(searchSettings(MANUAL_TOPICS, "theme", "en")[0]!.go.anchor, "aj-theme");
  });

  it("cada destino aparece una sola vez, aunque muchos temas apunten a él", () => {
    const hits = searchSettings(MANUAL_TOPICS, "importar banco chase pdf", "es", 12);
    const spots = hits.map((h) => `${h.go.fold ?? ""}|${h.go.anchor ?? ""}`);
    assert.equal(new Set(spots).size, spots.length, `destinos repetidos: ${spots.join(", ")}`);
    assert.equal(hits.filter((h) => h.go.anchor === "aj-import").length, 1);
  });

  it("nunca ofrece temas de fuera de Ajustes ni el tema raíz de Ajustes", () => {
    for (const q of ["central", "ahorros", "remesas", "ajustes", "tema"]) {
      for (const h of searchSettings(MANUAL_TOPICS, q, "es", 12)) {
        assert.equal(h.go.screen, "settings");
        assert.ok(h.go.anchor || h.go.fold, `«${q}» ofreció ${h.id} sin destino`);
        assert.notEqual(h.id, "ajustes");
      }
    }
  });

  it("respeta el tope y pide al menos una palabra de dos letras", () => {
    assert.ok(searchSettings(MANUAL_TOPICS, "a", "es").length === 0);
    assert.ok(searchSettings(MANUAL_TOPICS, "tarjeta", "es").length <= 6);
    assert.ok(searchSettings(MANUAL_TOPICS, "tarjeta", "es", 2).length <= 2);
  });
});
