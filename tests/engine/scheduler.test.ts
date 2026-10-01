import { describe, it, expect } from "vitest";
import {
  review, initialReview, reviewFor, isOverdue, isUnitOpen,
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
  // 2026-09-30 ruling: the whole campaign is playable from the first launch.
  // Dates, /dad overrides and boss-pass early unlock are informational only.
  const base = { schedule: SCHEDULE };

  it("opens every scheduled unit, whatever the calendar says", () => {
    for (const u of SCHEDULE.units) expect(isUnitOpen(u.id, base), u.id).toBe(true);
  });

  it("does not open a unit the schedule does not know", () => {
    expect(isUnitOpen("ch99", base)).toBe(false);
  });
});
