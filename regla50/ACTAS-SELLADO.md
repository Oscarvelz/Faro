# ACTAS DEL EXAMEN SELLADO DE LA AYUDA — corridas en canon

Examen: ~/workspace/examen-sellado-faro-ayuda.md (mano independiente, chat 50).
Cada sección se corre una sola vez, en su cierre, contra el árbol de canon.
Al leerse, la sección se quema (quemadas-examen.json). La regresión
acumulada de cada cierre = los 12 bancos de construcción (420) + las
secciones ya quemadas, con cero regresión permitida.

Escala de juicio: BIEN (la ayuda responde la sustancia, en los dos
idiomas) · ACLARA (la respuesta válida era pedir aclaración y nada
inventa otra cosa) · MAL (la sustancia no está, o está a medias con la
mitad pedida ausente). Las frontera se juzgan además por su forma:
admisión explícita, apoyo en un tema vecino, o silencio sin promesa
falsa.

## Sección 1 · Cuenta — corrida 2026-11-28

Conteo: bien 13 · aclara 1 · mal 1 · de 15.

- 1.1 BIEN (entrar): entrar en un aparato nuevo baja el libro de la
  nube; el libro depende de la cuenta.
- 1.2 BIEN (entrar + sync): se guarda solo en la cuenta; el punto de
  sincronización muestra el estado.
- 1.3 BIEN (privacidad + huella): solo tu sesión lee el libro; al abrir
  en este teléfono protege la huella.
- 1.4 BIEN (entrar + cerrar-sesion): una sesión por teléfono, cada
  cuenta su libro aparte; cerrar borra la copia del dispositivo y el
  punto dice si todo está a salvo en la cuenta.
- 1.5 BIEN (huella, tip): si la huella no reconoce, se entra con la
  contraseña desde la pantalla de bloqueo; no es bloqueo definitivo.
- 1.6 ACLARA (correcta): «¿Y si me arrepiento?» no tiene referente;
  ningún tema inventa una respuesta.
- 1.7 BIEN (nombre, how): se cambia en «Cómo te nombra Faro» y no
  reescribe nada del libro.
- 1.8 BIEN (sync): el puntito junto a Faro dice si lo último está en
  la cuenta, solo en el dispositivo o sincronizándose.
- 1.9 FRONTERA sostenida por silencio: ningún tema promete soporte
  telefónico ni inventa un trámite; tampoco hay una frase que lo
  admita en palabras.
- 1.10 FRONTERA sostenida por silencio: ningún tema dice que Faro
  avise a un banco por abrir la cuenta; sin admisión escrita.
- 1.11 FRONTERA con admisión explícita (entrar): «En un teléfono vive
  una sesión a la vez… cada cuenta guarda su libro aparte»; la vía del
  libro compartido existe sin prometer la sesión doble.
- 1.12 FRONTERA sostenida (privacidad, tip): la cuenta vive con el
  correo con que nació; ningún tema ofrece crear un correo.
- 1.13 BIEN (sin-red + huella + mantener-sesion): sin internet todo se
  guarda en el dispositivo y sube al volver la red; la huella funciona
  sin internet; lo que espera conexión es la nube.
- 1.14 BIEN (entrar + privacidad): el correo es la llave de entrada y
  de recuperación; la respuesta vive repartida entre los dos temas.
- 1.15 MAL (a medias): cómo comprobar el estado sí está (el punto de
  sincronización), pero ningún tema de la sección dice qué pasa con
  un cambio de cuenta interrumpido a mitad. La mitad pedida falta.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0. Secciones quemadas antes de esta: ninguna.

## Sección 2 · Eliminar cuenta — corrida 2026-11-28

Conteo: bien 14 · aclara 0 · mal 1 · de 15.

- 2.1 BIEN (eliminar-cuenta + el aviso de la ventana): se borra todo
  (cuenta, libro en la nube, respaldos, copias de este dispositivo) y
  el tema dice lo que queda: las copias ya bajadas en otros aparatos
  quedan en ese aparato, sin acceso.
- 2.2 BIEN (burbuja + aviso): «Es para siempre», «No se puede
  deshacer»; el momento exacto es la confirmación del servidor.
- 2.3 MAL (a medias): el mecanismo está (correo exacto, el botón no se
  arma, no pasa nada), pero ningún texto dice el para qué de la
  ceremonia: evitar un borrado por error o por otra persona. La mitad
  pedida falta.
- 2.4 BIEN (el aviso mismo): «Si solo quieres salir de este
  dispositivo, usa Cerrar sesión»; la ventana redirige a su puerta.
- 2.5 BIEN (eliminar-cuenta): si el libro compartido es tuyo se borra
  con tu cuenta y los demás se quedan sin él; el libro de la otra
  persona no se toca, solo pierdes tu acceso.
- 2.6 BIEN (how + what): antes de la confirmación del servidor no se
  ha borrado nada; sin conexión la cuenta sigue viva y Faro lo dice.
