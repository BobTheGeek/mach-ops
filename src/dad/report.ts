// What the /dad view shows, derived from the save file.
//
// design/README.md keeps the parent view deliberately off the game skin, and it
// keeps the arithmetic here rather than in the DOM: everything below is pure, so
// the heat map, the CSV and the schedule table are all testable without a
// browser and all three agree by construction.

import type { SaveFile } from "../game/save";
import { statusFor } from "../engine/mastery";
import { isUnitOpen, type Schedule, type ScheduleUnit } from "../engine/scheduler";
import type { Attempt, SystemsStatus } from "../engine/types";

/**
 * design/README.md heat scale. "unseen" is a skill with no attempts at all;
 * "unavailable" is one in a chapter the schedule has not opened yet, which the
 * artboard draws dashed rather than coloured.
 */
export type Heat = "strong" | "steady" | "flagged" | "unseen" | "unavailable";

/** Percent first-try accuracy at or above which a skill reads as strong. */
export const STRONG_AT = 85;
/** Below this it is flagged for attention. */
export const FLAGGED_BELOW = 70;

/**
 * Which answers the headline accuracy was computed from.
 *
 * design/README.md asks for first-try accuracy, and `Attempt.firstTry` records
 * it — but only for answers logged after that field existed. A save from before
 * then falls back to accuracy across every attempt, and says so rather than
 * quietly passing one off as the other.
 */
export type AccuracyBasis = "first-try" | "all-attempts";

export interface SkillRow {
  id: string;
  name: string;
  /** "ch3" */
  chapter: string;
  quarter: number;
  honors: boolean;
  status: SystemsStatus;
  attempts: number;
  correct: number;
  /** answers flagged as a first try, and how many of those were right */
  firstTries: number;
  firstTryCorrect: number;
  /** 0..100, or null when the skill has never been attempted */
  accuracy: number | null;
  /** null exactly when accuracy is null */
  basis: AccuracyBasis | null;
  /** epoch ms of the most recent attempt, or null */
  lastSeen: number | null;
  /** the error tag picked most often, and how often */
  topError: { tag: string; count: number } | null;
  heat: Heat;
}

export interface ChapterGroup {
  chapter: string;
  n: number;
  name: string;
  quarter: number;
  open: boolean;
  skills: SkillRow[];
  /** mean accuracy across attempted skills, or null when none attempted */
  accuracy: number | null;
}

export interface QuarterGroup {
  quarter: number;
  starts: string;
  chapters: ChapterGroup[];
}

export interface RegistrySkillLite {
  id: string;
  name: string;
  chapter?: string;
  honors: boolean;
  attachTo?: string[];
}

export interface ChapterLite {
  id: string;
  n: number;
  quarter: number;
  name: string;
}

/** Every attempt logged against one skill. */
export function attemptsOf(log: readonly Attempt[], skill: string): Attempt[] {
  return log.filter((a) => a.skill === skill);
}

/**
 * The distractor the student reaches for most on this skill.
 *
 * This is the one number on the page that says what to actually do about a
 * flagged skill, so it is worth more than the percentage next to it.
 */
export function topError(attempts: readonly Attempt[]): { tag: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const a of attempts) {
    if (!a.errorTag) continue;
    counts.set(a.errorTag, (counts.get(a.errorTag) ?? 0) + 1);
  }
  let best: { tag: string; count: number } | null = null;
  // Ties break on the tag name so the table does not reshuffle between renders.
  for (const [tag, count] of [...counts].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))) {
    best = { tag, count };
    break;
  }
  return best;
}

export function heatOf(accuracy: number | null, available: boolean): Heat {
  if (!available) return "unavailable";
  if (accuracy === null) return "unseen";
  if (accuracy >= STRONG_AT) return "strong";
  if (accuracy >= FLAGGED_BELOW) return "steady";
  return "flagged";
}

/** The chapter a skill belongs to: its own, or the first it is attached to. */
export function chapterOf(skill: RegistrySkillLite): string {
  return skill.chapter ?? skill.attachTo?.[0] ?? "";
}

