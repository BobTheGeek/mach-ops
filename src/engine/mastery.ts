// Mastery score and engine state per skill.
// Rules: docs/engine-rules.md "Adaptive progression engine".
//
// Pure functions over an attempt log. No Phaser, no storage, no clock reads —
// every function that needs "now" takes it as an argument so tests are stable.

import type { Attempt, EngineState, SkillState, SystemsStatus, Tier } from "./types";
import { STATUS_BY_STATE } from "./types";

/** tokens.motion.fastBonusRing.duration — the fast-bonus window. */
export const FAST_WINDOW_MS = 5000;

/** The score window: "over the last 10 attempts". */
export const WINDOW = 10;

/**
 * Accuracy dominates, fluency nudges.
 *
 * docs/engine-rules.md quotes the game design doc at 50/30/20. At that weighting
 * a pilot who answered 10 of 10 correctly but slowly read CALIBRATING, while one
 * who got 7 of 10 but answered fast read ONLINE — speed outranked being right.
 * Bob ruled on 2026-09-28 to keep fluency but shrink it; see docs/DECISIONS.md.
 *
 * Green now needs 8 of the last 10, or 9 of 10 at a slower pace.
 */
export const WEIGHTS = { accuracy: 0.7, fluency: 0.1, transfer: 0.2 } as const;

/** Tier weight applied to both the correct count and the denominator. */
export const TIER_WEIGHT: Record<Tier, number> = { 1: 1.0, 2: 1.25, 3: 1.5, 4: 2.0 };

/** Score ceiling until the skill has 2 correct transfer problems. */
export const TRANSFER_CAP = 0.7;
export const TRANSFER_CAP_MIN_CORRECT = 2;

export const LEARNING_MAX = 0.6;
export const FLUENT_MAX = 0.85;
export const NEW_MIN_ATTEMPTS = 3;

/** Fluency floor: at 3x the player's own baseline the fluency component is 0. */
export const FLUENCY_SLOW_MULTIPLE = 3;

/** Fallback baseline (ms) before the player has enough correct answers to set one. */
export const DEFAULT_BASELINE_MS = 8000;

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * The player's personal speed baseline: the median of the fastest 20% of their
 * correct answers across all skills. It is a floor for "fluent", not a target.
 */
export function baselineMs(log: readonly Attempt[]): number {
  const times = log.filter((a) => a.correct).map((a) => a.responseMs).sort((x, y) => x - y);
  if (times.length === 0) return DEFAULT_BASELINE_MS;
  const n = Math.max(1, Math.ceil(times.length * 0.2));
  return median(times.slice(0, n));
}

export function isFast(a: Attempt): boolean {
  return a.responseMs <= FAST_WINDOW_MS;
}

/** Tier-weighted accuracy over the window. */
export function accuracyComponent(window: readonly Attempt[]): number {
  if (window.length === 0) return 0;
  let num = 0, den = 0;
  for (const a of window) {
    const w = TIER_WEIGHT[a.tier];
    den += w;
    if (a.correct) num += w;
  }
  return den === 0 ? 0 : num / den;
}

/** Median response time against the player's baseline, clamped to [0, 1]. */
export function fluencyComponent(window: readonly Attempt[], baseline: number): number {
  const times = window.map((a) => a.responseMs);
  if (times.length === 0) return 0;
  const m = median(times);
  const slow = baseline * FLUENCY_SLOW_MULTIPLE;
  if (m <= baseline) return 1;
  if (m >= slow) return 0;
  return (slow - m) / (slow - baseline);
}

/** Plain accuracy on transfer attempts only. */
export function transferComponent(window: readonly Attempt[]): number {
  const t = window.filter((a) => a.context === "transfer");
  if (t.length === 0) return 0;
  return t.filter((a) => a.correct).length / t.length;
}

export function attemptsFor(log: readonly Attempt[], skill: string): Attempt[] {
  return log.filter((a) => a.skill === skill);
}

/**
 * Mastery score in [0, 1] for one skill.
 * Capped at TRANSFER_CAP until the skill has 2 correct transfer problems —
 * fluency on drilled problems alone never reads as mastery.
 */
export function masteryScore(log: readonly Attempt[], skill: string): number {
  const all = attemptsFor(log, skill);
  if (all.length === 0) return 0;
  const window = all.slice(-WINDOW);

  const raw =
    WEIGHTS.accuracy * accuracyComponent(window) +
    WEIGHTS.fluency * fluencyComponent(window, baselineMs(log)) +
    WEIGHTS.transfer * transferComponent(window);

  const transferCorrect = all.filter((a) => a.context === "transfer" && a.correct).length;
  return transferCorrect >= TRANSFER_CAP_MIN_CORRECT ? raw : Math.min(raw, TRANSFER_CAP);
}

export function stateFor(log: readonly Attempt[], skill: string): EngineState {
  const all = attemptsFor(log, skill);
  if (all.length < NEW_MIN_ATTEMPTS) return "new";

  const score = masteryScore(log, skill);
  const transferCorrect = all.filter((a) => a.context === "transfer" && a.correct).length;

  if (score > FLUENT_MAX && transferCorrect >= TRANSFER_CAP_MIN_CORRECT) {
    // Mastered drops back to fluent if a review attempt is failed.
    return all[all.length - 1]!.correct ? "mastered" : "fluent";
  }
  if (score < LEARNING_MAX) return "learning";
  return "fluent";
}

export function statusFor(log: readonly Attempt[], skill: string): SystemsStatus {
  return STATUS_BY_STATE[stateFor(log, skill)];
}

/**
 * How the engine should respond to the last attempt, from the speed-as-diagnostic
 * table. The queue and tier modules consume this; it holds no state of its own.
 */
export type Diagnosis = "fast-correct" | "fast-wrong" | "slow-correct" | "slow-wrong";

export function diagnose(a: Attempt): Diagnosis {
  const fast = isFast(a);
  if (a.correct) return fast ? "fast-correct" : "slow-correct";
  return fast ? "fast-wrong" : "slow-wrong";
}

/** Everything the UI and the queue need about one skill, in one object. */
export function skillState(log: readonly Attempt[], skill: string, tier: Tier, intervalDays: number, nextDue: number): SkillState {
  const all = attemptsFor(log, skill);
  const state = stateFor(log, skill);
  return {
    skill,
    tier,
    score: masteryScore(log, skill),
    state,
    status: STATUS_BY_STATE[state],
    attempts: all.length,
    transferCorrect: all.filter((a) => a.context === "transfer" && a.correct).length,
    intervalDays,
    nextDue,
    lastAttempt: all.length ? all[all.length - 1]!.ts : 0,
  };
}
