import type { BankFigure, BankFigurePoint } from "@/lib/faro/ask2";

/**
 * EL DIBUJO DE LAS FIGURAS DEL CENSO (1.3.450; el censo lo aprobó
 * Oscar el 2026-11-23 con su condición de exactitud): el banco
 * DECLARA la figura con los números reales del libro (1.3.449) y
 * esta pieza la DIBUJA con los tokens del tema — ninguna cifra se calcula aquí:
 * cada punto, cada banda y cada marca vienen en la
 * declaración, y lo que se dibuja es exactamente lo declarado.
 * Seis formas, un solo envoltorio: LA ESCALA (marcas sobre una
 * banda), LAS BARRAS QUE SUMAN (una barra partida cuando las
 * piezas suman el total; filas firmadas cuando la figura es una
 * resta), EL CAMINO (el saldo caminando, con su mínimo y su
 * conflicto marcados), LADO A LADO (barras que se comparan), EL
 * MAPA DE MESES (una columna por mes, con el piso y la mediana
 * como líneas) y EL ÁRBOL (los hijos de la cifra, con su signo).
 * La figura acompaña a la respuesta: no lleva asiento de modo —
 * la respuesta no se castiga.
 */
export function BankFigureView({ figure, fmt }: { figure: BankFigure; fmt: (minor: number) => string }) {
  if (!figure.points.length) return null;
  return (
    <figure className="ask-fig" data-anchor="ask-figure" data-kind={figure.kind}>
      {figure.kind === "escala" ? <Escala figure={figure} fmt={fmt} /> : null}
      {figure.kind === "barras" ? <Barras figure={figure} fmt={fmt} /> : null}
      {figure.kind === "camino" ? <Camino figure={figure} fmt={fmt} /> : null}
      {figure.kind === "lado" ? <Lado figure={figure} fmt={fmt} /> : null}
      {figure.kind === "meses" ? <Meses figure={figure} fmt={fmt} /> : null}
      {figure.kind === "arbol" ? <Arbol figure={figure} fmt={fmt} /> : null}
      {figure.note ? <figcaption className="ask-fig-note">{figure.note}</figcaption> : null}
    </figure>
  );
}

const pct = (v: number, total: number) => Math.min(100, Math.max(0, total > 0 ? (v / total) * 100 : 0));

/** LA ESCALA: una banda de 0 al total, con el piso y la mediana
 * como muescas y cada punto como marca con su cifra. */
