// Oleada de botones 3 (1.3.172) — compartir hacia Faro.
// R5/R6/N4 (la ruta de compartir un contacto o un estado de cuenta hacia Faro, muerta en la
// carcasa) y la mitad web de R4 viven en el manifiesto, en MainActivity.kt y en componentes;
// sus pruebas son las sondas de banco probe172-a.mjs / probe172-b.mjs (rojas sobre la 1.3.171
// intacta, verdes aquí) y la traza del código de la carcasa. Aquí queda cercada la lógica pura
// que esas vías comparten: la regla de reparto de un archivo compartido (shareddocs.ts, la
// misma regla con la que sw.js ordena lo que llega por el share target web) y el cumpleaños
// del selector nativo, que viaja en la forma cruda del teléfono y se normaliza con el parser
// de fechas del lector de vCards antes de entrar por mergeContacts. Datos sintéticos solamente.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sharedDocKind } from "./shareddocs.ts";
import { parseVDate } from "./vcard.ts";
import { mergeContacts } from "./people.ts";
import type { Person } from "./types.ts";

const VCARD = "BEGIN:VCARD\nVERSION:3.0\nFN:Ana Ejemplo\nBDAY:1990-03-08\nEND:VCARD";
const CSV = "Date,Description,Amount\n2026-11-01,Compra,-10.00\n";

describe("el reparto de un archivo compartido: una vCard es contacto donde sea que llegue", () => {
  it("el contenido manda: texto de vCard con nombre y tipo de estado de cuenta es contacto", () => {
    assert.equal(sharedDocKind("estado.csv", "text/csv", VCARD), "contact");
  });

  it("un estado de cuenta sin ninguna señal de vCard es estado de cuenta", () => {
    assert.equal(sharedDocKind("estado.csv", "text/csv", CSV), "statement");
  });

  it("una vCard que no se anuncia en el contenido entra por su tipo declarado", () => {
    assert.equal(sharedDocKind("contacto", "text/vcard", ""), "contact");
    assert.equal(sharedDocKind("contacto", "text/x-vcard", ""), "contact");
  });

  it("una .vcf vacía o truncada va a Personas por su nombre, no al mapeador de estados", () => {
    assert.equal(sharedDocKind("ana.vcf", "application/octet-stream", ""), "contact");
    assert.equal(sharedDocKind("ANA.VCF", "", ""), "contact");
  });

  it("los estados de cuenta son estados de cuenta (csv, pdf, ofx)", () => {
    assert.equal(sharedDocKind("chase.csv", "text/csv", CSV), "statement");
    assert.equal(sharedDocKind("estado.pdf", "application/pdf", "%PDF-1.7 binary"), "statement");
    assert.equal(sharedDocKind("movimientos.ofx", "application/octet-stream", "<OFX>"), "statement");
    assert.equal(sharedDocKind("movimientos.qfx", "", "<OFX>"), "statement");
  });
});

describe("el cumpleaños del selector nativo se normaliza con el parser de vCard", () => {
  it("las formas crudas del teléfono (ContactsContract Event.START_DATE)", () => {
    assert.equal(parseVDate("1990-03-08"), "1990-03-08");
    assert.equal(parseVDate("19900308"), "1990-03-08");
    assert.equal(parseVDate("--03-08"), "1904-03-08"); // sin año: 1904, el año «desconocido» de vcard.ts
    assert.equal(parseVDate("--0308"), "1904-03-08");
    assert.equal(parseVDate(""), "");
    assert.equal(parseVDate("no-es-fecha"), "");
  });

  it("la persona elegida aterriza CON cumpleaños por mergeContacts", () => {
    let n = 0;
    const makeId = () => `id-${++n}`;
    const picked = [{ name: "Ana Ejemplo", birthday: parseVDate("1990-03-08"), dates: [] }];
    const r = mergeContacts([], picked, makeId);
    assert.equal(r.added, 1);
    assert.equal(r.people[0].birthday, "1990-03-08");
    assert.deepEqual(r.noBirthday, []);
  });

  it("sin cumpleaños en la elección (el permiso no lo cubrió), la persona llega y queda en la lista de «sin fecha»", () => {
    let n = 0;
    const makeId = () => `id-${++n}`;
    const picked = [{ name: "Luis Ejemplo", birthday: parseVDate(""), dates: [] }];
    const r = mergeContacts([], picked, makeId);
    assert.equal(r.added, 1);
    assert.equal(r.people[0].birthday, "");
    assert.deepEqual(r.noBirthday, ["Luis Ejemplo"]);
  });

  it("el cumpleaños elegido NO pisa uno que la persona ya tenía a mano", () => {
    let n = 0;
    const makeId = () => `id-${++n}`;
    const existing: Person[] = [{ id: "p1", name: "Ana Ejemplo", birthday: "1991-01-01", dates: [], note: "" }];
    const r = mergeContacts(existing, [{ name: "Ana Ejemplo", birthday: "1990-03-08", dates: [] }], makeId);
    assert.equal(r.people[0].birthday, "1991-01-01");
  });
});
