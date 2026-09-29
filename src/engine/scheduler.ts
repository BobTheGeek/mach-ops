// Spaced repetition and chapter opening.
// Rules: docs/engine-rules.md "Spaced repetition" and DESIGN_RECONCILIATION.md section 4.
//
// Pure. Every function that needs "now" takes it as an argument.

import type { Attempt } from "./types";
import { diagnose } from "./mastery";

export const DAY_MS = 86_400_000;
export const START_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 21;
export const MIN_INTERVAL_DAYS = 1;

export interface Review {
  intervalDays: number;
  /** epoch ms; 0 until the skill has been attempted once */
  nextDue: number;
}

export function initialReview(): Review {
  return { intervalDays: START_INTERVAL_DAYS, nextDue: 0 };
}

/**
 * Advance one skill's review schedule.
 *
 * success       -> interval x2, capped at 21 days
 * fast-wrong    -> interval halved (careless, not unlearned), floor 1 day
 * any other miss-> interval reset to 1 day
 */
export function review(prev: Review, a: Attempt): Review {
  const current = prev.intervalDays || START_INTERVAL_DAYS;
  let intervalDays: number;

  if (a.correct) {
    intervalDays = Math.min(MAX_INTERVAL_DAYS, current * 2);
  } else if (diagnose(a) === "fast-wrong") {
    intervalDays = Math.max(MIN_INTERVAL_DAYS, Math.floor(current / 2));
  } else {
    intervalDays = START_INTERVAL_DAYS;
  }

  return { intervalDays, nextDue: a.ts + intervalDays * DAY_MS };
}

/** Replay a whole log for one skill. */
export function reviewFor(log: readonly Attempt[], skill: string): Review {
  let r = initialReview();
  for (const a of log) if (a.skill === skill) r = review(r, a);
  return r;
}

export function isOverdue(r: Review, now: number): boolean {
  // A skill that has never been attempted is not "overdue" — it is new.
  return r.nextDue > 0 && r.nextDue <= now;
}

/* -------------------------------------------------- chapter opening */

export interface ScheduleUnit {
  id: string;
  name: string;
  quarter: number;
  /** ISO date, YYYY-MM-DD */
  opens: string;
}

export interface Schedule {
  quarters: { q: number; starts: string }[];
  units: ScheduleUnit[];
  honors: Record<string, string[]>;
  blackbirdQualification: { opens: string };
}

/** Parent toggles from the /dad view. Both default off. */
export interface ParentToggles {
  allowEarlyUnlockOnBossPass: boolean;
  honorsRequiredForBoss: boolean;
}

export const DEFAULT_TOGGLES: ParentToggles = {
  allowEarlyUnlockOnBossPass: false,
  honorsRequiredForBoss: false,
};

/** Midnight UTC of an ISO date. Dates are calendar days, not instants. */
export function isoToMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/**
 * The schedule actually in force, after the parent's date edits.
 *
 * schedule.json ships the district's placeholder dates and the game fetches it
 * from a deployed URL, so the browser cannot write to it. A parent who moves a
 * chapter is really adding an override to their own save, and this folds those
 * overrides back into a Schedule so everything downstream — isUnitOpen,
 * openUnits, activeUnit, the hangar, the heat map — keeps reading one shape and
 * cannot disagree about what the dates are.
 *
 * A quarter's start is not a separate setting: it is the earliest chapter in
 * that quarter, so moving the first chapter moves the quarter with it and the
 * two can never contradict each other.
 */
export function withDateOverrides(
  schedule: Schedule,
  dates: Readonly<Record<string, string>> = {},
): Schedule {
  if (Object.keys(dates).length === 0) return schedule;

  const units = schedule.units.map((u) => {
    const moved = dates[u.id];
    return moved && !Number.isNaN(isoToMs(moved)) ? { ...u, opens: moved } : u;
  });

  const quarters = schedule.quarters.map((q) => {
    const inQuarter = units.filter((u) => u.quarter === q.q).map((u) => u.opens).sort();
    return inQuarter.length === 0 ? q : { ...q, starts: inQuarter[0]! };
  });

  return { ...schedule, units, quarters };
}

export interface UnlockInput {
  schedule: Schedule;
  now: number;
  /** unit ids whose boss sortie has been passed */
  bossesPassed: ReadonlySet<string>;
  /** /dad overrides: unit id -> forced open/closed. Wins over everything until cleared. */
  overrides?: Readonly<Record<string, boolean>>;
  toggles?: ParentToggles;
}

/**
 * Is a unit open?
 *
 * Precedence: /dad override > schedule date > previous boss passed
 * (the last only when the parent has enabled early unlock).
 */
export function isUnitOpen(unitId: string, input: UnlockInput): boolean {
  const { schedule, now, bossesPassed, overrides, toggles = DEFAULT_TOGGLES } = input;

  const override = overrides?.[unitId];
  if (override !== undefined) return override;

  const index = schedule.units.findIndex((u) => u.id === unitId);
  if (index < 0) return false;
  const unit = schedule.units[index]!;

  if (now >= isoToMs(unit.opens)) return true;

  if (toggles.allowEarlyUnlockOnBossPass) {
    if (index === 0) return true;
    const prev = schedule.units[index - 1]!;
    return bossesPassed.has(prev.id);
  }
  return false;
}

export function openUnits(input: UnlockInput): ScheduleUnit[] {
  return input.schedule.units.filter((u) => isUnitOpen(u.id, input));
}

/** The active chapter: the last open unit, i.e. where the class currently is. */
export function activeUnit(input: UnlockInput): ScheduleUnit | null {
  const open = openUnits(input);
  return open.length ? open[open.length - 1]! : null;
}
