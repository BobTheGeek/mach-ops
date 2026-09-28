// The four cockpit systems the hangar shows: RADAR, ENGINES, AVIONICS, WEAPONS.
//
// Flight School FS4: "Four systems, one per skill group. They go OFFLINE →
// CALIBRATING → ONLINE → OPTIMIZED as you master skills."
//
// The artboard names the four but does not say which skills feed which, so the
// mapping is by registry cluster prefix. Flagged in docs/PHASE3-NOTES.md.

import type { SystemsStatus } from "../engine/types";

export const SYSTEMS = ["RADAR", "ENGINES", "AVIONICS", "WEAPONS"] as const;
export type SystemName = (typeof SYSTEMS)[number];

/** Registry id prefixes that feed each system. */
const FEEDS: Record<SystemName, readonly string[]> = {
  // number sense: reading the tape and the scope
  RADAR: ["ns.", "h8.ns."],
  // expressions and equations: the engine map
  ENGINES: ["ee.", "h8.ee."],
  // ratios, proportions and percents: the avionics computers
  AVIONICS: ["rp.", "pc."],
  // probability, statistics and geometry: the weapons solution
  WEAPONS: ["sp.", "pr.", "g.", "h8.g.", "h8.sp.", "h8.f."],
};

export function systemFor(skillId: string): SystemName | null {
  // Longest prefix wins, so h8.ee. beats ee. and h8.g. beats g.
  let best: { system: SystemName; len: number } | null = null;
  for (const system of SYSTEMS) {
    for (const prefix of FEEDS[system]) {
      if (skillId.startsWith(prefix) && (!best || prefix.length > best.len)) {
        best = { system, len: prefix.length };
      }
    }
  }
  return best?.system ?? null;
}

const ORDER: SystemsStatus[] = ["OFFLINE", "CALIBRATING", "ONLINE", "OPTIMIZED"];

/**
 * A system reads at the weakest status of the skills that have been seen at all.
 * A system with nothing seen is OFFLINE; one whose every seen skill is OPTIMIZED
 * is OPTIMIZED. Unseen skills do not drag a system down, or nothing would ever
 * leave OFFLINE until the whole curriculum was finished.
 */
export function systemStatus(
  skills: readonly string[],
  statusOf: (skill: string) => SystemsStatus,
  system: SystemName,
): SystemsStatus {
  const mine = skills.filter((s) => systemFor(s) === system);
  const seen = mine.map(statusOf).filter((s) => s !== "OFFLINE");
  if (seen.length === 0) return "OFFLINE";
  let worst = ORDER.length - 1;
  for (const s of seen) worst = Math.min(worst, ORDER.indexOf(s));
  return ORDER[worst]!;
}