- 2.7 BIEN: según el punto: antes, nada pasó; después, es para
  siempre, sin prometer recuperación; lo único honesto es el libro
  descargado antes, restaurable en una cuenta nueva (tip).
- 2.8 BIEN (what): Ajustes, pliegue Cuenta, al final, debajo de
  Cerrar sesión; el tema corrige el lugar donde él buscó.
- 2.9 FRONTERA sostenida por silencio: la ceremonia se describe
  siempre de la cuenta entera; ningún texto presenta el borrado por
  años como opción suya.
- 2.10 FRONTERA sostenida por silencio: el aviso enumera lo que se
  borra y los servicios de terceros no están en la lista; nadie
  promete cancelarlos.
- 2.11 FRONTERA sostenida por silencio: ningún texto ofrece un
  trámite interno por un empleado.
- 2.12 FRONTERA sostenida por silencio: ningún texto mezcla eliminar
  la cuenta con devolver gastos del libro.
- 2.13 BIEN (how): el bloqueo es intencional: si no coincide letra a
  letra, el botón no se arma y no pasa nada.
- 2.14 BIEN (what): «No: la app queda instalada, vacía y sin tu
  cuenta; borrarla del teléfono es cosa del sistema.»
- 2.15 BIEN (how + tip + el botón de la ventana): «Descargar mi libro
  primero» antes de confirmar; el archivo queda en tu poder y se
  restaura en una cuenta nueva.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; la sección 1 quemada sigue en pie (el árbol no cambió desde su
cierre). Quemadas tras este cierre: 1 y 2.

## Sección 3 · Copias y datos — corrida 2026-11-28

Conteo: bien 14 · aclara 0 · mal 1 · de 15.

- 3.1 BIEN (copias): la copia guarda el libro entero (movimientos,
  estructura, ajustes) aquí y en la nube, y en cualquier aparato
  donde entres puedes restaurar la que quieras.
- 3.2 BIEN (copias): automática, una vez al día, al abrir Faro; un
  día que no lo abres, no nace copia.
- 3.3 BIEN (exportar + importar): exportar crea el archivo con tus
  movimientos; importar trae los del banco; una saca y la otra mete.
- 3.4 BIEN (copias): al restaurar, el libro restaurado pasa a ser tu
  libro y manda en tus aparatos; antes de restaurar, Faro guarda una
  copia de hoy por si cambias de idea.
- 3.5 BIEN (importar, tip): respondió sobre importar, como la
  esperada acepta: un solo Deshacer en el aviso quita toda la
  importación.
- 3.6 BIEN con nota (ejemplo): la premisa no es el mecanismo de Faro
  (no hay filas de ejemplo dentro de tu libro); el tema responde la
  situación real: el ejemplo vive aparte, tus datos quedan congelados
  e idénticos, y al apagar el interruptor vuelves a ellos al instante.
- 3.7 MAL (a medias): el destino sí está (el archivo baja a tu
  aparato, a la carpeta que eliges, o sale por Compartir), pero
  ningún texto dice quién puede ver el archivo ya exportado. La mitad
  pedida falta.
- 3.8 BIEN (copias, tip): de cada copia se ve su fecha y su formato
  antes de restaurar; la lista de copias es donde se mira.
- 3.9 FRONTERA sostenida (copias): la copia guarda el libro entero y
  la enumeración es su alcance; ningún texto promete guardar fotos ni
  mensajes del teléfono.
- 3.10 FRONTERA sostenida por silencio: nada promete que editar el
  archivo de copia fuera y devolverlo tal cual sea un camino; la
  puerta de importar revisa cada fila antes de guardar.
- 3.11 BIEN (frontera respondida con la verdad, copias): no hay copia
  secreta aparte; hay copias diarias declaradas, en este equipo y en
  tu cuenta en línea.
- 3.12 FRONTERA sostenida por silencio: ningún texto ofrece que Faro
  mande tu copia a un tercero; compartir tu propio archivo exportado
  es acto tuyo desde tu aparato.
- 3.13 BIEN (importar): los duplicados se marcan en la revisión,
  reimportar el mismo mes no agrega nada repetido, y un Deshacer
  quita toda la importación sin borrar nada por el usuario.
- 3.14 BIEN (copias + sin-red): la copia local y el archivo no piden
  conexión; la copia en la nube es de la cuenta y espera red, como
  todo lo que sube.
- 3.15 BIEN (copias + archivo-respaldo): las copias de la nube son de
  tu cuenta y se restauran en cualquier aparato donde entres; el
  archivo se vuelve a cargar desde archivo, sin atadura al aparato.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 y 2 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2 y 3.

## Sección 4 · Apariencia — corrida 2026-11-28

Conteo: bien 10 · aclara 0 · mal 5 · de 15. La sección más débil
hasta ahora: el tema «temas» lista y explica el mecanismo, pero
varias preguntas de sustancia quedan sin respuesta.

- 4.1 BIEN (temas): los temas de día están nombrados y el cambio se
  hace abriendo Día o Noche y tocando una muestra; el sol y la luna
  pasan entre el de día y el de noche.
