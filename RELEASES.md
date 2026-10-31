## 1.3.7 (Oct 31, 2026) main ceabda0, source ea7124a
- Icon upload tile + shrinkIcon (src/lib/faro/icon.ts, 64px WebP ~2.4k chars); bigger Tron bank disc.
- Savings lever glows in pocket color; Tron vault-bar switcher (scanline + icon lock-on, no ripple).
- Tron speedometers: TronDial (ScoreDial), a2-gauge, pulse bezel.
- Estudio month ring: .pano-cone conic layer under SVG (cone() in panorama.tsx), each slice fades within its own hue (faint tail → full → bright head). Oscar may extend to other charts.
- pub.sh must be run with `bash` (no exec bit).
## 1.3.8 (Oct 31, 2026) main b837aaf, source fa0aa60
- Month ring: solid slices again in all themes (cone removed). StatFold: an open card folds only from its title, so taps inside charts never close it.
- Tron: Estudio s2-* and Asesor (advisor2 tc()) colors neon; Libros/Estudio tabs light-cycle streak + icon rez; dock glitch select.
- Savings pockets: block = gauge (Emergencia months covered / emergencyMonths; others % of month goal), non-Tron only; Tron keeps segmented energy gauge.
## 1.3.9: pocket block = wordless 6-month deposit trail (non-Tron); Oscar rejected text in the block (not premium).
## 1.3.10 (main b6dc361): non-Tron pocket block = full-colour .save-band with drifting swells, no text. Oscar rejected text gauges and the 6-month dash trail (looked empty).
## 1.3.11: tap-glint (spring+glint+halo, spa/main.tsx listener) on .lens/.save-seg non-Tron; picked = colour ring. Retiro = #a98fd6 purple everywhere. Desk Retiro details behind .save-retire-fold. Tron dock: only icon glitches (sheen slab off).
## 1.3.12: Tron .seg tabs use t-glitch-ico on icon only; label no scan-in.
## 1.3.13: Pagos lens + cobro button red in all themes (day #c98a82 border, night dark red gradient).
- 1.3.14: Retiro changed to turquoise #3fb5ad (Oscar found purple too harsh, and rose too close to the Pagos red).
- 1.3.15: removed the thick selected ring on lenses and pockets (back to the original look). Tap = a light bloom from the finger, a sheen, and a soft drop-shadow glow in the card's tone.
- 1.3.16: Retiro softened to #72b4b2.
- 1.3.17-19: the selected chip's inset ring now uses its own tone (the gray is gone). New ripple .tap-drop on .lens: a dot and two rings growing from the tap point (non-Tron). Tron selected lens gets a 1px ring in its own colour plus a glow. Theme flip: html.theme-swap kills transitions for 2 frames.
- 1.3.20: Cadence ripple (ink in --tone, 580ms) on .lens + .save-seg (non-Tron), via a listener in spa/main.tsx; removed the bloom/drop effects. The provider sets data-theme during render (not in an effect) so isTron() tints flip in the same frame.
- 1.3.21: day .desk-bar gets paper-glass gradients, an accent-to-gold bottom hairline, a 9s sheen, hairline dividers, a tinted Queda and a USADO meter (--usedf; turns red when data-over).
- 1.3.22: Asesor audit (see /workspace/work/audit/AUDIT.md). advisor.ts/coach.ts/engine.ts/money.ts plus small screens.tsx/advisor2.tsx plan fixes.
- 1.3.23: html.booting is removed when the splash starts fading (spa/main.tsx), not after it is gone, so day themes no longer flash a black frame behind the cards.
- 1.3.24: HealthCard '?' explainer (ScoreHelp in panorama.tsx, SCORE_WEIGHTS exported from coach.ts). Cambio redesign (.cv-* stacked rows, swap disc, quick chips) + CalcPanel (.calc2: drag, 4-corner resize, fill-screen toggle, keyboard, = key, geo in localStorage faro-calc-geo, ResizeObserver clamp) in instruments.tsx/instruments.css; Tron skin in tron.css. Test: browser-test/cv.mjs, help.mjs.
- 1.3.25: ToolSheet title = brand lamp + Faro (.tool-brand). Cambio gear (.cv-gear) opens CvSettings: 6 quick-amount slots each for US$ and C$, starting currency + amount, Restaurar; localStorage faro-cv-prefs. Test: browser-test/cvs.mjs.
- 1.3.26: Tron .currency-bubble .gold-coin amber (hue-rotate 5deg, not teal); other gold coins stay teal.
- 1.3.27: Cambio sheet brand bigger/higher (.tool-brand 2.9rem, lamp 40px); Cerrar -> small round X (.tool-close).
- 1.3.28: Mark bold variant (wider lamp, tapered tower, gallery line, thicker base) on Cambio sheet title only.
