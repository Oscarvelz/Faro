/**
 * 1.3.235 «El cristal» + la isla: la tarjeta de apunte rápido vive en SU PROPIA tarea
 * (taskAffinity="") para que jamás arrastre la app detrás; la página renueva la foto del
 * widget en cada primer plano, cambie algo o no; y el acabado de cristal — tarjeta, opciones
 * y widgets — vive en los tokens y capas declarados, sin tocar función ni textos.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const manifest = read("android/app/src/main/AndroidManifest.xml");
const host = read("src/components/faro/widget-host.tsx");
const quick = read("android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt");
const colorsDay = read("android/app/src/main/res/values/w_colors.xml");
const colorsNight = read("android/app/src/main/res/values-night/w_colors.xml");

const glassTokens = (xml: string) =>
  [...xml.matchAll(/name="(w_glass_[a-z_]+|w_btn_(?:hi|lo))"/g)].map((m) => m[1]).sort();

describe("1.3.235 la isla y la foto siempre fresca", () => {
  it("la tarjeta es una isla: su actividad no comparte afinidad con la app", () => {
    const block = manifest.match(/<activity android:name="\.QuickAddActivity"[\s\S]*?\/>/)?.[0] ?? "";
    assert.ok(block.includes('android:taskAffinity=""'), "sin taskAffinity la tarjeta cae en la tarea de MainActivity y arrastra la app");
    assert.ok(block.includes('android:excludeFromRecents="true"'));
    assert.ok(block.includes('android:noHistory="true"'));
  });

  it("la página renueva la foto en cada primer plano, no solo cuando algo cambia", () => {
    const feed = host.slice(host.indexOf("// Feed the widgets."), host.indexOf("// Taps on the widget."));
    assert.ok(feed.includes('window.addEventListener("faronative-resume", now)'), "el feed escucha el onResume del shell");
    assert.ok(feed.includes('window.addEventListener("focus", now)'), "el feed escucha el foco");
    assert.ok(
      /visibilityState === "hidden" \|\| document\.visibilityState === "visible"\) now\(\)/.test(feed),
      "visible vuelve a empujar la foto (antes solo empujaba hidden y el cambio de estado)",
    );
    assert.ok(feed.includes("if (sampleOn()) return;"), "el modo de ejemplo sigue sin tocar la foto real");
  });
});

describe("1.3.235 el cristal", () => {
  it("los tokens de cristal existen en día y en noche, en paridad exacta", () => {
    const day = glassTokens(colorsDay);
    const night = glassTokens(colorsNight);
    assert.ok(day.length >= 12, "el set de tokens está completo");
    assert.deepEqual(day, night);
  });

  it("el fondo del widget es la pila de cristal declarada (día fijo y radios del sistema en 31+)", () => {
    for (const f of ["drawable/w_bg.xml", "drawable/w_bg_s.xml", "drawable/w_bg_xl.xml"]) {
      const xml = read(`android/app/src/main/res/${f}`);
      assert.ok(xml.includes("<layer-list"), f);
      for (const tok of ["w_glass_hair", "w_glass_rim", "w_glass_top", "w_glass_mid", "w_glass_bot", "w_glass_fall", "w_glass_seat"])
        assert.ok(xml.includes(`@color/${tok}`), `${f} usa ${tok}`);
    }
    const v31 = read("android/app/src/main/res/drawable-v31/w_bg.xml");
    assert.ok(v31.includes("@android:dimen/system_app_widget_inner_radius"), "en 31+ las capas internas toman el radio del sistema");
    assert.ok(v31.includes("@dimen/w_radius"), "el radio exterior sigue a w_radius (el del sistema en 31+)");
  });

  it("cada tamaño lleva su fondo: S el suyo, paneles L/XL el de panel, el resto el estándar", () => {
    const bg = (f: string) => read(`android/app/src/main/res/layout/${f}`).match(/android:background="@drawable\/(w_bg[a-z_]*)"/)?.[1];
    assert.equal(bg("w_phone_s.xml"), "w_bg_s");
    assert.equal(bg("w_panel_l.xml"), "w_bg_xl");
    assert.equal(bg("w_panel_xl.xml"), "w_bg_xl");
    assert.equal(bg("w_phone_m.xml"), "w_bg");
    assert.equal(bg("w_panel_m.xml"), "w_bg");
    assert.equal(bg("w_dues.xml"), "w_bg");
  });

  it("la tarjeta y las opciones llevan el cristal — y la función sigue intacta", () => {
    for (const s of ["glassCardBg", "LayerDrawable", "ViewOutlineProvider", "wrapCard", "StateListDrawable", "buttonTintList", "chipBg", "rowSelector"])
      assert.ok(quick.includes(s), `QuickAdd.kt usa ${s}`);
    // Las cercas de función de 233/234 siguen en pie tal cual.
    assert.ok(quick.includes("FaroWidgets.load(this)"));
    assert.ok(quick.includes("QuickAdd.enqueue("));
    assert.ok(!quick.includes("faro_ledgers"));
    assert.ok(!quick.includes("supabase"));
  });
});