- 4.2 BIEN (temas): Tron es uno de los temas de noche; su retrato es
  el del tip (el ámbar solo para los montos, su letra propia) y
  cambiar de tema solo repinta.
- 4.3 BIEN (temas, how): «Cambiar de tema solo repinta: no reinicia
  la app ni toca lo que estás escribiendo.»
- 4.4 BIEN (temas, tip): «No hay selector de letra… El tamaño de la
  letra no se cambia dentro de Faro.» La respuesta honesta es que
  dentro de la app no hay ajuste.
- 4.5 BIEN (temas, how): sin vista previa; si no te gusta, tocas
  otra muestra.
- 4.6 MAL: ningún tema dice que el color de un botón sigue al tema
  elegido ni cómo se distingue una acción normal de un aviso real.
  La sustancia no está.
- 4.7 MAL (a medias): el camino empieza a mitad («Abre Día o Noche y
  toca una muestra») y nunca nombra el primer paso, dónde vive ese
  selector. A quien nunca lo encuentra le falta el primer escalón.
- 4.8 MAL: los dos bloques de «temas» se contradicen para este caso:
  «El tema va en los ajustes de tu libro: donde tu libro llega, tu
  tema llega con él» contra «Tu tema se queda en este aparato… es tu
  aspecto personal, no un dato de tu cuenta». Para el libro
  compartido, ningún texto resuelve cuál manda.
- 4.9 FRONTERA sostenida por silencio: los temas son una lista
  cerrada; ningún texto ofrece crear temas con fotos propias.
- 4.10 BIEN (frontera con admisión explícita, temas how): «Faro no
  cambia solo entre día y noche: el paso lo haces tú con el sol o la
  luna.»
- 4.11 FRONTERA sostenida: el tema se presenta siempre como una sola
  elección que viste la app entera; nadie ofrece temas por ventana.
- 4.12 FRONTERA sostenida por silencio: ningún tema promete ni mide
  un ahorro de batería por tema.
- 4.13 MAL: ningún tema dice qué pasa con los textos que no se leen
  completos en un tema ni qué hacer en ese caso. La sustancia no
  está.
- 4.14 BIEN (temas, how): tocar una muestra aplica el tema
  enseguida; no hay confirmación en otro lado.
- 4.15 MAL (a medias): los temas de noche están listados por nombre;
  las diferencias en sustancia solo existen para Tron y Cyberpunk
  (tip). Entre Oscuro, OLED, Tinta, Humo y los demás, ningún texto
  dice en qué se diferencian ni para qué momento sirve cada uno, que
  es justo lo que la pregunta pide.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 3 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2, 3 y 4.

## Sección 5 · Modos — corrida 2026-11-28

Conteo: bien 14 · aclara 0 · mal 1 · de 15.

- 5.1 BIEN (modos): cada modo con sus superficies y capacidades;
  «El modo manda cuánto se muestra y qué se puede gestionar; nunca
  qué existe»; tres modos y un solo libro.
- 5.2 BIEN (modos, tip): «Bajar nunca borra: lo que deja de verse
  sigue guardado y contando en tus totales, y vuelve entero cuando
  subes.»
- 5.3 BIEN (modos, how): el selector vive siempre en Ajustes; subir
  y bajar se confirman y se puede volver cuando se quiera.
- 5.4 BIEN (modos): el modo filtra superficies; el de cada quien se
  comprueba en su selector de Ajustes, y el modo es de la cuenta en
  todos los aparatos, no del teléfono.
- 5.5 BIEN (modos, what): el retrato llano de cada modo: Esencial
  registra y mira, Ritmo presupuesta y anticipa, Completo interpreta
  y proyecta.
- 5.6 MAL: ningún tema dice que a lo preguntado el Asesor responde
  igual en todo modo y que lo de otro piso se nombra. Los temas
  describen su lectura por modo (asesor-esencial, asesor-ritmo) y el
  tip de modos («lo que aprendió de ti… vuelve a hablar entero
  cuando subes») sugiere lo contrario. La sustancia pedida no está.
- 5.7 BIEN (modos, how): el selector vive en Ajustes, junto al
  idioma y el tema; un letrero en el centro anuncia el modo al que
  llegaste.
- 5.8 BIEN (modos, how): el letrero central anuncia el modo al
  llegar, y el selector de Ajustes lo muestra.
- 5.9 FRONTERA sostenida por silencio: los modos son tres y fijos;
  ningún texto ofrece modos a la medida.
- 5.10 BIEN (frontera con admisión explícita, burbuja de modos): «el
  modo decide cuánto ves, nunca qué existe ni cuánto suma».
- 5.11 FRONTERA sostenida por silencio: ningún texto ofrece una
  clave de bloqueo del modo.
- 5.12 BIEN (frontera sostenida con apoyo explícito): el Asesor a lo
  sumo sugiere subir; «nunca cambia el modo por su cuenta», y el
  cambio lo confirma la persona.
