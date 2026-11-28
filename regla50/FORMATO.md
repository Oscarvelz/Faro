# REGLA DE 50, LÍNEA WINDOWS — FORMATO DEL BANCO Y DEL CORREDOR (Paso 2)

Infraestructura construida sobre la copia `faro-regla50-work` (canon
1.3.522). Nada de esta carpeta entra en el paquete de la app: es el banco
de examen de la línea, no código de Faro.

## El banco: un archivo JSON por sección

Cada entrada es UNA pregunta, con su par bilingüe nacido junto (regla 4):

```json
{
  "id": "EC-01",
  "seccion": "eliminar-cuenta",
  "clase": "construccion",
  "familia": "consecuencia",
  "es": "¿Qué pasa con mi libro si borro la cuenta?",
  "en": "What happens to my book if I delete the account?",
  "esperada": { "...": "ver abajo" }
}
```

- `id`: prefijo de la sección + número. Único en todo el banco.
- `seccion`: una de las 12 del mapa del Paso 1.
- `clase`: `construccion` (35 por sección) o `sellada` (15 por sección,
  escritas por OTRA MANO, nunca por esta línea; regla 2).
- `familia`: una del censo del Paso 1 (identidad, consecuencia, deshacer,
  destino, navegacion, signos, bloqueado, guardado, alcance) o `frontera`.
- `es` / `en`: las dos formas de la pregunta, escritas a la vez.

## La respuesta esperada, fijada antes de correr (regla 1)

Dos formas, y ninguna otra:

**Cuando una ventana responde** — la respuesta vive en un tema del Manual:

```json
"esperada": {
  "tipo": "tema",
  "tema": "cifra-corta",
  "superficie": "screens.tsx",
  "citaEs": "K quiere decir mil: C$1.65K son C$1,650.",
  "citaEn": "K means thousand: C$1.65K is C$1,650."
}
```

- `tema`: el id del tema que responde.
- `superficie`: el archivo de `src/components/faro/` donde el tema está
  sentado (una burbuja `<Hint topic=…>`, el `topic=` de un pliegue, o el
  asiento propio de la sección). La superficie `"manual"` declara que el
  asiento es el Manual mismo (la pregunta se hace dentro del Manual).
- `citaEs` / `citaEn`: la frase de la respuesta, **copiada palabra por
  palabra** del `what` o del `bubble` del tema, en cada idioma. La cita es
  la respuesta esperada: si el texto del tema cambia, la cita deja de
  estar y la pregunta cae — así la regresión se ve, no se opina.

**Cuando la ventana misma responde** — su texto vive en su propio
diccionario o en el i18n, no en un tema:

```json
"esperada": {
  "tipo": "ventana",
  "archivo": "src/spa/words.ts",
  "citaEs": "No se puede deshacer.",
  "citaEn": "This cannot be undone."
}
```

El corredor comprueba las dos citas, palabra por palabra, en el archivo
nombrado. La ventana es un asiento: su texto es la respuesta que el
usuario lee antes de actuar.

**Cuando la respuesta verdadera no vive en ninguna superficie** — el
hueco que acusa la pregunta:

```json
"esperada": {
  "tipo": "hueco",
  "citaEs": "Si el libro compartido es tuyo, se borra con tu cuenta.",
  "citaEn": "If the shared book is yours, it is deleted with your account.",
  "nota": "Ningún tema ni la ventana lo dicen; la verdad sale del código."
}
```

La cita es la frase verdadera que la ayuda debe llegar a decir, fijada
antes de correr desde la verdad del código. El corredor comprueba que la
cita **no está** en ningún tema ni en los diccionarios: si estuviera, no
sería hueco. Un hueco no es un acierto ni una caída: es la lista de
construcción de la sección. Al curarlo, la entrada se reescribe como
`tema` o `ventana` con la misma cita y el asiento construido, y el acta
de la sección registra la conversión. Ninguna sección cierra con huecos
sin convertir: cada uno se cura o se reclasifica `frontera` con su razón
escrita.

**Cuando ninguna ventana puede responder** — la abstención honesta:

```json
"esperada": {
  "tipo": "frontera",
  "razon": "nadie",
  "nota": "Faro no paga tarjetas; ninguna ventana lo hace ni lo explica."
}
```

- `razon`: `nadie` (ninguna superficie lo hace), `otra-seccion` (lo
  responde otra sección, y esta debe callar o señalar), `falta-dato`
  (el libro no guarda ese dato).
- Cuota de la regla por sección: al menos 8 frontera de las 35 de
  construcción y 4 de las 15 selladas.

## El corredor: `corredor.ts`

    node --import ./tools/ts-hook.mjs --experimental-strip-types regla50/corredor.ts regla50/<banco>.json [--cierre <seccion>]

Por cada entrada de construcción, comprueba de forma mecánica:

1. **El tema existe** en `MANUAL_TOPICS` (importado del árbol, no copiado).
2. **La cita está, palabra por palabra**, en el `what` o en el `bubble`
   del tema, en los dos idiomas. Si no está: cae, y el reporte nombra la
   familia y si era la forma tal cual.
3. **El asiento existe**: la superficie declarada contiene `topic="<id>"`
   (burbuja o pliegue). Si la superficie es `"manual"`, el asiento es la
   presencia del tema en el Manual.

Por cada entrada `frontera`, comprueba que declara razón y nota; la verdad
de la frontera se juzga al escribir el banco (es la respuesta esperada) y
el corredor la cuenta como abstención esperada, nunca como acierto del
motor.

**La disciplina del sellado es mecánica, no de memoria**: el corredor se
niega a correr entradas `sellada` salvo que se le pase
`--cierre <su sección>`. Al correrlas en su cierre, escribe sus ids en
`regla50/quemadas.json` con la fecha: el sellado se quema al leerse
(enmienda de Hark) y desde ahí esas entradas corren como material de
regresión, nunca más como examen. La regresión acumulada es correr todos
los bancos con sus quemadas: cero regresión permitida (regla 6).

**El reporte da conteos completos y finales** (la regla de Hark): por
sección y por familia, cuántas corrieron, cuántas bien, cuántas mal con su
nombre y su causa, y cuántas selladas quedaron sin correr. Nunca un conteo
parcial.

## El mapa de asientos

El corredor lee los asientos del árbol en cada corrida (busca `topic="…"`
en los componentes), así que el mapa de asientos nunca es una copia que
envejece: es el árbol mismo, leído en el momento de correr.