function Escala({ figure, fmt }: { figure: BankFigure; fmt: (n: number) => string }) {
  const total = figure.band?.total ?? Math.max(...figure.points.map((p) => p.minor), 0);
  return (
    <div className="ask-fig-escala">
      <div className="ask-fig-band">
        {figure.band?.floor ? <span className="ask-fig-tick is-floor" style={{ left: `${pct(figure.band.floor, total)}%` }} /> : null}
        {figure.band?.median ? <span className="ask-fig-tick is-median" style={{ left: `${pct(figure.band.median, total)}%` }} /> : null}
        {figure.points.map((p, i) => (
          <span key={i} className={`ask-fig-mark${p.mark ? ` is-${p.mark}` : ""}`} style={{ left: `${pct(p.minor, total)}%` }} />
        ))}
      </div>
      <div className="ask-fig-legend">
        {figure.points.map((p, i) => (
          <div key={i} className="ask-fig-legrow">
            <span>{p.label}</span>
            <strong className="num">{fmt(p.minor)}</strong>
          </div>
        ))}
        {figure.band?.floor ? (
          <div className="ask-fig-legrow is-band">
            <span>{fmt(figure.band.floor)}</span>
            <span>{fmt(total)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** LAS BARRAS QUE SUMAN: si todas las piezas son no negativas y
 * suman el total, UNA barra partida en segmentos; si la figura es
 * una resta (piezas con signo), una fila por pieza. */
/* EL COLOR DE CADA PIEZA (fallo de Oscar, 2026-11-27, sobre la
 * foto del reparto): cada persona su color específico, para leer
 * la gráfica — la familia sale del acento del tema por pasos de
 * matiz (el acento mismo, +50, +100…), así cada tema pinta la
 * suya y ningún segmento comparte color con otro. Si el motor no
 * entiende el color relativo, manda la regla de la clase (el
 * acento) y la barra se lee como antes. La intensidad va un pelo
 * por debajo de la del acento (fallo de Oscar, el mismo día: la
 * familia a saturación plena gritaba): la saturación se corta al
 * 80% en todas las piezas, la del acento incluida, para que la
 * familia entera respire igual. */
const segColor = (i: number): string =>
  `hsl(from var(--accent) calc(h + ${i * 50}) calc(s * 0.8) l)`;
function Barras({ figure, fmt }: { figure: BankFigure; fmt: (n: number) => string }) {
  const total = figure.band?.total ?? figure.points.reduce((a, p) => a + p.minor, 0);
  const sum = figure.points.reduce((a, p) => a + p.minor, 0);
  const stacked = figure.points.every((p) => p.minor >= 0) && total > 0 && sum === total;
  if (stacked) {
    return (
      <div className="ask-fig-barras">
        <div className="ask-fig-stack">
          {figure.points.map((p, i) => (
            <span key={i} className="ask-fig-seg" style={{ flexGrow: p.minor, background: segColor(i) }} />
          ))}
        </div>
        <div className="ask-fig-legend">
          {figure.points.map((p, i) => (
            <div key={i} className="ask-fig-legrow">
              <span className="ask-fig-legname"><span className="ask-fig-dot" style={{ background: segColor(i) }} />{p.label}</span>
              <strong className="num">{fmt(p.minor)}</strong>
            </div>
          ))}
          <div className="ask-fig-legrow is-total">
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>
    );
  }
  const max = Math.max(...figure.points.map((p) => Math.abs(p.minor)), 1);
  return (
    <div className="ask-fig-barras">
      {figure.points.map((p, i) => (
        <div key={i} className="ask-fig-row">
          <span className="ask-fig-rowlab">{p.label}</span>
          <span className="ask-fig-track">
            <span className={`ask-fig-fill${p.minor < 0 ? " is-neg" : ""}`} style={{ width: `${(Math.abs(p.minor) / max) * 100}%` }} />
          </span>
          <strong className="num">{fmt(p.minor)}</strong>
        </div>
      ))}
    </div>
  );
}

/** EL CAMINO: el saldo caminando por sus puntos reales; el mínimo
 * y el conflicto se marcan, el cierre se llena. */
function Camino({ figure, fmt }: { figure: BankFigure; fmt: (n: number) => string }) {
  const pts = figure.points;
  const W = 300, H = 86, PAD = 8;
  const lo = Math.min(...pts.map((p) => p.minor));
  const hi = Math.max(...pts.map((p) => p.minor));
  const span = hi - lo || 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, pts.length - 1);
  const y = (v: number) => H - 18 - ((v - lo) / span) * (H - 34);
  const zeroY = lo < 0 && hi > 0 ? y(0) : null;
  const line = pts.map((p, i) => `${x(i)},${y(p.minor)}`).join(" ");
  // El último punto ya tiene su renglón de cierre: si además es el
  // mínimo o el conflicto, no se nombra dos veces en la leyenda.
  const marked = pts.map((p, i) => ({ p, i })).filter(({ p, i }) => (p.mark === "minimo" || p.mark === "conflicto") && i !== pts.length - 1);
  return (
    <div className="ask-fig-camino">
      <svg viewBox={`0 0 ${W} ${H}`} className="ask-fig-svg" aria-hidden="true">
        {zeroY !== null ? <line x1={PAD} x2={W - PAD} y1={zeroY} y2={zeroY} className="ask-fig-zero" /> : null}
        <polyline points={line} className="ask-fig-path" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.minor)} r={p.mark ? 3.6 : 2.4} className={`ask-fig-dot${p.mark ? ` is-${p.mark}` : ""}`} />
        ))}
      </svg>
      <div className="ask-fig-legend">
        <div className="ask-fig-legrow">
          <span>{pts[0]!.label}</span>
          <strong className="num">{fmt(pts[0]!.minor)}</strong>
        </div>
        {marked.map(({ p, i }) => (
          <div key={i} className="ask-fig-legrow">
            <span>{p.label}</span>
            <strong className="num">{fmt(p.minor)}</strong>
          </div>
        ))}
        {pts.length > 1 ? (
          <div className="ask-fig-legrow">
            <span>{pts[pts.length - 1]!.label}</span>
            <strong className="num">{fmt(pts[pts.length - 1]!.minor)}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** LADO A LADO: una barra por punto, medidas contra la mayor; la
 * premisa se dibuja hueca — es un «si», no un hecho. */
function Lado({ figure, fmt }: { figure: BankFigure; fmt: (n: number) => string }) {
  const max = Math.max(...figure.points.map((p) => Math.abs(p.minor)), 1);
  return (
    <div className="ask-fig-lado">
      {figure.points.map((p, i) => (
        <div key={i} className="ask-fig-row">
          <span className="ask-fig-rowlab">{p.label}</span>
          <span className="ask-fig-track">
            <span className={`ask-fig-fill${p.mark === "premisa" ? " is-premisa" : ""}`} style={{ width: `${(Math.abs(p.minor) / max) * 100}%` }} />
          </span>
          <strong className="num">{fmt(p.minor)}</strong>
        </div>
      ))}
    </div>
  );
}

/** EL MAPA DE MESES: una columna por mes; el piso y la mediana de
 * la banda cruzan como líneas con su cifra al borde. */
function Meses({ figure, fmt }: { figure: BankFigure; fmt: (n: number) => string }) {
  const top = Math.max(...figure.points.map((p) => p.minor), figure.band?.total ?? 0, 1);
  const short = (label: string) => label.split(" ")[0]?.slice(0, 3) ?? label;
  const best = figure.points.reduce((a, p) => (p.minor > a.minor ? p : a), figure.points[0]!);
  return (
    <div className="ask-fig-meses">
      <div className="ask-fig-cols">
        {figure.band?.median ? <span className="ask-fig-hline is-median" style={{ bottom: `${pct(figure.band.median, top)}%` }}><em>{fmt(figure.band.median)}</em></span> : null}
        {figure.band?.floor ? <span className="ask-fig-hline is-floor" style={{ bottom: `${pct(figure.band.floor, top)}%` }}><em>{fmt(figure.band.floor)}</em></span> : null}
        {figure.points.map((p, i) => (
          <div key={i} className="ask-fig-col">
            {p === best ? <strong className="num ask-fig-coltop">{fmt(p.minor)}</strong> : <span className="ask-fig-coltop" />}
            <span className={`ask-fig-colbar${p === best ? " is-best" : ""}`} style={{ height: `${Math.max(4, pct(p.minor, top))}%` }} />
            <span className="ask-fig-collab">{short(p.label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** EL ÁRBOL: los hijos de la cifra, cada uno con su signo y su
 * peso; la rama se dibuja desde un tronco común. */
function Arbol({ figure, fmt }: { figure: BankFigure; fmt: (n: number) => string }) {
  const max = Math.max(...figure.points.map((p: BankFigurePoint) => Math.abs(p.minor)), 1);
  return (
    <div className="ask-fig-arbol">
      {figure.points.map((p, i) => (
        <div key={i} className="ask-fig-row">
          <span className="ask-fig-rowlab">{p.minor < 0 ? "− " : "+ "}{p.label}</span>
          <span className="ask-fig-track">
            <span className={`ask-fig-fill${p.minor < 0 ? " is-neg" : ""}`} style={{ width: `${(Math.abs(p.minor) / max) * 100}%` }} />
          </span>
          <strong className="num">{fmt(p.minor)}</strong>
        </div>
      ))}
    </div>
  );
}
