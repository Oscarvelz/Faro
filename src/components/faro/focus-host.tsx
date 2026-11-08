import { useEffect, useRef } from "react";
import { glow, reduced, takeFocus } from "@/lib/manual/nav";
import { useFaro } from "./provider";
import { importToast } from "./bank-dock";

const BOX = "[data-focus-box], .stat-fold, .card, .lens-wrap, .lens, .save-band, .advice-card, .coach, section, details, label";

function visible(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0 && !(el as HTMLElement).closest("[inert]");
}

function firstVisible(selector: string): HTMLElement | null {
  return (Array.from(document.querySelectorAll(selector)).find(visible) as HTMLElement | undefined) ?? null;
}

/** The thing to glow around a (?): its card, unless that card is taller than the screen (then the row it sits in). */
function boxOf(el: HTMLElement): HTMLElement {
  const box = el.parentElement?.closest<HTMLElement>(BOX);
  if (box && box.getBoundingClientRect().height < window.innerHeight * 0.9) return box;
  return (el.closest<HTMLElement>(".lab-head, .label, h2, h3, header, p, div") ?? el);
}

/** When nothing more precise is there: the tab or title of the screen you landed on. */
function screenMark(): HTMLElement | null {
  return firstVisible(".tool-sheet .rate-plate") ?? firstVisible(".vault-bar [aria-current='page']") ?? firstVisible(".seg [aria-current='page']") ?? firstVisible(".hub-line");
}

/**
 * "Ir allí" and [[Term]] links: once the screen is there, open the fold, scroll the spot to the middle and glow
 * it (the ring pulses for a few seconds, then stays). Polls while the screen mounts (up to 8 s).
 * If the spot is not there, Faro says so — never a silent no-op (Oscar, 2026-11-07): the app's toast
 * (the same one imports use) speaks, in the current language. Two cases: nothing at all was found, or
 * only the screen's own mark (its tab) could be shown while the promised spot never appeared.
 */
export function FocusHost() {
  const { lang } = useFaro();
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    let timer = 0;
    let run = 0;
    const say = (es: string, en: string) => importToast({ text: langRef.current === "en" ? en : es });
    const start = () => {
      const want = takeFocus();
      if (!want) return;
      const token = ++run;
      window.clearTimeout(timer);
      const started = Date.now();
      const folds = (want.fold ?? "").split(" ").filter(Boolean);
      const step = () => {
        if (token !== run) return;
        const elapsed = Date.now() - started;
        // Ask the fold (Ajustes section, Estudio card, Cobros, lens…) to open; repeating is harmless.
        if (elapsed < 1600) for (const id of folds) window.dispatchEvent(new CustomEvent("faro-open", { detail: id }));
        let target: HTMLElement | null = null;
        let isBox = true;
        let viaMark = false;
        // `anchor` may list alternatives, best first: "desk-start|desk-list" (the first one on screen wins).
        if (want.anchor) for (const a of want.anchor.split("|")) { target = firstVisible(`[data-anchor="${CSS.escape(a)}"]`); if (target) break; }
        if (!target) {
          const hint = firstVisible(`[data-topic="${CSS.escape(want.topic)}"]`);
          if (hint) { target = boxOf(hint); isBox = target !== hint; }
        }
        // The card the topic lives in (a fold), when the row itself is not there this month.
        if (!target && elapsed > 900) for (const id of folds) { target = firstVisible(`[data-fold="${CSS.escape(id)}"]`); if (target) break; }
        if (!target && elapsed > 1400) { target = screenMark(); viaMark = !!target; }
        if (!target) {
          if (elapsed < 8000) timer = window.setTimeout(step, 90);
          else say("No encontré eso en esta pantalla.", "I couldn't find that on this screen.");
          return;
        }
        target.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
        // Glow once the scroll has settled.
        let last = -1;
        let still = 0;
        const t0 = Date.now();
        const settle = () => {
          if (token !== run || !target) return;
          const y = Math.round(target.getBoundingClientRect().top);
          still = y === last ? still + 1 : 0;
          last = y;
          if (still >= 3 || Date.now() - t0 > 900) {
            glow(target, 2800, true);
            // The jump promised a specific spot (an anchor) and only the screen's tab could be shown:
            // the spot itself is not on this screen right now, and Faro says so.
            if (viaMark && want.anchor) say("Eso no está visible en esta pantalla ahora mismo.", "That isn't visible on this screen right now.");
            return;
          }
          requestAnimationFrame(settle);
        };
        requestAnimationFrame(settle);
        void isBox;
      };
      timer = window.setTimeout(step, 50);
    };
    window.addEventListener("faro-focus", start);
    return () => {
      window.removeEventListener("faro-focus", start);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
