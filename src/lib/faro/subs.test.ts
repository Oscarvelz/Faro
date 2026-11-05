import test from "node:test";
import assert from "node:assert/strict";
import { SUB_POOL, dropLibraryIcon, iconForName, libraryOf, libraryOff, matchBrand, restoreLibrary, subPresetsOf } from "./subs.ts";

const base: any = { v: 1, structure: { categories: [], purchases: [], catalog: [] }, months: { "2026-11": { lines: [{ id: "a", icon: "sub:netflix", concept: "Netflix" }] } }, settings: { display: "USD", seeds: ["remesas"] }, audit: [], revision: 3, updatedAt: "" };

test("old ledgers show the whole library; delete sticks; restore brings all back", () => {
  assert.equal(libraryOf(base).length, SUB_POOL.length);
  const d = dropLibraryIcon(base, "netflix");
  assert.deepEqual(d.subIconsOff, ["netflix"]);
  assert.equal(libraryOf(d).some((r) => r[0] === "netflix"), false);
  assert.equal(dropLibraryIcon(d, "netflix"), d, "deleting twice is a no-op");
  assert.equal(dropLibraryIcon(base, "nope"), base, "unknown ids are ignored");
  // existing lines keep their icon
  assert.equal(d.months["2026-11"].lines[0].icon, "sub:netflix");
  // other ledger fields untouched
  assert.equal(d.revision, 3);
  assert.deepEqual(d.settings, base.settings);
  const r = restoreLibrary(d);
  assert.equal(r.subIconsOff, undefined);
  assert.equal(libraryOf(r).length, SUB_POOL.length);
  assert.equal(restoreLibrary(base), base, "restore with nothing deleted is a no-op");
});

test("deleted ids survive a JSON round trip (sync/backup) and bad values are ignored", () => {
  const d = JSON.parse(JSON.stringify(dropLibraryIcon(dropLibraryIcon(base, "hulu"), "gym")));
  assert.deepEqual([...libraryOff(d)].sort(), ["gym", "hulu"]);
  assert.equal(libraryOff({ ...base, subIconsOff: "x" }).size, 0);
  assert.equal(libraryOff({ ...base, subIconsOff: [1, "max"] }).size, 1);
});

test("brand matching from a typed Concepto", () => {
  const cases: [string, string][] = [
    ["Netflix", "netflix"], ["netflix premium", "netflix"], ["NETFLIX", "netflix"],
    ["YouTube Music", "ytmusic"], ["yt music", "ytmusic"], ["YouTube Premium", "ytpremium"], ["YouTube", "youtube"],
    ["Spotify Familiar", "spotify"], ["Apple Music", "applemusic"], ["Apple TV+", "appletv"], ["Apple One", "appleone"],
    ["Amazon Prime", "amazonprime"], ["Prime Video", "prime"], ["HBO", "max"], ["HBO Max", "max"], ["Max", "max"],
    ["Disney+", "disney"], ["Disney Plus", "disney"], ["Paramount+", "paramount"], ["Hulu", "hulu"], ["Peacock", "peacock"],
    ["iCloud+", "icloud"], ["Google One", "googleone"], ["Office 365", "m365"], ["Microsoft 365", "m365"],
    ["Game Pass Ultimate", "xbox"], ["PS Plus", "playstation"], ["Nintendo Switch Online", "nintendo"],
    ["Audible", "audible"], ["Kindle Unlimited", "kindle"], ["Crunchyroll", "crunchyroll"], ["ChatGPT Plus", "chatgpt"],
    ["Adobe Creative Cloud", "adobe"], ["Canva Pro", "canva"], ["Dropbox", "dropbox"], ["Duolingo Super", "duolingo"],
    ["Gimnasio", "gym"], ["gym", "gym"], ["Teléfono", "phone"], ["Internet casa", "internet"], ["Luz", "g-bolt"],
    ["", ""], ["Alquiler", ""], ["Maxi", ""], ["Primerica", ""],
  ];
  for (const [name, want] of cases) assert.equal(matchBrand(name), want, name);
});

test("a deleted preset is no longer suggested; custom presets win", () => {
  assert.equal(matchBrand("Netflix", new Set(["netflix"])), "");
  assert.equal(iconForName("Netflix", [], "es"), "sub:netflix");
  assert.equal(iconForName("Netflix", [], "es", new Set(["netflix"])), "");
  assert.equal(iconForName("Mi Club", [{ id: "c-1", name: "Mi Club", icon: "data:image/png;base64,AA" }], "es"), "sub:data:image/png;base64,AA");
  assert.deepEqual(subPresetsOf(base).map((p) => p.id), ["youtube", "netflix", "prime", "internet"]);
});