export interface ReportInput {
  file: SaveFile;
  skills: RegistrySkillLite[];
  chapters: ChapterLite[];
  schedule: Schedule;
  now: number;
}

/**
 * First-try accuracy where the log records it, all-attempt accuracy otherwise.
 *
 * Preferring first-try even when only some answers carry the flag would mix two
 * different measures in one number, so the choice is all-or-nothing per skill.
 */
export function accuracyOf(attempts: readonly Attempt[]): {
  accuracy: number | null;
  basis: AccuracyBasis | null;
  firstTries: number;
  firstTryCorrect: number;
} {
  const firsts = attempts.filter((a) => a.firstTry === true);
  const firstTryCorrect = firsts.filter((a) => a.correct).length;

  if (firsts.length > 0) {
    return {
      accuracy: Math.round((firstTryCorrect / firsts.length) * 100),
      basis: "first-try",
      firstTries: firsts.length,
      firstTryCorrect,
    };
  }
  if (attempts.length === 0) {
    return { accuracy: null, basis: null, firstTries: 0, firstTryCorrect: 0 };
  }
  const correct = attempts.filter((a) => a.correct).length;
  return {
    accuracy: Math.round((correct / attempts.length) * 100),
    basis: "all-attempts",
    firstTries: 0,
    firstTryCorrect: 0,
  };
}

export function buildRow(input: ReportInput, skill: RegistrySkillLite, open: boolean): SkillRow {
  const attempts = attemptsOf(input.file.log, skill.id);
  const correct = attempts.filter((a) => a.correct).length;
  const chapter = chapterOf(skill);
  const ch = input.chapters.find((c) => c.id === chapter);
  const { accuracy, basis, firstTries, firstTryCorrect } = accuracyOf(attempts);
  return {
    id: skill.id,
    name: skill.name,
    chapter,
    quarter: ch?.quarter ?? 0,
    honors: skill.honors,
    status: statusFor(input.file.log, skill.id),
    attempts: attempts.length,
    correct,
    firstTries,
    firstTryCorrect,
    accuracy,
    basis,
    lastSeen: attempts.length === 0 ? null : Math.max(...attempts.map((a) => a.ts)),
    topError: topError(attempts),
    heat: heatOf(accuracy, open),
  };
}

/** Is this unit open right now, schedule or parent override or boss pass? */
export function unitOpen(input: ReportInput, unit: ScheduleUnit): boolean {
  return isUnitOpen(unit.id, {
    schedule: input.schedule,
    now: input.now,
    bossesPassed: new Set(input.file.bossesPassed),
    overrides: input.file.scheduleOverrides,
    toggles: input.file.parentToggles,
  });
}

/** The whole heat map: quarter, then chapter, then sub-skill in registry order. */
export function buildReport(input: ReportInput): QuarterGroup[] {
  const quarters: QuarterGroup[] = [];

  for (const q of input.schedule.quarters) {
    const chapters: ChapterGroup[] = [];

    for (const ch of input.chapters.filter((c) => c.quarter === q.q)) {
      const unit = input.schedule.units.find((u) => u.id === ch.id);
      const open = unit ? unitOpen(input, unit) : false;
      const skills = input.skills
        .filter((s) => chapterOf(s) === ch.id)
        .map((s) => buildRow(input, s, open));

      const seen = skills.filter((s) => s.accuracy !== null);
      chapters.push({
        chapter: ch.id,
        n: ch.n,
        name: ch.name,
        quarter: q.q,
        open,
        skills,
        accuracy: seen.length === 0
          ? null
          : Math.round(seen.reduce((t, s) => t + (s.accuracy ?? 0), 0) / seen.length),
      });
    }

    quarters.push({ quarter: q.q, starts: q.starts, chapters });
  }

  return quarters;
}

/** Every row, flattened, in the order the heat map draws them. */
export function allRows(report: QuarterGroup[]): SkillRow[] {
  return report.flatMap((q) => q.chapters.flatMap((c) => c.skills));
}

/* -------------------------------------------------------------- summary */