- 5.13 BIEN (modos + ritmo): el modo Ritmo es el nivel que
  presupuesta y anticipa; la vista de ritmo («Hasta dónde te
  alcanza») es otra cosa: lo que gastas al día y hasta qué día te
  alcanza lo que entra. La distinción vive en los dos temas.
- 5.14 BIEN (modos, how): el modo es de tu cuenta en todos tus
  aparatos; cambiarlo en uno lo cambia en los demás. Queda guardado.
- 5.15 BIEN (modos, what): «En el libro compartido cada quien ve con
  su modo: el tuyo no cambia lo que la otra persona ve.»

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 4 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2, 3, 4 y 5.

## Sección 6 · Estructura — corrida 2026-11-28

Conteo: bien 10 · aclara 0 · mal 5 · de 15.

- 6.1 BIEN (estructura): la forma del libro: categorías fijas o
  variables, subconceptos y el catálogo; «el esqueleto de tus
  libros», y todo se suma siguiendo estos grupos.
- 6.2 BIEN (arbol): «Renombrar no toca tus movimientos: el nombre
  vive en la categoría y tus anotaciones lo muestran nuevo en todas
  partes.»
- 6.3 MAL: ningún tema dice si una cuenta del libro borrada por
  error se puede recuperar, qué aviso hubo antes ni qué pasa con sus
  filas. El Deshacer que el tip de estructura nombra es el del
  subconcepto, no el de la cuenta. La sustancia no está.
- 6.4 MAL (a medias): el tema define la forma del libro, pero no dice
  que anotar vive en otra ventana. A quien busca el botón de anotar
  le falta la redirección.
- 6.5 MAL: no hay función de juntar dos categorías y ningún tema lo
  dice ni explica el efecto en los totales. La pregunta queda sin
  respuesta: la categoría misma no se borra y unir no existe como
  puerta, pero eso no lo cuenta ningún texto.
- 6.6 BIEN (arbol + estructura): ocultar con el ojo; «Ocultar no
  borra ni mueve un centavo: los movimientos siguen contando en
  todos los totales»; y la categoría misma nunca se borra.
- 6.7 BIEN (cuentas + cuenta-nueva): se agrega en la pestaña
  Ahorros de Libros; pide el nombre del banco o la cuenta y su saldo
  de hoy, con su logo.
- 6.8 MAL: ningún tema explica una cuenta en gris que no deja
  editarla: ni el motivo posible ni qué condición lo levanta. La
  sustancia no está.
- 6.9 FRONTERA sostenida por silencio: ningún texto ofrece un
  borrado automático de categorías a fin de mes.
- 6.10 FRONTERA sostenida por silencio: las plantillas son puntos de
  partida generales; ningún texto promete consejo de categorías
  según el trabajo de la persona.
- 6.11 FRONTERA sostenida por silencio: el tema dice qué maneja
  Estructura (la forma de este libro); ningún texto ofrece cambiar
  entre libros desde ahí.
- 6.12 FRONTERA sostenida por silencio: ningún texto dice que un
  nombre puesto en Faro cambie algo en el banco real, ni lo promete.
- 6.13 BIEN (arbol): todo queda preparado y se aplica al tocar
  Guardar; ese es el acto que confirma el cambio de estructura.
- 6.14 MAL (a medias): el Guardar está dicho, pero ningún tema dice
  que los que comparten el libro ven el cambio de estructura porque
  la estructura es del libro. La mitad pedida falta.
- 6.15 BIEN (estructura + arbol): renombrar y ocultar se revierten a
  mano (renombrar de vuelta, el ojo); borrar un subconcepto pide
  confirmación y Deshacer rescata si te equivocas.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 5 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2, 3, 4, 5 y 6.

## Sección 7 · Bancos y tasa — corrida 2026-11-28

Conteo: bien 11 · aclara 0 · mal 4 · de 15.

- 7.1 BIEN (bancos): el pliegue guarda lo que paga cada tarjeta,
  dónde va el saldo de PayPal y las reglas de comercios aprendidas;
  otra cosa que la lista de cuentas con su saldo.
- 7.2 BIEN (tasa, how): «La tasa no se trae sola: se actualiza al
  tocar Actualizar tasa»; o la escribes tú con Guardar tasa manual.
- 7.3 BIEN (tasa): «La tasa solo cambia la vista. Tus montos quedan
  en la moneda en que los anotaste.» Rige una sola tasa vigente para
  la vista de todo; no hay tasa del día de cada gasto.
- 7.4 BIEN (tasa, how): se corrige escribiendo la tasa buena con
  Guardar tasa manual, o volviendo a la del día con Actualizar tasa;
  su efecto es la vista, por el what.
- 7.5 MAL (a medias): la tasa queda definida como la que cambia la
  vista, pero ningún tema de la sección dice dónde vive el total de
  un mes en otra moneda. La distinción pedida queda a medias.
