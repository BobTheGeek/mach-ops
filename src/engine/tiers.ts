// Per-skill tier movement.
// Rule (docs/engine-rules.md "Tiers"): tier up after 2 consecutive fast-correct,
// tier down after 2 wrong at the same tier. Tier 1 floor, tier 4 ceiling.
//
// Pure reducer: feed it attempts in order, it never reads a clock.

import type { Attempt, Tier } from "./types";
import { isFast } from "./mastery";

export const MIN_TIER: Tier = 1;
export const MAX_TIER: Tier = 4;
export const UP_AFTER_FAST_CORRECT = 2;
export const DOWN_AFTER_WRONG = 2;

export interface TierState {
  tier: Tier;
  /** consecutive fast-correct answers at the current tier */
  fastCorrectStreak: number;
  /** consecutive wrong answers at the current tier */
  wrongStreak: number;
}

export function initialTierState(tier: Tier = MIN_TIER): TierState {
  return { tier, fastCorrectStreak: 0, wrongStreak: 0 };
}

function clamp(t: number): Tier {
  return Math.min(MAX_TIER, Math.max(MIN_TIER, t)) as Tier;
}

/** Apply one attempt. Counters reset whenever the tier actually moves. */
export function applyAttempt(state: TierState, a: Attempt): TierState {
  if (a.correct) {
    if (!isFast(a)) {
      // slow + correct: learned, not fluent. Hold the tier, clear the wrong run.
      return { ...state, fastCorrectStreak: 0, wrongStreak: 0 };
    }
    const streak = state.fastCorrectStreak + 1;
    if (streak >= UP_AFTER_FAST_CORRECT && state.tier < MAX_TIER) {
      return { tier: clamp(state.tier + 1), fastCorrectStreak: 0, wrongStreak: 0 };
    }
    return { ...state, fastCorrectStreak: streak, wrongStreak: 0 };
  }

  const wrong = state.wrongStreak + 1;
  if (wrong >= DOWN_AFTER_WRONG && state.tier > MIN_TIER) {
    return { tier: clamp(state.tier - 1), fastCorrectStreak: 0, wrongStreak: 0 };
  }
  return { ...state, fastCorrectStreak: 0, wrongStreak: wrong };
}

/** Replay a whole log for one skill. */
export function tierFor(log: readonly Attempt[], skill: string, start: Tier = MIN_TIER): TierState {
  let s = initialTierState(start);
  for (const a of log) if (a.skill === skill) s = applyAttempt(s, a);
  return s;
}