export interface Summary {
  total: number;
  online: number;
  flagged: number;
  unseen: number;
  attempts: number;
  /** 0..100, or null when nothing has been answered */
  accuracy: number | null;
  /** which answers that accuracy came from, by the same rule a row uses */
  basis: AccuracyBasis | null;
  sortiesFlown: number;
  lastSeen: number | null;
}

export function summarise(report: QuarterGroup[], file: SaveFile): Summary {
  const rows = allRows(report);
  const attempts = file.log.length;
  const overall = accuracyOf(file.log);
  const seen = rows.map((r) => r.lastSeen).filter((t): t is number => t !== null);
  return {
    total: rows.length,
    online: rows.filter((r) => r.status === "ONLINE" || r.status === "OPTIMIZED").length,
    flagged: rows.filter((r) => r.heat === "flagged").length,
    unseen: rows.filter((r) => r.heat === "unseen" || r.heat === "unavailable").length,
    attempts,
    accuracy: overall.accuracy,
    basis: overall.basis,
    sortiesFlown: file.sortiesFlown,
    lastSeen: seen.length === 0 ? null : Math.max(...seen),
  };
}

/* ------------------------------------------------------------------ csv */

/** RFC 4180: quote every field, double any quote inside it. */
export function csvCell(value: string | number | null): string {
  if (value === null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export const CSV_HEADER = [
  "skill", "name", "chapter", "quarter", "honors", "status",
  "attempts", "correct", "first_tries", "first_try_correct",
  "accuracy_pct", "accuracy_basis", "top_error", "top_error_count", "last_seen_iso",
];

export function toCsv(rows: readonly SkillRow[]): string {
  const lines = [CSV_HEADER.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.name, r.chapter, r.quarter, r.honors ? "yes" : "no", r.status,
      r.attempts, r.correct, r.firstTries, r.firstTryCorrect,
      r.accuracy, r.basis,
      r.topError?.tag ?? null, r.topError?.count ?? null,
      r.lastSeen === null ? null : new Date(r.lastSeen).toISOString(),
    ].map(csvCell).join(","));
  }
  // A trailing newline, so the file ends the way a spreadsheet expects.
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------- schedule */

export interface ScheduleRow {
  unit: ScheduleUnit;
  chapterName: string;
  /** the date in force: the parent's edit if there is one, else the shipped date */
  opens: string;
  open: boolean;
  /** forced open or closed by the parent, rather than by the date */
  overridden: boolean;
  /** the parent has moved this chapter's date */
  moved: boolean;
  /** the airframe passing this unit's boss earns, or null */
  earns: string | null;
}

export function scheduleRows(
  input: ReportInput,
  chapters: ChapterLite[],
  unlocks: Record<string, string>,
): ScheduleRow[] {
  return input.schedule.units.map((unit) => ({
    unit,
    chapterName: chapters.find((c) => c.id === unit.id)?.name ?? unit.name,
    opens: unit.opens,
    open: unitOpen(input, unit),
    overridden: Object.prototype.hasOwnProperty.call(input.file.scheduleOverrides, unit.id),
    moved: Object.prototype.hasOwnProperty.call(input.file.scheduleDates, unit.id),
    earns: unlocks[unit.id] ?? null,
  }));
}

/* ------------------------------------------------------------- activity */

export interface ActivityDay {
  /** YYYY-MM-DD in local time, which is the day the parent actually means */
  day: string;
  attempts: number;
  correct: number;
  skills: number;
}

export function localDay(ts: number): string {
  const d = new Date(ts);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Newest day first, which is the order a parent reads it in. */
export function activityByDay(log: readonly Attempt[]): ActivityDay[] {
  const days = new Map<string, { attempts: number; correct: number; skills: Set<string> }>();
  for (const a of log) {
    const key = localDay(a.ts);
    const row = days.get(key) ?? { attempts: 0, correct: 0, skills: new Set<string>() };
    row.attempts += 1;
    if (a.correct) row.correct += 1;
    row.skills.add(a.skill);
    days.set(key, row);
  }
  return [...days]
    .map(([day, r]) => ({ day, attempts: r.attempts, correct: r.correct, skills: r.skills.size }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
