// Pilot ranks.
//
// DESIGN_RECONCILIATION.md section 4: "Ranks: 5 insignia, advance on total
// mastered skills." The Profile artboard (Screens 12) names the five and shows
// an XP bar instead; where the two disagree the reconciliation stands, so rank
// is computed from mastered skills and XP is not modelled.
//
// Pure: give it the number of mastered skills, it gives you the rank.

export const RANKS = ["CADET", "2ND LT", "CAPTAIN", "MAJOR", "COLONEL"] as const;
export type Rank = (typeof RANKS)[number];

/**
 * Mastered-skill count at which each rank is reached, over the 83-skill registry.
 * The artboard ladder pins ranks to units (Cadet U1, 2nd Lt U2, Captain U3-4,
 * Major U5, Colonel U6) rather than to a count; these thresholds reproduce that
 * shape against the real skill totals. Flagged in docs/PHASE2-NOTES.md.
 */
export const RANK_THRESHOLDS: Record<Rank, number> = {
  CADET: 0,
  "2ND LT": 8,
  CAPTAIN: 20,
  MAJOR: 40,
  COLONEL: 65,
};

export function rankFor(masteredSkills: number): Rank {
  let rank: Rank = "CADET";
  for (const r of RANKS) if (masteredSkills >= RANK_THRESHOLDS[r]) rank = r;
  return rank;
}

export function nextRank(masteredSkills: number): { rank: Rank; at: number } | null {
  const current = rankFor(masteredSkills);
  const i = RANKS.indexOf(current);
  const next = RANKS[i + 1];
  return next ? { rank: next, at: RANK_THRESHOLDS[next] } : null;
}

/** Progress toward the next rank as 0..1; 1 when already at the top. */
export function rankProgress(masteredSkills: number): number {
  const next = nextRank(masteredSkills);
  if (!next) return 1;
  const from = RANK_THRESHOLDS[rankFor(masteredSkills)];
  return Math.min(1, Math.max(0, (masteredSkills - from) / (next.at - from)));
}
