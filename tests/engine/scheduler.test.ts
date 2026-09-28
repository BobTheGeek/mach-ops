import { describe, it, expect } from "vitest";
import {
  review, initialReview, reviewFor, isOverdue, isUnitOpen, activeUnit, isoToMs,
  DAY_MS, MAX_INTERVAL_DAYS, type Schedule,
} from "../../src/engine/scheduler";
import { fastCorrect, fastWrong, slowWrong, T0 } from "./helpers";
import schedule from "../../src/data/schedule.json";

const SCHEDULE = schedule as unknown as Schedule;

describe("spaced repetition", () => {
  it("starts a new skill at 1 day", () => {
    expect(initialReview().intervalDays).toBe(1);
  });

  it("doubles the interval on success and caps at 21 days", () => {
    let r = initialReview();
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) {
      r = review(r, fastCorrect({ day: i }));
      seen.push(r.intervalDays);
    }
    expect(seen.slice(0, 5)).toEqual([2, 4, 8, 16, MAX_INTERVAL_DAYS]);
    expect(seen.every((d) => d <= MAX_INTERVAL_DAYS)).toBe(true);
  });

  it("resets to 1 day on a slow wrong answer", () => {
    let r = initialReview();
    for (let i = 0; i < 4; i++) r = review(r, fastCorrect({ day: i }));
    expect(r.intervalDays).toBe(16);
    r = review(r, slowWrong({ day: 5 }));
    expect(r.intervalDays).toBe(1);
  });

  it("halves the interval on a fast-wrong instead of resetting it", () => {
    let r = initialReview();
    for (let i = 0; i < 4; i++) r = review(r, fastCorrect({ day: i }));
    expect(r.intervalDays).toBe(16);
    r = review(r, fastWrong({ day: 5 }));
    expect(r.intervalDays).toBe(8);
  });

  it("never halves below 1 day", () => {
    let r = initialReview();
    for (let i = 0; i < 5; i++) r = review(r, fastWrong({ day: i }));
    expect(r.intervalDays).toBe(1);
  });

  it("sets nextDue to the attempt time plus the interval", () => {
    const r = review(initialReview(), fastCorrect({ day: 0 }));
    expect(r.nextDue).toBe(T0 + 2 * DAY_MS);
  });

  it("is not overdue before nextDue, and is after", () => {
    const r = reviewFor([fastCorrect({ day: 0 })], "ns.1.1");
    expect(isOverdue(r, T0 + DAY_MS)).toBe(false);
    expect(isOverdue(r, T0 + 3 * DAY_MS)).toBe(true);
  });

  it("treats an unattempted skill as new, not overdue", () => {
    expect(isOverdue(initialReview(), T0)).toBe(false);
  });
});

describe("chapter opening", () => {
  const base = { schedule: SCHEDULE, bossesPassed: new Set<string>() };

  it("opens a unit on its schedule date", () => {
    expect(isUnitOpen("ch1", { ...base, now: isoToMs("2026-08-09") })).toBe(false);
    expect(isUnitOpen("ch1", { ...base, now: isoToMs("2026-08-10") })).toBe(true);
  });

  it("keeps a later unit shut until its own date", () => {
    expect(isUnitOpen("ch5", { ...base, now: isoToMs("2026-08-10") })).toBe(false);
  });

  it("opens the next unit early only when the parent allows it and the boss is passed", () => {
    const now = isoToMs("2026-08-20"); // ch2 opens 2026-08-31
    expect(isUnitOpen("ch2", { ...base, now, bossesPassed: new Set(["ch1"]) })).toBe(false);
    expect(isUnitOpen("ch2", {
      ...base, now, bossesPassed: new Set(["ch1"]),
      toggles: { allowEarlyUnlockOnBossPass: true, honorsRequiredForBoss: false },
    })).toBe(true);
  });

  it("lets a /dad override win over the schedule in both directions", () => {
    const now = isoToMs("2026-08-20");
    expect(isUnitOpen("ch7", { ...base, now, overrides: { ch7: true } })).toBe(true);
    expect(isUnitOpen("ch1", { ...base, now, overrides: { ch1: false } })).toBe(false);
  });

  it("reports the latest open unit as the active one", () => {
    expect(activeUnit({ ...base, now: isoToMs("2026-09-25") })?.id).toBe("ch3");
  });
});
