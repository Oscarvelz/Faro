# Faro project history (moved out of the project skill on Oct 31, 2026)
See RELEASES.md for per-release notes. Key learnings by version:
- 1.0.x: Supabase project "faro" ref bybldbmwxucdvhfqspnf; fit.ts shrinks overflowing .num; styles.css needs @source "./"; @source "../spa".
- 1.1.0: sign-in gate (login.tsx, gate.css); Asesor coach.ts (readCoach, 5 pillars, 0-100 score); Estudio panorama cards.
- 1.1.3: brand-lamp header; splash; publish via clones /tmp/fp (main) /tmp/fs (source).
- 1.1.4: vault.ts automatic gz backups (IndexedDB + Supabase faro_backups). Oscar's real account [owner-email]: never delete.
- 1.1.5–1.1.9: Estudio rebuilt as questions (study2.tsx); Asesor visuals (advisor2.tsx); MonthTower lighthouse + subtraction receipt.
- 1.2.x: floating window / Vista menu (float.css, FloatWindow); day theme fixes (daysweep.mjs).
- 1.3.0–1.3.6: Tron theme (tron.css): TRON Legacy poster, teal #3fd6f5 = money in, Clu orange #ff9d2a = money out, Ares red #ff2a2a touches only; Orbitron + Exo 2; tronize() keeps category hues at neon; tests tdock.mjs, tsave.mjs, tclip.mjs (local fonts in /tmp/site/Faro/tf).
- 1.3.22–1.3.23: Asesor audit; splash black frame fix.
- 1.3.24: health-score "?" (ScoreHelp); Cambio redesign + CalcPanel (instruments.tsx/.css).
- 1.3.25: Faro brand on Cambio sheet; exchange settings (faro-cv-prefs).
- 1.3.26: Tron currency coin amber.

## 1.3.65 (Nov 3, 2026)
Asesor large-screen layout; pinch-zoom only in Estudio and Asesor; Tasa on tablet opens Cambio in the left panel; Guardados slips add or subtract into a category; Personas box (people.ts, people.tsx; ledger people[], line personId; gifts count toward the nearest birthday). Tests: pp-a, pp-b, as-pinch, cb-pinchpp, cb2-probe. Open: Tron amber on the score dial and credit gauge; hero receipt and coach step frames.

## Archived from project-doc (condensed 2026-11-04)
- Lock (Nov 1, Journey model): it asks after >10s away (LEAVE_GRACE_MS) and on every fresh launch. File pickers and update reloads are exempt, and the fingerprint prompt never re-locks. faro.keep keeps the session. Sign-out keeps faro.lock.<uid>. Working mode: touched in the last 2 min means 5 min unlocked (ACTIVE_WINDOW_MS/WORK_GRACE_MS).
- Manual (1.3.63): topics in src/lib/manual/topics.ts are the single source. Tiered "?": light ones show a bubble, deeper ones link to the manual. Tests mn-*.mjs via mn-run.sh; faro-manual/PLAN.md.
- Savings purple #894ed6 (Tron #ba92fd), only for savings (.sav-scope/--sav). Meta/Retiro/Emergencia keep their own colours.
- Forms: .sc-form + BookLook picker (1.3.60), .ah-form (1.3.59), Cobros forms with FieldTip (1.3.56). Every editor field has a FieldTip "?" (tip.* i18n). 24-colour PALETTE in colors.ts (1.3.55).
- Tron amber meteors in the line editor: Oscar loves them, never remove (1.3.57). Large-text fixes are scoped by rem container queries so normal layouts stay pixel-identical.
- Tron book-chart bars are teal; the average line stays amber (1.3.50). Pens are teal, amber is for totals, averages and brackets (1.3.39).
- Any new visual marker must be explained in its help card (1.3.40 Explain legend).
- Workflow that works: build subagent → independent review subagent → fix → re-review → publish.
- Local port 8765 is taken by another project: use a random port.
- KEEP-SIGNED-IN.md is the reference handed to Numina/Sigmind/Anima. Vela got the lock spec (Vela files/LOCK-LIKE-JOURNEY.md).
- Older LIVE notes 1.3.64–1.3.75: see RELEASES.md.