- 7.6 MAL: ningún tema dice cómo se nota una tasa puesta al revés,
  si la app avisa, ni el arreglo de ese error. La sustancia no está.
- 7.7 BIEN (bancos, how): «Se llena solo al importar»: un banco sin
  importaciones no tiene qué mostrar en el pliegue; eso es lo que
  hay que revisar.
- 7.8 MAL (a medias): el gesto está (escribir la tasa y tocar
  Guardar tasa manual), pero el tema no nombra el lugar donde eso
  vive. Falta el primer escalón, como en la 4.7.
- 7.9 BIEN (frontera con admisión explícita, tasa how): la tasa
  oficial del día se trae al tocar Actualizar tasa; «la tasa no se
  trae sola». No hay promesa en vivo.
- 7.10 BIEN (frontera sostenida con apoyo, tasa what): «La tasa solo
  cambia la vista»: Faro registra y muestra; ningún texto mueve
  dinero real entre monedas.
- 7.11 FRONTERA sostenida por silencio: la tasa traída es la oficial
  del día y la manual es la tuya; ningún texto garantiza la de una
  casa de cambio.
- 7.12 FRONTERA sostenida: rige una sola tasa vigente («Vigente dice
  desde cuándo rige»); ningún texto ofrece tasas por gasto.
- 7.13 MAL: ningún tema dice si la tasa que pones es del libro o de
  cada persona, ni si los del libro compartido la usan. La sustancia
  no está.
- 7.14 BIEN (tasa, how): «Sin conexión se queda la última tasa
  guardada, con su fecha de «Vigente» a la vista.»
- 7.15 BIEN (tasa, how): la confirmación es el «Vigente»: dice desde
  cuándo rige la tasa que quedó.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 6 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2, 3, 4, 5, 6 y 7.

## Sección 8 · Compartir — corrida 2026-11-28

Conteo: bien 13 · aclara 0 · mal 2 · de 15.

- 8.1 BIEN (libro-compartido): un libro compartido sigue siendo un
  libro; cada invitado ve solo su alcance, con papel de anotar o
  solo mirar, y cada área dice quién la financia.
- 8.2 BIEN (compartir-miembros + salidas): la lista dice por persona
  si la invitación sigue pendiente o ya está en el libro; la
  invitación llega a su correo con enlace y código, y cancelarla la
  apaga al momento para rehacerla.
- 8.3 BIEN (libro-compartido + salidas): compartir abre solo este
  libro; tu libro propio queda fuera del trato, y salir termina tu
  acceso a ese libro y retira su copia de tu teléfono.
- 8.4 BIEN (compartir-miembros): «Cancelar una invitación la apaga
  al momento», mientras sigue pendiente.
- 8.5 MAL: la vista previa que existe es la del que invita, antes de
  invitar. Ningún tema describe qué puede ver quien recibe una
  invitación antes de aceptarla. La sustancia pedida no está.
- 8.6 BIEN (libro-compartido): el alcance es por áreas, no por
  fecha: el libro completo o las áreas que elijas; con el libro
  completo, la historia entra entera.
- 8.7 BIEN (libro-compartido, how): la mesa está en El libro
  compartido; el dato que se necesita es su correo, con el alcance y
  el papel en el orden que quieras.
- 8.8 MAL: los papeles (anotar con firma, o solo mirar) están
  dichos, pero ningún tema dice qué puede hacer un miembro sobre las
  filas de otros: si puede borrarlas o solo las suyas. La sustancia
  no está.
- 8.9 BIEN (frontera sostenida con apoyo explícito): aceptar pide la
  sesión del correo exacto; «el enlace por sí solo no es una llave».
  Sin cuenta no hay acceso.
- 8.10 FRONTERA sostenida por silencio: ningún texto muestra ni
  promete la ubicación de los miembros.
- 8.11 FRONTERA sostenida por silencio: ningún texto ofrece cobros
  entre miembros dentro de la app.
- 8.12 FRONTERA sostenida por silencio: ningún texto promete un
  reporte semanal por correo a los miembros.
- 8.13 BIEN (compartir-salidas): «Salir es una ceremonia corta y sin
  razones»: tu acceso termina en el servidor, la copia se retira de
  tu teléfono, lo que anotaste queda firmado en el libro, y eliges
  qué hacer con tu copia.
- 8.14 BIEN con nota (doctrina general): lo anotado sube con la
  sincronización y los demás lo ven al sincronizar; sin conexión
  todo se guarda aquí y sube al volver la red (sin-red). La
  respuesta vive en la doctrina general, no en un tema de compartir.
- 8.15 BIEN (compartir-miembros + eliminar-cuenta): solo el dueño
  invita; el libro es suyo — si elimina su cuenta, el libro
  compartido se borra con ella — y el traspaso es otra ceremonia
  aparte.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 7 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2, 3, 4, 5, 6, 7
y 8.

## Sección 9 · Las confirmaciones — corrida 2026-11-28

Conteo: bien 13 · aclara 0 · mal 2 · de 15.

