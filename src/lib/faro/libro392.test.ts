/* ═══ LIBRO COMPARTIDO · PIEZA C3 (1.3.392): LA FUSIÓN DE DOS ESCRITORES.
 *
 * La ley fallada (F-C2 con la enmienda de Oscar), probada sobre el
 * motor (fuse.ts) con especímenes de verdad: la unión sin duplicados,
 * la edición de un lado, la de los dos en campos distintos (se
 * compone), la de los dos en el mismo campo (gana el más reciente),
 * el borrado contra la copia limpia y contra la edición (borrar es
 * definitivo), la lápida contra la copia vieja (nada resucita), y la
 * estructura por revisión mayor con su conflicto declarado. Más el
 * papel del servidor (shared-push.sql: el empalme que cumple papel y
 * alcance escribiendo, sobre el filtro único faro_scoped) y la
 * costura del cliente. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fuseBooks, tombstonesOf, withTombstone } from "./fuse.ts";
import type { LedgerState, Line } from "./types.ts";

const line = (id: string, over: Partial<Line> = {}): Line => ({
  id, seriesId: id, monthKey: "2026-11", kind: "expense", concept: id, amountMinor: 100,
  currency: "USD", active: true, note: "", categoryId: "cat-a", subId: "", recurring: false,
  storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "once", nextDue: "",
  aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...over,
} as Line);

const book = (lines: Line[], over: Partial<LedgerState> = {}): LedgerState => ({
  v: 1,
  structure: { base: "USD", categories: [], catalog: [], purchases: [] },
  months: { "2026-11": { lines } },
  settings: {}, audit: [], ...over,
} as unknown as LedgerState);

const side = (state: LedgerState, revision: number, updatedAt: string, by?: string) => ({ state, revision, updatedAt, by });
const ids = (s: LedgerState) => Object.values(s.months).flatMap((m) => m.lines.map((l) => l.id)).sort();
const find = (s: LedgerState, id: string) => Object.values(s.months).flatMap((m) => m.lines).find((l) => l.id === id);

describe("fuse · la unión y las ediciones", () => {
  it("lo nuevo de cada lado entra, sin duplicados", () => {
    const base = book([line("x")]);
    const sv = book([line("x"), line("a")]);
    const lc = book([line("x"), line("b")]);
    const { state, conflict } = fuseBooks(base, side(sv, 2, "2026-11-22T10:00:00Z"), side(lc, 2, "2026-11-22T10:00:00Z"));
    assert.deepEqual(ids(state), ["a", "b", "x"]);
    assert.equal(conflict, false);
  });

  it("editada en un solo lado, gana ese lado entera", () => {
    const base = book([line("x")]);
    const lc = book([line("x", { concept: "editada", amountMinor: 250 })]);
    const { state } = fuseBooks(base, side(book([line("x")]), 2, "2026-11-22T10:00:00Z"), side(lc, 3, "2026-11-22T11:00:00Z"));
    assert.equal(find(state, "x")?.concept, "editada");
    assert.equal(find(state, "x")?.amountMinor, 250);
  });

  it("editada en los dos en campos distintos, se compone campo a campo", () => {
    const base = book([line("x")]);
    const sv = book([line("x", { amountMinor: 300 })]);
    const lc = book([line("x", { concept: "suya" })]);
    const { state } = fuseBooks(base, side(sv, 3, "2026-11-22T10:00:00Z"), side(lc, 3, "2026-11-22T09:00:00Z"));
    assert.equal(find(state, "x")?.amountMinor, 300);
    assert.equal(find(state, "x")?.concept, "suya");
  });

  it("el mismo campo tocado por los dos: gana el libro más reciente", () => {
    const base = book([line("x")]);
    const sv = book([line("x", { amountMinor: 300 })]);
    const lc = book([line("x", { amountMinor: 400 })]);
    const { state } = fuseBooks(base, side(sv, 3, "2026-11-22T10:00:00Z"), side(lc, 3, "2026-11-22T12:00:00Z"));
    assert.equal(find(state, "x")?.amountMinor, 400);
  });

  it("la misma línea nueva en los dos lados queda una sola vez", () => {
    const base = book([]);
    const sv = book([line("n", { concept: "del servidor" })]);
    const lc = book([line("n", { concept: "del local" })]);
    const { state } = fuseBooks(base, side(sv, 1, "2026-11-22T10:00:00Z"), side(lc, 1, "2026-11-22T11:00:00Z"));
    assert.deepEqual(ids(state), ["n"]);
    assert.equal(find(state, "n")?.concept, "del local");
  });

  it("una línea que cambia de mes en un lado vive solo en el mes nuevo", () => {
    const base = book([line("x")]);
    const moved = line("x", { monthKey: "2026-12" });
    const lc = { ...book([]), months: { "2026-12": { lines: [moved] } } } as unknown as LedgerState;
    const { state } = fuseBooks(base, side(book([line("x")]), 2, "2026-11-22T10:00:00Z"), side(lc, 3, "2026-11-22T11:00:00Z"));
    assert.deepEqual(ids(state), ["x"]);
    assert.equal(state.months["2026-11"], undefined);
    assert.equal(state.months["2026-12"]?.lines[0]?.id, "x");
  });
});

describe("fuse · lo borrado se borra definitivamente", () => {
  it("borrada en un lado y limpia en el otro: desaparece y deja lápida firmada", () => {
    const base = book([line("x"), line("y")]);
    const lc = book([line("y")]);
    const { state } = fuseBooks(base, side(book([line("x"), line("y")]), 2, "2026-11-22T10:00:00Z"), side(lc, 3, "2026-11-22T11:00:00Z", "cuenta-local"));
    assert.deepEqual(ids(state), ["y"]);
    assert.deepEqual(tombstonesOf(state), [{ id: "x", at: "2026-11-22T11:00:00Z", by: "cuenta-local" }]);
  });

  it("borrada en un lado y EDITADA en el otro: borrar gana", () => {
    const base = book([line("x")]);
    const sv = book([line("x", { concept: "editada tras el borrado" })]);
    const { state } = fuseBooks(base, side(sv, 3, "2026-11-22T12:00:00Z"), side(book([]), 3, "2026-11-22T11:00:00Z", "cuenta-local"));
    assert.deepEqual(ids(state), []);
    assert.equal(tombstonesOf(state).length, 1);
  });

  it("con lápida en un lado, la copia vieja del otro no resucita nada", () => {
    const base = book([line("x")]);
    const sv = book([line("y")], { tombstones: [{ id: "x", at: "2026-11-21T09:00:00Z", by: "cuenta-servidor" }] });
    const lc = book([line("x", { concept: "copia vieja editada" })]);
    const { state } = fuseBooks(base, side(sv, 4, "2026-11-22T10:00:00Z"), side(lc, 2, "2026-11-20T10:00:00Z"));
    assert.deepEqual(ids(state), ["y"]);
    assert.deepEqual(tombstonesOf(state), [{ id: "x", at: "2026-11-21T09:00:00Z", by: "cuenta-servidor" }]);
  });

  it("withTombstone quita la línea y firma el hecho, una sola vez", () => {
    const once = withTombstone(book([line("x"), line("y")]), "x", "yo", "2026-11-22T10:00:00Z");
    assert.deepEqual(ids(once), ["y"]);
    const twice = withTombstone(once, "x", "yo", "2026-11-22T10:05:00Z");
    assert.equal(tombstonesOf(twice).length, 1);
    assert.equal(tombstonesOf(twice)[0]?.at, "2026-11-22T10:05:00Z");
  });

  it("withTombstone compone el paso: la instrucción de pago automático migra a la instancia viva", () => {
    // La ley de la ola 25 para toda puerta que borra: si la línea
    // borrada portaba la instrucción de su serie, esta no muere con
    // ella — migra a la instancia más nueva que queda.
    const older = line("vieja", { kind: "subscription", seriesId: "serie-1", monthKey: "2026-10", bookedOn: "2026-10-15", nextDue: "2026-11-15" });
    const newest = line("nueva", { kind: "subscription", seriesId: "serie-1", monthKey: "2026-11", bookedOn: "2026-11-15", nextDue: "2026-12-15", autopay: true, autopayAccountId: "acct-1" });
    const s = { ...book([]), months: { "2026-10": { lines: [older] }, "2026-11": { lines: [newest] } } } as unknown as LedgerState;
    const after = withTombstone(s, "nueva", "yo", "2026-11-22T10:00:00Z");
    assert.deepEqual(ids(after), ["vieja"]);
    const migrated = find(after, "vieja");
    assert.equal(migrated?.autopay, true);
    assert.equal(migrated?.autopayAccountId, "acct-1");
  });
});

describe("fuse · estructura y ajustes por revisión mayor", () => {
  it("la revisión mayor trae su estructura; a igual revisión y diferencia, conflicto", () => {
    const base = book([line("x")]);
    const svStruct = { base: "USD", categories: [{ id: "del-servidor" }], catalog: [], purchases: [] };
    const lcStruct = { base: "USD", categories: [{ id: "del-local" }], catalog: [], purchases: [] };
    const sv = book([line("x")], { structure: svStruct as never });
    const lc = book([line("x")], { structure: lcStruct as never });
    const win = fuseBooks(base, side(sv, 2, "2026-11-22T10:00:00Z"), side(lc, 5, "2026-11-22T09:00:00Z"));
    assert.equal((win.state.structure.categories[0] as { id: string }).id, "del-local");
    assert.equal(win.conflict, false);
    const tied = fuseBooks(base, side(sv, 3, "2026-11-22T10:00:00Z"), side(lc, 3, "2026-11-22T11:00:00Z"));
    assert.equal(tied.conflict, true);
  });
});

describe("libro compartido · C3: el papel del servidor y la costura", () => {
  const sql = readFileSync(new URL("../../../shared-push.sql", import.meta.url), "utf8");
  const shared = readFileSync(new URL("../../../shared.sql", import.meta.url), "utf8");
  const cloud = readFileSync(new URL("../../spa/cloud.ts", import.meta.url), "utf8");
  const defaults = readFileSync(new URL("./defaults.ts", import.meta.url), "utf8");

  it("el filtro de alcance es UNA implementación: faro_scoped, y la lectura lo usa", () => {
    assert.match(sql, /function public\.faro_scoped\(book jsonb, m_scope jsonb\)/);
    assert.match(sql, /return public\.faro_scoped\(book, m_scope\)::text/);
    // El cuerpo de faro_shared_book ya no filtra en línea: llama al filtro único.
    const body = sql.slice(sql.indexOf("function public.faro_shared_book"), sql.indexOf("function public.faro_shared_push"));
    assert.doesNotMatch(body, /jsonb_each/);
    assert.match(body, /faro_scoped\(book, m_scope\)/);
    assert.match(shared, /function public\.faro_shared_book\(p_owner uuid\)/);
  });

  it("el empuje exige membresía activa y papel de anotar, y arbitra por revisión base", () => {
    assert.match(sql, /function public\.faro_shared_push\(p_owner uuid, p_data text, p_base_revision integer\)/);
    assert.match(sql, /where book_owner = p_owner and member = uid and status = 'active'/);
    assert.match(sql, /if m_role <> 'note' or p_base_revision is distinct from cur_rev/);
    assert.match(sql, /security definer set search_path = public/);
  });

  it("el empalme deja intacto lo fuera del alcance y las lápidas no salen de él", () => {
    assert.match(sql, /where not \(cats \? \(l ->> 'categoryId'\)\)/);
    assert.match(sql, /kept \|\| mine/);
    // Una línea guardada fuera del alcance protege su id de duplicados.
    assert.match(sql, /jsonb_array_elements\(kept\) k where k ->> 'id' = l ->> 'id'/);
  });

  it("la costura pushSharedBook y la puerta del cargador para las lápidas", () => {
    assert.match(cloud, /export async function pushSharedBook\(ownerId: string, book: unknown, baseRevision: number\)/);
    assert.match(cloud, /supabase\.rpc\("faro_shared_push"/);
    assert.match(defaults, /if \(s\.tombstones !== undefined\)/);
  });
});
