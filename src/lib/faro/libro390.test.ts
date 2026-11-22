/* ═══ LIBRO COMPARTIDO · PIEZA C1 (1.3.390): LA MEMBRESÍA EN EL SERVIDOR.
 *
 * La pieza es papel de servidor (memberships.sql, que se pega en el
 * editor SQL de Supabase como backups.sql) + la costura del cliente
 * (src/spa/cloud.ts). Esta cerca clava el papel y la costura: la tabla
 * con su alcance y su papel; la lectura solo de los propios; TODA
 * escritura por RPC con security definer; la invitación con su
 * vencimiento de 30 días y el tope de 10 personas; la aceptación atada
 * al correo de la sesión (el enlace no es llave); la transferencia a
 * quien anota y solo cuando acepta. Y la costura degrada con gracia:
 * sin la pieza aplicada, nada finge compartir. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const sql = readFileSync(new URL("../../../memberships.sql", import.meta.url), "utf8");
const cloud = readFileSync(new URL("../../spa/cloud.ts", import.meta.url), "utf8");

describe("libro compartido · C1: el papel del servidor", () => {
  it("la tabla guarda alcance, papel, estado y vencimiento", () => {
    assert.match(sql, /create table if not exists public\.faro_memberships/);
    assert.match(sql, /scope\s+jsonb/);
    assert.match(sql, /role\s+text[^;]*check \(role in \('note', 'view'\)\)/);
    assert.match(sql, /status\s+text[^;]*check \(status in \('pending', 'active'\)\)/);
    assert.match(sql, /expires_at\s+timestamptz[^,]*interval '30 days'/);
    assert.match(sql, /book_owner\s+uuid not null references auth\.users/);
  });

  it("la lectura es solo de los propios y nadie escribe directo", () => {
    assert.match(sql, /enable row level security/);
    assert.match(sql, /for select to authenticated\s+using \(book_owner = auth\.uid\(\) or member = auth\.uid\(\)\)/);
    assert.doesNotMatch(sql, /for (insert|update|delete) to authenticated/);
    assert.doesNotMatch(sql, /grant (insert|update|delete)/i);
  });

  it("las siete operaciones son RPC con security definer y solo para autenticados", () => {
    for (const fn of ["faro_invite", "faro_accept", "faro_cancel_invite", "faro_leave", "faro_remove", "faro_offer_transfer", "faro_accept_transfer"]) {
      assert.match(sql, new RegExp(`function public\\.${fn}\\(`), fn);
      assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\(`), fn);
    }
    assert.equal((sql.match(/security definer set search_path/g) ?? []).length, 7);
    assert.equal((sql.match(/revoke all on function/g) ?? []).length, 7);
  });

  it("invitar: ni a uno mismo, con tope de 10 personas (dueño + 9)", () => {
    assert.match(sql, /cannot invite yourself/);
    assert.match(sql, /if n >= 9 then raise exception 'book is full \(10 people\)'/);
    assert.match(sql, /already invited/);
    assert.match(sql, /already a member/);
  });

  it("aceptar: el enlace no es llave — la sesión debe ser el correo invitado y la invitación viva", () => {
    assert.match(sql, /if lower\(my_mail\) <> row_m\.email then return false/);
    assert.match(sql, /if row_m\.expires_at <= now\(\) then return false/);
  });

  it("transferir: oferta a quien ANOTA, y nada se mueve hasta que acepta", () => {
    assert.match(sql, /faro_offer_transfer[\s\S]*?role = 'note'/);
    assert.match(sql, /faro_accept_transfer[\s\S]*?row_m\.transfer_to is distinct from uid/);
    // Al pasar la batuta, el dueño anterior queda como miembro que anota.
    assert.match(sql, /faro_accept_transfer[\s\S]*?'note', 'active', now\(\)\)/);
  });
});

describe("libro compartido · C1: la costura del cliente", () => {
  it("cloud.ts expone la membresía completa y degrada con gracia", () => {
    for (const name of ["listMemberships", "inviteMember", "acceptInvite", "cancelInvite", "leaveMembership", "removeMember", "offerTransfer", "acceptTransfer"]) {
      assert.match(cloud, new RegExp(`(export (async )?function ${name}|export const ${name})`), name);
    }
    assert.match(cloud, /supabase\.rpc\("faro_invite"/);
    assert.match(cloud, /from\("faro_memberships"\)/);
    // La degradación: cada camino devuelve null/false ante el error.
    assert.match(cloud, /if \(error \|\| !Array\.isArray\(data\)\) return null/);
    assert.match(cloud, /return !error && data === true/);
  });

  it("el tipo Membership lleva alcance y papel con sus palabras", () => {
    assert.match(cloud, /scope: \{ all: true \} \| \{ cats: string\[\] \}/);
    assert.match(cloud, /role: "note" \| "view"/);
    assert.match(cloud, /status: "pending" \| "active"/);
  });
});