- 9.1 BIEN (confirmar): «No todo pregunta: lo que se puede deshacer
  actúa enseguida…; la ventana guarda los pasos sin vuelta.» La
  confirmación protege lo que cuesta deshacer.
- 9.2 BIEN (confirmar): no todas pesan igual; el cuerpo de la
  ventana cuenta la consecuencia y si el paso se puede deshacer, y
  el color de peligro marca lo que no tiene vuelta o reemplaza lo
  tuyo.
- 9.3 BIEN (confirmar, how): «Cancelar cierra la ventana y no pasa
  nada: ninguna confirmación actúa mientras la miras»; tocar fuera o
  Escape es lo mismo, y al repetir el paso la ventana vuelve a salir.
- 9.4 BIEN (confirmar): respondió con la regla verdadera, que la
  esperada acepta: depende de la acción — lo deshacible actúa y lo
  rescata Deshacer; la ventana guarda lo que no tiene vuelta, y su
  cuerpo lo dice.
- 9.5 BIEN (confirmar, how): «Escribir la palabra tal cual es la
  puerta de los pasos sin vuelta»: la ceremonia crece con el daño
  posible.
- 9.6 MAL: ningún tema dice cómo se sabe, al volver, si una acción
  confirmada quedó hecha cuando el teléfono se apagó justo en ese
  momento. La sustancia no está.
- 9.7 BIEN (confirmar): se mira el cuerpo, que «es el trato», y los
  botones: el de peligro marca lo sin vuelta, y el botón extra hace
  su tarea sin confirmar nada.
- 9.8 BIEN (confirmar, how): el botón no se enciende hasta que lo
  escrito coincide letra por letra; la condición que falta es esa.
- 9.9 BIEN (frontera con admisión explícita, confirmar how): «Ninguna
  ventana trae «no volver a preguntar»: cada paso con ventana
  pregunta cada vez.»
- 9.10 FRONTERA sostenida por silencio: las confirmaciones son pasos
  dentro de Faro; ningún texto promete confirmar pagos en tiendas.
- 9.11 FRONTERA sostenida: la protección es la sesión y la huella de
  entrada (huella, privacidad: tu contraseña es la llave); ningún
  texto promete reconocer quién tocó confirmar.
- 9.12 FRONTERA sostenida por silencio: confirmar es del momento —
  la ventana pregunta cada vez que repites el paso —; ningún texto
  ofrece programar una confirmación.
- 9.13 BIEN (confirmar): el cuerpo de la ventana es el trato que
  vale si confirmas, y el tip manda lo contrario de confirmar con
  duda: «Si dudas, cancela… nada se pierde por mirar dos veces.»
- 9.14 MAL (a medias): el resultado de la acción queda en el libro,
  pero ningún tema dice que la confirmación misma deje un rastro
  revisable ni dónde se revisa; el registro de actividad solo se
  nombra de pasada en la vista previa de compartir.
- 9.15 BIEN (confirmar + libro-compartido): la ventana es local, de
  tu sesión; lo que otros ven es el resultado cuando el libro es
  compartido, que es una de las dos respuestas que la esperada
  acepta.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 8 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2, 3, 4, 5, 6, 7,
8 y 9.

## Sección 10 · Las ventanas de captura — corrida 2026-11-28

Conteo: bien 13 · aclara 0 · mal 2 · de 15.

- 10.1 BIEN (captura-mesa): lo que Faro lee cae en la bandeja como
  borrador; el formulario del + no es un borrador de la bandeja: al
  tocar Guardar, la línea entra a tu libro en el acto. Para un gasto
  sencillo no hace falta pasar por ella.
- 10.2 BIEN (captura-mesa): el borrador espera en la bandeja, no
  cuenta en ningún total, y su tarjeta aparece en Central solo
  cuando hay algo esperando; lo del formulario entra en el acto.
- 10.3 BIEN (captura-mesa, how): «el ámbar es lo que Faro supuso —
  toca el campo y corrígelo»; deja de ser borrador al marcar las
  filas y tocar Guardar.
- 10.4 MAL (a medias): la captura dice sus dudas en voz alta y lo no
  entendido se pregunta en rojo («un estado no es un movimiento»),
  pero ningún tema dice la diferencia entre anotar y preguntar ni
  cómo se saca de la captura lo que era una pregunta para el Asesor.
- 10.5 BIEN (anotar-gasto y el tema del registro sin guardar): si
  cerraste un registro sin guardarlo, Faro te ofrece seguir con ese
  reporte o empezar uno nuevo; y Atrás devuelve a la lista sin
  perder lo escrito, preguntando antes de salir.
- 10.6 BIEN (captura-mesa, how): lo que falta nace en rojo y la fila
  no se puede guardar hasta llenarlo; el ejemplo lo cuenta entero:
  un recibo con el día ilegible espera en rojo, le pones el día y ya
  se puede guardar.
