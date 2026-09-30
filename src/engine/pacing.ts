// How long a sortie is expected to take, from the pilot's own pace.
//
// The pilot is a single-server queue: one problem is answered at a time, so
// Little's Law (L = λW) reduces to "duration = problems x time per problem".
// The time per problem has two parts: the answer, taken from the attempt log,
// and the flying between contacts, taken from the world's own geometry.
//
// Pure: no Phaser, no storage, no clock.

import type { Attempt } from "./types";
import { DEFAULT_BASELINE_MS, median } from "./mastery";

/**
 * Flying time between contacts, ms.
 *
 * A contact spawns above the nose and the world closes at SPEED (190 px/s)
 * while the pilot banks across lanes at STRAFE (150 px/s). Getting onto a
 * contact and inside a 340 px cone is a second or two of aligned flight and
 * nearer three when the pilot has to cross lanes, so this is the middle of the
 * two, not the best case.
 */
export const LOCK_TRANSIT_MS = 2500;

/**
 * Flying time per contact a struggling pilot might take, ms.
 *
 * Fuel burns only in flight, never while a problem card is up, so a sortie's
 * fuel budget is really a budget of flying time. Half a minute per contact is
 * a generous "slow" figure — weaving patrols and boss cones make it plausible —
 * and the fuel guard below holds every mission to it.
 */
export const SLOW_CONTACT_MS = 30_000;

/** The pilot's median correct answer time, ms, or the default pace with none. */
export function paceMs(log: readonly Attempt[]): number {
  const times = log.filter((a) => a.correct).map((a) => a.responseMs);
  return times.length === 0 ? DEFAULT_BASELINE_MS : Math.round(median(times));
}

/** Expected wall-clock time for a sortie: answer time plus flying time. */
export function estimatedSortieMs(problems: number, pace: number): number {
  return Math.round(problems * (pace + LOCK_TRANSIT_MS));
}

/** Rounded to whole minutes, never less than one, for a card that says "~6 MIN". */
export function estimateMinutes(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}

/**
 * Can the tank cover its problems at a slow pace, including the one top-up?
 *
 * Not a substitute for difficulty tuning: it is the floor a mission should
 * never fall through, so a pilot who is struggling to line contacts up still
 * reaches the last problem.
 */
export function fuelCovers(problems: number, fuelSeconds: number, tankerSeconds: number): boolean {
  return fuelSeconds + tankerSeconds >= (problems * SLOW_CONTACT_MS) / 1000;
}