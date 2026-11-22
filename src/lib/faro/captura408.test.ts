/**
 * captura408 — La cámara del widget y la auditoría de sus promesas (Oscar,
 * 2026-11-22; cuatro cacerías sobre los tres widgets): el widget gana su
 * tercer botón (la cámara: foto → recibo → la revisión de siempre), y las
 * siete promesas rotas quedan curadas — «Próximo pago» nombra lo vencido,
 * la hora de la foto se pinta también en el teléfono, la escalada de avisos
 * avisa cada etapa, el cierre de mes no se pierde, el parte del empujón
 * lleva el veredicto del shell, la coma decimal no infla ×100, y el
 * selector de widgets ya no inventa cifras en sus vistas previas.
 * La cáscara no se compila aquí: estas cercas leen su fuente, como las de
 * la tarjeta del widget, y la ola declara que el botón llega con el APK.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const SHELL = "../../../android/app/src/main";
const widgets = read(`${SHELL}/java/com/oscarvelz/faro/FaroWidgets.kt`);
const notify = read(`${SHELL}/java/com/oscarvelz/faro/FaroNotify.kt`);
const quick = read(`${SHELL}/java/com/oscarvelz/faro/QuickAdd.kt`);
const main = read(`${SHELL}/java/com/oscarvelz/faro/MainActivity.kt`);
const capture = read(`${SHELL}/java/com/oscarvelz/faro/CapturePhotoActivity.kt`);
const manifest = read(`${SHELL}/AndroidManifest.xml`);
const head = read(`${SHELL}/res/layout/w_part_head.xml`);

describe("408 · la cámara del widget", () => {
  it("la cabecera compartida lleva el tercer botón, con su placa y su glifo", () => {
    assert.ok(head.includes('android:id="@+id/w_add_cam"'), "el botón de cámara en la cabecera");
    assert.ok(head.includes("@drawable/w_btn_cam") && head.includes("@drawable/w_ic_cam"), "su placa y su glifo propios");
    assert.ok(head.includes("@string/w_add_cam"), "su nombre accesible");
  });
  it("el botón levanta la actividad-isla de la cámara, no la app entera", () => {
    assert.ok(widgets.includes("fun cameraIntent"), "el intent de la cámara existe");
    assert.ok(widgets.includes("CapturePhotoActivity::class.java"), "apunta a la isla");
    assert.ok(widgets.includes("v.setOnClickPendingIntent(R.id.w_add_cam, FaroWidgets.cameraIntent(ctx))"), "hero() lo conecta");
    assert.ok(manifest.includes('android:name=".CapturePhotoActivity"'), "la isla está declarada");
    assert.ok(manifest.includes('android:taskAffinity=""'), "vive en su propia tarea");
  });
  it("la isla abre la cámara del teléfono y entrega la foto como recibo", () => {
    assert.ok(capture.includes("MediaStore.ACTION_IMAGE_CAPTURE"), "la cámara del sistema, sin permiso CAMERA");
    assert.ok(capture.includes("FileProvider.getUriForFile"), "la foto por FileProvider");
    assert.ok(capture.includes('EXTRA_HINT, "receipt"'), "la pista: esto es un recibo");
    assert.ok(main.includes('getStringExtra(CapturePhotoActivity.EXTRA_HINT)'), "MainActivity recoge la pista");
    assert.ok(main.includes("fun shareHint(): String"), "el puente la ofrece a la página");
  });
  it("la página abre la foto de la cámara directa en el escaneo de recibos", () => {
    const inbox = read("../../components/faro/share-inbox.tsx");
    assert.ok(inbox.includes('hint === "receipt" && has("inbox.image-receipt") ? "receipt" : "ask"'), "directa al recibo cuando su puerta vive en el modo");
    const nat = read("../../spa/native.ts");
    assert.ok(nat.includes("shareHint?(): string"), "la firma del puente declara la pista");
  });
});

describe("408 · las promesas del widget, curadas", () => {
  it("«Próximo pago» nombra lo vencido: sin filtro que lo esconda", () => {
    assert.ok(!widgets.includes(".filter { it.second >= 0 }.minByOrNull"), "el filtro que escondía lo vencido no existe");
    assert.ok(widgets.includes("if (days < 0) R.color.w_bad else if (days <= 3)"), "lo vencido en su color");
  });
  it("la hora de la foto se pinta en el teléfono y en Vencimientos", () => {
    assert.ok(head.includes('android:id="@+id/w_stamp"'), "el sello vive en la cabecera del teléfono");
    const dues = read(`${SHELL}/res/layout/w_dues.xml`);
    assert.ok(dues.includes('android:id="@+id/w_stamp"'), "el sello vive en Vencimientos");
    assert.ok(widgets.includes("v.setTextViewText(R.id.w_stamp, Fmt.clock(s.at, s.en))"), "se pinta desde la foto");
  });
  it("cada etapa del aviso avisa la suya", () => {
    assert.ok(notify.includes('val stage = when { days < 0 -> "over"; days == 0 -> "today"; else -> "soon" }'), "la etapa se calcula");
    assert.ok(notify.includes('val key = "due|${d.name}|${d.on}|$stage"'), "la llave lleva la etapa");
  });
  it("el cierre de mes se recupera: todo mes cerrado sin reportar se reporta", () => {
    assert.ok(notify.includes("s.flow.filter { it.key < now }.sortedBy { it.key }"), "se juzgan todos los meses cerrados");
    assert.ok(!notify.includes("val prev = monthKey(-1)"), "ya no se mira solo el mes anterior");
  });
  it("el parte del empujón lleva el veredicto del shell", () => {
    assert.ok(widgets.includes("fun save(ctx: Context, json: String): Boolean"), "save devuelve su veredicto");
    assert.ok(main.includes('fun setWidgetData(json: String): String'), "el puente lo devuelve a la página");
    assert.ok(main.includes('"rejected"'), "el rechazo tiene nombre");
    const host = read("../../components/faro/widget-host.tsx");
    assert.ok(host.includes("verdictFields(verdict)"), "el parte registra el veredicto");
    const wt = read("./widget.ts");
    assert.ok(wt.includes('shell?: "ok" | "rejected"'), "el parte guarda el veredicto");
  });
  it("la coma decimal no infla el monto", () => {
    assert.ok(quick.includes("private fun normalizeAmount(raw: String): String?"), "la normalización existe");
    assert.ok(!quick.includes('val t = text.trim().replace(",", "")'), "la coma ya no se tira sin más");
    assert.ok(quick.includes("raw.lastIndexOf(',') > raw.lastIndexOf('.')"), "con dos separadores manda el último");
  });
});

describe("408 · el refinamiento de la luz y el lápiz (sus fotos de Casa/Viaje y las píldoras)", () => {
  const fund = read("../../components/faro/fund.css");
  const styles = read("../../styles.css");
  it("la luz baja un 8%: 5.5px en la casa, 4.6px en las píldoras", () => {
    assert.ok(fund.includes("width: 5.5px; height: 5.5px; border-radius: 50%;"), "la casa a 5.5px");
    assert.ok(fund.includes(".save-seg .fund-light { width: 4.6px; height: 4.6px; }"), "la píldora a 4.6px");
  });
  it("el lápiz baja un 6% en su única clase, con su glifo", () => {
    assert.ok(styles.includes(".bank-pencil { width: 11.3px; height: 11.3px;"), "la caja a 11.3px");
    assert.ok(styles.includes(".bank-pencil svg { width: 8px; height: 8px; }"), "el glifo a 8px");
  });
  it("las letras de las píldoras suben un poco y la píldora respira", () => {
    // ENMIENDA (banco de la 408): la regla que MANDA sobre el nombre es el
    // clamp del hijo directo (:2330) — al ancho telefónico su suelo .62rem
    // era el tamaño (9.9px medidos). El suelo sube a .74rem y la tasa a
    // 13cqi; la gemela de contenedor estrecho lleva el mismo suelo. Las
    // reglas .save-seg strong sin «>» volvieron a su valor (no mandan).
    assert.ok(styles.includes("font-size: clamp(.74rem, 13cqi, .98rem);"), "el nombre: suelo .74rem, tasa 13cqi");
    assert.ok(styles.includes("html:not([data-theme=\"tron\"]) .save-seg > strong { padding-inline: 2px; font-size: .74rem;"), "la gemela estrecha con el mismo suelo");
    assert.ok(styles.includes(".save-seg { padding: 7px 6px 11px; }"), "el aire nuevo de la píldora");
  });
});

describe("408 · el selector ya no inventa cifras", () => {
  it("los tres proveedores apuntan a vistas previas dedicadas", () => {
    assert.ok(read(`${SHELL}/res/xml/w_phone_info.xml`).includes("@layout/w_preview_phone"), "teléfono");
    assert.ok(read(`${SHELL}/res/xml/w_panel_info.xml`).includes("@layout/w_preview_panel"), "panel");
    assert.ok(read(`${SHELL}/res/xml/w_dues_info.xml`).includes("@layout/w_preview_dues"), "vencimientos");
  });
  it("las parciales compartidas ya no llevan cifras, comercios ni fechas de ejemplo", () => {
    for (const f of ["w_part_hero.xml", "w_part_cells.xml", "w_part_dues.xml", "w_part_dues_xl.xml", "w_phone_s.xml"]) {
      const x = read(`${SHELL}/res/layout/${f}`);
      for (const fake of ["Netflix", "$1,585.56", "$15.99", "en 3 d", "$3,473.04", "$1,887.48", "$612.40", "$1,920.00", "$300.00", "86%", "54%"])
        assert.ok(!x.includes(fake), `${f} ya no dice ${fake}`);
    }
  });
  it("las vistas previas enseñan la cara de montos ocultos", () => {
    for (const f of ["w_preview_phone.xml", "w_preview_panel.xml", "w_preview_dues.xml"]) {
      const x = read(`${SHELL}/res/layout/${f}`);
      assert.ok(x.includes("• • • •"), `${f} lleva la cara de montos ocultos`);
      assert.ok(!x.includes("Netflix") && !x.includes("$1"), `${f} no inventa cifras`);
    }
    assert.ok(read(`${SHELL}/res/layout/w_preview_phone.xml`).includes("@string/w_hidden"), "la línea de montos ocultos, la de verdad");
  });
});