- 10.7 BIEN (captura-mesa + captura-texto): el camino entero —
  formulario y Guardar directo, o Escribir/Escanear/Lista a la
  bandeja, Revisar en la mesa y Guardar — está contado entre los
  dos temas.
- 10.8 BIEN (captura-mesa, tip): «Si una fila ya está en tus libros,
  la mesa lo dice y la deja desmarcada.» Esa es la ayuda que la
  ventana ofrece contra el duplicado.
- 10.9 BIEN (frontera respondida con la verdad): el formulario no
  lee fotos; la lectura vive en su propia puerta, Escanear, y lo
  leído cae como borrador que se revisa en la mesa, nunca entra
  solo ni por el total.
- 10.10 FRONTERA sostenida por silencio: la captura anota en tu
  libro; ningún texto ofrece anotar en el libro de otra persona a
  su nombre.
- 10.11 BIEN (frontera sostenida con apoyo, captura-mesa how): la
  mesa no corrige sola en silencio: lo supuesto va en ámbar para
  que lo corrijas tú, y lo no entendido sale en rojo con su
  herramienta en la misma fila.
- 10.12 FRONTERA sostenida por silencio: anotar registra; ningún
  texto dice que un gasto futuro cobre dinero real de una cuenta.
- 10.13 MAL (a medias): los borradores «viajan con el libro: se
  guardan y se sincronizan con él» está dicho entre tus aparatos,
  pero ningún tema dice si los ven los miembros de un libro
  compartido antes de que confirmes. La mitad pedida falta.
- 10.14 BIEN (captura-texto): «Interpretar no necesita internet:
  Faro entiende la frase en tu teléfono y el borrador se sincroniza
  cuando haya conexión.»
- 10.15 BIEN (captura-mesa, how): «La papelera de una fila la
  descarta: sale de la bandeja sin entrar a tus libros.»

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 9 quemadas siguen en pie (el árbol no cambió
desde sus cierres). Quemadas tras este cierre: 1, 2, 3, 4, 5, 6, 7,
8, 9 y 10.

## Sección 11 · La ayuda misma — corrida 2026-11-28

Conteo: bien 10 · aclara 1 · mal 4 · de 15.

- 11.1 BIEN (ayuda): «El (?) es la ayuda de ese lugar: lo tocas y
  Faro te explica eso mismo, en corto, sin sacarte de donde estás.»
- 11.2 MAL (a medias): la doctrina dice que todo signo se explica
  al tocarlo y que su tema está en el Manual, pero ningún tema dice
  qué significa el punto de color junto a una cifra ni qué vale
  cada color. La mitad pedida falta.
- 11.3 BIEN (tema de las bolsas): «K quiere decir mil — C$1.65K son
  C$1,650», M por un millón, y la cifra completa, con centavos,
  aparece al tocar la bolsa; en el detalle y en Libros cada cifra
  va siempre completa.
- 11.4 BIEN (ayuda + manual): la burbuja explica y no ejecuta; leer
  el Manual «no te mueve de tu trabajo».
- 11.5 BIEN (ayuda): cada (?) vive junto a lo que explica; cerrarla
  no cambia nada y tocarla otra vez la vuelve a abrir en el mismo
  lugar.
- 11.6 BIEN (ayuda): cada (?) vive junto a lo que explica y la
  burbuja es la frase corta del mismo tema que el Manual guarda
  entero; si el tema duerme en tu modo, el (?) dice su piso y
  tiende el puente a su explicación, que es el caso que parece «de
  otra ventana».
- 11.7 MAL: las hojas con figura existen, pero ningún tema dice la
  regla — la figura aparece cuando lo que se explica es una forma,
  una proporción o un camino, y el dato simple queda en texto. La
  sustancia no está.
- 11.8 BIEN (ayuda, how): la burbuja con más cuerpo trae «Más en el
  manual» y te lleva a la entrada entera de ese tema.
- 11.9 BIEN (frontera sostenida con apoyo): la ayuda explica, no
  ejecuta; el (?) vive junto a la cosa, donde la acción misma
  está.
- 11.10 FRONTERA sostenida por silencio: ningún texto ofrece un
  interruptor que apague todos los signos de ayuda.
- 11.11 MAL con nota: ningún tema aclara la frontera que la
  esperada pide — que la ayuda de una ventana explica la ventana.
  Nota para el acta: en Faro la frontera real es más fina, porque
  las hojas de explicación de cuatro tarjetas sí calculan con los
  números del libro de la persona; la aclaración, tal como la
  esperada la fija, no está escrita en ningún tema.
- 11.12 BIEN (frontera sostenida con apoyo, manual): «No todo tema
  tiene su (?) en una pantalla: algunos viven solo aquí.» La
  ausencia de una burbuja no mide la importancia de una ventana.
- 11.13 MAL: ningún tema dice qué hace cambiar la luz de un signo
  ni si ese cambio habla del estado de la ventana o de los datos
  del libro. La sustancia no está.
- 11.14 BIEN (ayuda, how): en Esencial el (?) de un tema que duerme
  no se esconde: dice su piso y tiende el puente a su explicación.
