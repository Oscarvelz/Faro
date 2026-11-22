/* ═══ LIBRO COMPARTIDO · PIEZA C2 (1.3.391): LOS ALCANCES SE CUMPLEN EN
 * EL SERVIDOR.
 *
 * La cerca 1 del brief: el alcance se cumple en el servidor, no en la
 * pantalla. Esta cerca clava el papel (shared.sql) y la costura
 * (fetchSharedBook): la única puerta del miembro es faro_shared_book;
 * sin membresía ACTIVA la respuesta es null; con alcance de categorías,
 * las líneas se filtran por categoryId dentro de los meses, el mes
 * vacío no viaja, las categorías y las tiendas se recortan a lo que el
 * alcance nombra; y hay cosas que no viajan NUNCA — los ajustes del
 * dueño, su auditoría y su bandeja — ni con alcance entero. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const sql = readFileSync(new URL("../../../shared.sql", import.meta.url), "utf8");
const cloud = readFileSync(new URL("../../spa/cloud.ts", import.meta.url), "utf8");

describe("libro compartido · C2: el papel del servidor", () => {
  it("la puerta es una sola función, con security definer y solo autenticados", () => {
    assert.match(sql, /function public\.faro_shared_book\(p_owner uuid\)/);
    assert.match(sql, /security definer set search_path = public/);
    assert.match(sql, /grant execute on function public\.faro_shared_book\(uuid\) to authenticated/);
    assert.match(sql, /revoke all on function public\.faro_shared_book\(uuid\) from public, anon/);
  });

  it("sin membresía activa no hay libro: null, y el dueño no usa esta puerta", () => {
    assert.match(sql, /where book_owner = p_owner and member = uid and status = 'active'/);
    assert.match(sql, /if m_scope is null then return null/);
    assert.match(sql, /if p_owner = uid then return null/);
  });

  it("el alcance de categorías filtra las líneas por categoryId, mes a mes", () => {
    assert.match(sql, /jsonb_each\(coalesce\(book -> 'months'/);
    assert.match(sql, /where cats \? \(l ->> 'categoryId'\)/);
    // El mes que queda vacío no viaja.
    assert.match(sql, /if jsonb_array_length\(filtered\) > 0 then/);
  });

  it("categorías y tiendas también se recortan a lo que el alcance nombra", () => {
    assert.match(sql, /where cats \? \(c ->> 'id'\)/);
    assert.match(sql, /where store_ids \? \(s ->> 'id'\)/);
    // La compra vigilada sin categoría no se puede probar en el alcance.
    assert.match(sql, /where cats \? \(p ->> 'categoryId'\)/);
  });

  it("lo que nunca viaja: ajustes, auditoría y bandeja del dueño", () => {
    assert.match(sql, /book - 'settings' - 'audit' - 'drafts'/);
    // Y la copia construida lleva solo la lista permitida.
    assert.match(sql, /jsonb_build_object\(\s*'v', book -> 'v',\s*'revision', book -> 'revision',\s*'updatedAt', book -> 'updatedAt',\s*'months', out_months,\s*'structure', out_struct\s*\)/);
  });
});

describe("libro compartido · C2: la costura del cliente", () => {
  it("fetchSharedBook pide por la RPC y degrada a null sin fingir", () => {
    assert.match(cloud, /export async function fetchSharedBook\(ownerId: string\): Promise<unknown \| null>/);
    assert.match(cloud, /supabase\.rpc\("faro_shared_book", \{ p_owner: ownerId \}\)/);
    assert.match(cloud, /if \(error \|\| typeof data !== "string"\) return null/);
    assert.match(cloud, /return JSON\.parse\(data\) as unknown/);
  });
});
