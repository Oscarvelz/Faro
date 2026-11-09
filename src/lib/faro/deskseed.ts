import type { LedgerState } from "./types";

/**
 * 1.3.177 — the Desk's first-run dressing (the six bank pockets and the NIO banks) used to
 * remember "already seeded" in DEVICE-local storage (localStorage faro-save-presets /
 * faro-save-ni). A bank the user deleted was therefore only deleted on that one device:
 * on a new phone, a cleared profile or a restored pack — where the device flag is absent
 * but the ledger travelled intact — the seed ran again and the deleted banks came back.
 * The decision now lives in the ledger itself (settings.seeds, the same home withRemesas
 * uses), so a removal is permanent everywhere the book goes:
 *  - "done":  the ledger flag is set — never seed again.
 *  - "adopt": no flag yet, but this book already lived (the device gate is set, or the
 *             book carries lines): write the flag WITHOUT seeding, so nothing the user
 *             removed can reappear on first run of the fix.
 *  - "run":   a genuinely new book (no flag, no device gate, no lines yet): dress it
 *             once, exactly as before, and record the flag in the same commit.
 */
export type DeskSeedDecision = "run" | "adopt" | "done";

export function deskSeedDecision(state: LedgerState, flag: string, deviceGate: boolean): DeskSeedDecision {
  const seeds = state.settings.seeds ?? [];
  if (seeds.includes(flag)) return "done";
  if (deviceGate) return "adopt";
  const lived = Object.values(state.months).some((bucket) => (bucket.lines?.length ?? 0) > 0);
  return lived ? "adopt" : "run";
}

/** The state with the seed flag recorded; the same object when it was already there. */
export function withDeskSeedFlag<T extends LedgerState>(state: T, flag: string): T {
  const seeds = state.settings.seeds ?? [];
  if (seeds.includes(flag)) return state;
  return { ...state, settings: { ...state.settings, seeds: [...seeds, flag] } };
}
