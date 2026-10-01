// Chapter medal rules: three tiers per chapter, read from skill states and the
// boss run that earned them. Pure — no Phaser, no storage, no curriculum.
//
// Criteria (docs/superpowers/specs/2026-09-30-chapter-medals-design.md):
//   1 AIRMANSHIP     boss passed
//   2 DISTINGUISHED  boss passed, every core skill ONLINE, shields never zero
//   3 ACE            boss passed, every core and every honors skill OPTIMIZED
//
// In this codebase a pass already implies shields never hit zero (a shields-down
// run ends the sortie and does not pass), so the T2 shields gate is implied
// today. It stays in the rule so the criteria row is honest and the rule
// survives any change to what "passed" means.

import type { EngineState } from "./types";

export type MedalTier = 1 | 2 | 3;

export interface MedalStanding {
  bossPassed: boolean;
  /** the boss run under evaluation ended with shields above zero */
  shieldsNeverZero: boolean;
  /** states for the chapter's core skills, and its attached honors skills */
  core: EngineState[];
  honors: EngineState[];
}

export const MEDAL_NAME: Record<MedalTier, string> = {
  1: "AIRMANSHIP",
  2: "DISTINGUISHED",
  3: "ACE",
};

export const MEDAL_CREDITS: Record<MedalTier, number> = { 1: 200, 2: 500, 3: 1000 };

const isOnline = (s: EngineState): boolean => s === "fluent" || s === "mastered";
const isOptimized = (s: EngineState): boolean => s === "mastered";

/** null when the boss has not passed; otherwise the tier the standing earns. */
export function candidateTier(s: MedalStanding): MedalTier | null {
  if (!s.bossPassed) return null;
  if (s.core.every(isOptimized) && s.honors.every(isOptimized)) return 3;
  if (s.core.every(isOnline) && s.shieldsNeverZero) return 2;
  return 1;
}

export function standingCounts(s: MedalStanding): {
  coreOnline: number;
  coreTotal: number;
  coreOptimized: number;
  honorsOptimized: number;
  honorsTotal: number;
} {
  return {
    coreOnline: s.core.filter(isOnline).length,
    coreTotal: s.core.length,
    coreOptimized: s.core.filter(isOptimized).length,
    honorsOptimized: s.honors.filter(isOptimized).length,
    honorsTotal: s.honors.length,
  };
}

/** The one line of what closes the gap to the next tier. */
export function gapLine(held: MedalTier | null, s: MedalStanding): string {
  const { coreOnline, coreTotal, coreOptimized, honorsOptimized, honorsTotal } = standingCounts(s);
  if (held === null) return "PASS THE BOSS FOR AIRMANSHIP";
  if (held === 1) {
    const short = coreTotal - coreOnline;
    return `NEXT: DISTINGUISHED${short > 0 ? ` · ${short} SKILLS TO ONLINE` : ""} · KEEP SHIELDS ABOVE 0`;
  }
  if (held === 2) {
    const toOptimize = coreTotal - coreOptimized;
    const honors = honorsTotal > 0 ? ` · HONORS ${honorsOptimized}/${honorsTotal}` : "";
    return `NEXT: ACE · ${toOptimize} TO OPTIMIZE${honors}`;
  }
  return honorsTotal > 0 ? "ACE · ALL HONORS COMPLETE" : "ACE · CHAPTER COMPLETE";
}

/**
 * The hangar card's one-line gap.
 *
 * The card's room is about 286 px at 14 px mono, so this stays under 29
 * characters — the full {@link gapLine} runs under the SORTIES button on a tall
 * card once a medal is held. The award scene carries the full criteria row, so
 * the short form only has to name the next step.
 */
export function gapLineShort(held: MedalTier | null, s: MedalStanding): string {
  const { coreOnline, coreTotal, coreOptimized, honorsOptimized, honorsTotal } = standingCounts(s);
  if (held === null) return "PASS THE BOSS";
  if (held === 1) {
    const short = coreTotal - coreOnline;
    return short > 0 ? `DISTINGUISHED · ${short} TO ONLINE` : "DISTINGUISHED · CLEAN BOSS";
  }
  if (held === 2) {
    const toOptimize = coreTotal - coreOptimized;
    const honorsLeft = honorsTotal - honorsOptimized;
    return honorsLeft > 0 ? `ACE · ${toOptimize + honorsLeft} TO GO` : `ACE · ${toOptimize} TO OPTIMIZE`;
  }
  return honorsTotal > 0 ? "ACE · ALL HONORS COMPLETE" : "ACE · COMPLETE";
}

/** Per-tier reward: T1 credits, T2 plus an intel card, T3 plus a livery. */
export function rewardFor(tier: MedalTier): { credits: number; intelCard: boolean; paint: boolean } {
  return { credits: MEDAL_CREDITS[tier], intelCard: tier === 2, paint: tier === 3 };
}
