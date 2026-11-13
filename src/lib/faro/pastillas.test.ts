// 1.3.249 — «La vuelta suave» (Oscar, 2026-11-13 16:33 EST): la transición
// Archivo → Historial de las pastillas de Folios «está demasiado fuerte»;
// la ida estaba bien. El censo lo probó en el código: el colocador de la
// píldora era el del par de Estudio, pero el ASIENTO no — Estudio⇄Asesor
// vive en el padre persistente (shell.tsx) y su píldora sobrevive al cambio
// de pantalla, así que su transform transiciona de asiento a asiento en el
// reloj compartido de .38s en las dos direcciones. Las pastillas de Folios
// vivían DENTRO de cada pantalla: a cada cambio la píldora renacía en su
// reposo CSS (sobre la primera pastilla — Historial — y con ancho cero) y
// el colocador la llevaba al destino desde ahí. Hacia Archivo el
// renacimiento se disfrazaba de deslizamiento; la vuelta a Historial nacía
// ya sentada y solo crecía de ancho en el sitio, con el brillo encima: el
// golpe. Estas cercas guardan la cura: el par se sienta en el padre, las
// pantallas ya no lo renderizan, y ni el colocador ni el reloj se tocan.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const shell = fs.readFileSync(new URL("../../components/faro/shell.tsx", import.meta.url), "utf8");
const historial = fs.readFileSync(new URL("../../components/faro/historial.tsx", import.meta.url), "utf8");
const archivo = fs.readFileSync(new URL("../../components/faro/archivo.tsx", import.meta.url), "utf8");
const chips = fs.readFileSync(new URL("../../components/faro/folios-chips.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

const count = (src: string, needle: string) => src.split(needle).length - 1;

test("pastillas: ninguna pantalla de Folios renderiza ya el par (la píldora renacía en cada una)", () => {
  assert.equal(count(historial, "<FoliosChips"), 0, "HistorialScreen must not render the pair");
  assert.equal(count(archivo, "<FoliosChips"), 0, "ArchivoScreen must not render the pair");
  assert.ok(!historial.includes('from "./folios-chips"'), "Historial keeps no chips import");
  assert.ok(!archivo.includes('from "./folios-chips"'), "Archivo keeps no chips import");
});

test("pastillas: shell.tsx sienta el par en el padre persistente, en sus dos <main>, abriendo la rama folios", () => {
  const branch = '<><FoliosChips />{ui.section === "archivo" ? <ArchivoScreen /> : <HistorialScreen />}</>';
  assert.equal(count(shell, branch), 2, "both mains (Shell + SectionView) seat the chips before the swapping screen");
  assert.ok(shell.includes('import { FoliosChips } from "./folios-chips";'), "the shell imports the pair");
});

test("pastillas: el par conserva su identidad — las mismas clases, el mismo rol, las mismas dos secciones", () => {
  assert.ok(chips.includes('className="seg is-follow is-pair fol-chips"'), "the chips keep their settled dress");
  assert.ok(chips.includes('role="tablist"'), "the chips keep their tablist role");
  assert.ok(chips.includes('["historial", "archivo"]'), "the pair is still Historial + Archivo");
  assert.ok(chips.includes('<i className="seg-pill" aria-hidden />'), "the follower pill is still the pair's own");
});

test("pastillas: el colocador queda intacto — medir, trasladar, y el brillo que renace con la clase", () => {
  assert.ok(chips.includes("pill.style.width = `${current.offsetWidth}px`;"), "the placer still measures the current button's width");
  assert.ok(chips.includes("pill.style.transform = `translate3d(${current.offsetLeft}px, ${current.offsetTop}px, 0)`;"), "the placer still translates the pill onto the current button");
  assert.ok(chips.includes('pill.classList.remove("is-gliding");'), "the gliding restart still opens the placement");
  assert.ok(chips.includes('pill.classList.add("is-gliding");'), "the gliding restart still closes the placement");
  assert.ok(chips.includes("}, [ui.section]);"), "the placer still answers to the section alone");
});

test("pastillas: el reloj compartido de la píldora no se mueve — .38s, la curva de la casa", () => {
  assert.ok(
    css.includes("transition: transform .38s cubic-bezier(.22, 1, .36, 1), width .38s cubic-bezier(.22, 1, .36, 1);"),
    "the .seg-pill transition is the shared clock both pairs ride",
  );
});

test("pastillas: el par de Estudio no se toca — sus dos asientos en shell.tsx quedan como estaban", () => {
  assert.equal(count(shell, 'aria-label={t("hub.study")}'), 2, "the study pair still renders in both parents");
  assert.equal(count(shell, '<div className="seg is-follow is-pair" ref={segRef} role="tablist"'), 2, "the study pair keeps its own seg, untouched");
});