- 11.15 ACLARA correcta: «¿Esto se guarda?» no tiene referente; la
  ayuda debe pedir cuál cosa, y ningún tema adivina una respuesta.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 10 quemadas siguen en pie (el árbol no
cambió desde sus cierres). Quemadas tras este cierre: 1, 2, 3, 4,
5, 6, 7, 8, 9, 10 y 11.

## Sección 12 · El Manual — corrida 2026-11-28

Conteo: bien 9 · aclara 0 · mal 6 · de 15.

- 12.1 BIEN (manual + ayuda): el Manual guarda entero el mismo tema
  cuya frase corta es la burbuja; «Cada (?) de la app abre su
  entrada aquí.»
- 12.2 BIEN (manual, how): desde su puerta el Manual abre en la
  portada con el índice; se entra por la lupa, el índice por
  capítulos o el índice A–Z.
- 12.3 BIEN (manual): si un tema no está bajo el nombre que buscas,
  las salidas están dichas — la búsqueda, el índice por capítulos y
  el enlace de un tema vecino. El criterio de orden del A–Z no se
  nombra; queda asentado como detalle menor.
- 12.4 MAL: ningún tema dice qué hace la búsqueda cuando no hay
  tema para una palabra: si lo admite con honestidad o manda a
  cualquier página. La sustancia no está.
- 12.5 MAL: cerrar el Manual te devuelve a tu pantalla, pero ningún
  tema dice si el Manual recuerda la página donde ibas al volver.
  La sustancia no está, en ningún sentido.
- 12.6 MAL (a medias): lo de confirmar vive en su propio tema,
  enlazado, pero ningún tema dice que la página de un tema cubre
  también sus consecuencias y su deshacer, ni dónde vive esa parte
  si no.
- 12.7 MAL: la búsqueda se nombra, pero ningún tema dice cómo trata
  las palabras propias de una duda ni qué esperar si no coinciden
  con las de la app. La sustancia no está.
- 12.8 BIEN (manual): la página de un tema trae qué es, cómo y
  consejo, y algunos llevan su idea clave en una tarjeta con
  estrella. Dónde mirar primero queda claro.
- 12.9 MAL con nota: ningún tema aclara que los ejemplos del Manual
  son de ejemplo y no las cifras de la persona, que es la
  aclaración que la esperada pide. La misma nota de la 11.11 vale:
  las hojas de explicación de cuatro tarjetas sí calculan con los
  números del libro, fuera del Manual.
- 12.10 FRONTERA sostenida por silencio: ningún texto ofrece un
  resumen hablado del Manual.
- 12.11 BIEN (frontera con admisión explícita, manual): «El Manual
  crece con la app… lo que lees es el manual de la versión que
  tienes.» No hay actualización invisible aparte.
- 12.12 FRONTERA sostenida por silencio: ningún texto ofrece notas
  personales dentro de las páginas del Manual.
- 12.13 MAL: la ley de la casa dice que toda superficie viste el
  tema, pero ningún tema lo dice del Manual. La sustancia, pedida
  de esta superficie, no está.
- 12.14 BIEN (ayuda): «La ayuda vive dentro de la app: las burbujas
  y el Manual se leen sin conexión.»
- 12.15 BIEN (manual, how): «Ir allí te lleva al lugar exacto en la
  app», y su límite está dicho: el tema sin lugar no lo trae.

Regresión acumulada en este cierre: bancos de construcción 420/420,
mal 0; las secciones 1 a 11 quemadas siguen en pie (el árbol no
cambió desde sus cierres). Quemadas tras este cierre: las 12.

## Cierre del examen — 2026-11-28

Las doce secciones corrieron una sola vez cada una, en su cierre,
contra el canon sin cambios desde la importación de la campaña. La
regresión acumulada cerró en cero en cada cierre: construcción
420/420 en las doce corridas.

Totales del examen: bien 144 · aclara 2 · mal 34 · de 180.

Por sección: 1 Cuenta 13/1/1 · 2 Eliminar cuenta 14/0/1 · 3 Copias
y datos 14/0/1 · 4 Apariencia 10/0/5 · 5 Modos 14/0/1 · 6 Estructura
10/0/5 · 7 Bancos y tasa 11/0/4 · 8 Compartir 13/0/2 · 9 Las
confirmaciones 13/0/2 · 10 Las ventanas de captura 13/0/2 · 11 La
ayuda misma 10/1/4 · 12 El Manual 9/0/6 (bien/aclara/mal).

Las 48 de frontera: ninguna fue prometida por un texto; cada una
cayó con admisión explícita en palabras, sostenida por silencio o
con apoyo en un tema vecino, según su acta.

Las 34 caídas quedan asentadas pregunta por pregunta en las actas
de arriba. Ninguna cura se construyó durante la corrida: su destino
es fallo de Oscar. La publicación de la campaña sigue esperando su
sí, con los doce cierres cumplidos y la regresión en cero.
