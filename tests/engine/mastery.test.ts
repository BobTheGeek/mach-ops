import { describe, it, expect } from "vitest";
import {
  masteryScore, stateFor, statusFor, diagnose, baselineMs, median,
  accuracyComponent, transferComponent, TRANSFER_CAP, FAST_WINDOW_MS, WEIGHTS,
  DEFAULT_BASELINE_MS,
} from "../../src/engine/mastery";
import { attempt, fastCorrect, fastWrong, slowCorrect, slowWrong } from "./helpers";
import type { Attempt } from "../../src/engine/types";

const S = "ns.1.4";
const many = (n: number, make: () => Attempt): Attempt[] => Array.from({ length: n }, make);

describe("mastery score", () => {
  it("is 0 for a skill with no attempts", () => {
    expect(masteryScore([], S)).toBe(0);
  });

  it("weights higher tiers more heavily in the accuracy component", () => {
    const easyRight = accuracyComponent([fastCorrect({ tier: 1 }), fastWrong({ tier: 4 })]);
    const hardRight = accuracyComponent([fastWrong({ tier: 1 }), fastCorrect({ tier: 4 })]);
    expect(hardRight).toBeGreaterThan(easyRight);
  });

  it("caps the score at 0.70 until 2 transfer problems are correct", () => {
    const drilled = many(10, () => fastCorrect({ skill: S }));
    expect(masteryScore(drilled, S)).toBeCloseTo(TRANSFER_CAP, 5);
  });

  it("lifts past the cap once 2 transfer problems are correct", () => {
    const log = [
      ...many(8, () => fastCorrect({ skill: S })),
      fastCorrect({ skill: S, context: "transfer", tier: 4 }),
      fastCorrect({ skill: S, context: "transfer", tier: 4 }),
    ];
    expect(masteryScore(log, S)).toBeGreaterThan(TRANSFER_CAP);
  });

  it("scores only the last 10 attempts", () => {
    const log = [...many(10, () => slowWrong({ skill: S })), ...many(10, () => fastCorrect({ skill: S }))];
    expect(masteryScore(log, S)).toBeCloseTo(TRANSFER_CAP, 5); // the old misses are out of the window
  });

  it("reports transfer accuracy on transfer attempts only", () => {
    const log = [
      fastWrong({ skill: S }),
      fastCorrect({ skill: S, context: "transfer" }),
      fastWrong({ skill: S, context: "transfer" }),
    ];
    expect(transferComponent(log)).toBe(0.5);
  });
});

describe("baseline and fluency", () => {
  it("leans on the fastest 20% once there are answers to measure", () => {
    const log = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000].map((ms) =>
      attempt({ responseMs: ms, correct: true }));
    // fastest 20% of 10 = 2 attempts: 1000 and 2000 -> median 1500, blended with
    // the 8 s prior as one observation: (8000 + 10 x 1500) / 11 = 2091
    expect(baselineMs(log)).toBe(2091);
  });

  // The prior exists so one lucky answer cannot set the pilot's pace. This was
  // the bug: a 1.5 s fast answer on the first problem read as the baseline, and
  // honest answers afterwards looked slow until the log grew.
  it("does not let a single lucky answer collapse the baseline", () => {
    const log = [attempt({ responseMs: 1000, correct: true })];
    expect(baselineMs(log)).toBe((DEFAULT_BASELINE_MS + 1000) / 2);
    expect(baselineMs(log)).toBeGreaterThan(4000);
  });

  it("fades the prior out as evidence accumulates", () => {
    const log = many(100, () => fastCorrect({ responseMs: 2000 }));
    const b = baselineMs(log);
    // (8000 + 100 x 2000) / 101 = 2059: close to the measured 2 s
    expect(b).toBe(2059);
    expect(b).toBeLessThan(2200);
  });

  it("ignores wrong answers when setting the baseline", () => {
    const log = [attempt({ responseMs: 100, correct: false }), attempt({ responseMs: 4000, correct: true })];
    expect(baselineMs(log)).toBe((DEFAULT_BASELINE_MS + 4000) / 2);
  });

  it("uses the default alone when nothing correct has been answered", () => {
    expect(baselineMs([attempt({ correct: false })])).toBe(DEFAULT_BASELINE_MS);
    expect(baselineMs([])).toBe(DEFAULT_BASELINE_MS);
  });

  it("median handles even and odd lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe("states", () => {
  it("is new below 3 attempts and reads OFFLINE", () => {
    const log = many(2, () => fastCorrect({ skill: S }));
    expect(stateFor(log, S)).toBe("new");
    expect(statusFor(log, S)).toBe("OFFLINE");
  });

  it("is learning below 0.60 and reads CALIBRATING", () => {
    const log = many(6, () => slowWrong({ skill: S }));
    expect(masteryScore(log, S)).toBeLessThan(0.6);
    expect(statusFor(log, S)).toBe("CALIBRATING");
  });

  it("is fluent in the middle band and reads ONLINE", () => {
    const log = many(10, () => fastCorrect({ skill: S }));
    expect(statusFor(log, S)).toBe("ONLINE");
  });

  it("is mastered above 0.85 with 2 transfer correct and reads OPTIMIZED", () => {
    const log = [
      ...many(8, () => fastCorrect({ skill: S })),
      fastCorrect({ skill: S, context: "transfer", tier: 4 }),
      fastCorrect({ skill: S, context: "transfer", tier: 4 }),
    ];
    expect(stateFor(log, S)).toBe("mastered");
    expect(statusFor(log, S)).toBe("OPTIMIZED");
  });

  it("drops a mastered skill back to fluent when a review attempt is failed", () => {
    const base = [
      ...many(8, () => fastCorrect({ skill: S })),
      fastCorrect({ skill: S, context: "transfer", tier: 4 }),
      fastCorrect({ skill: S, context: "transfer", tier: 4 }),
    ];
    expect(stateFor(base, S)).toBe("mastered");
    expect(stateFor([...base, fastWrong({ skill: S })], S)).toBe("fluent");
  });
});

describe("speed as a diagnostic", () => {
  it("splits on the 5 second fast window", () => {
    expect(FAST_WINDOW_MS).toBe(5000);
    expect(diagnose(attempt({ responseMs: 5000, correct: true }))).toBe("fast-correct");
    expect(diagnose(attempt({ responseMs: 5001, correct: true }))).toBe("slow-correct");
  });

  it("names all four patterns", () => {
    expect(diagnose(fastCorrect())).toBe("fast-correct");
    expect(diagnose(fastWrong())).toBe("fast-wrong");
    expect(diagnose(slowCorrect())).toBe("slow-correct");
    expect(diagnose(slowWrong())).toBe("slow-wrong");
  });
});

describe("accuracy outranks speed (ruling, 2026-09-28)", () => {
  const fastRun = (n: number, correct: boolean): Attempt[] =>
    Array.from({ length: n }, () => (correct ? fastCorrect({ skill: S }) : fastWrong({ skill: S })));
  const slowRun = (n: number, correct: boolean): Attempt[] =>
    Array.from({ length: n }, () => (correct ? slowCorrect({ skill: S }) : slowWrong({ skill: S })));
  /** A baseline of fast answers on another skill, so "slow" means slow for this pilot. */
  const baseline = many(10, () => fastCorrect({ skill: "other" }));

  it("puts a pilot who gets everything right but is slow ONLINE", () => {
    expect(statusFor([...baseline, ...slowRun(10, true)], S)).toBe("ONLINE");
  });

  it("keeps a pilot who gets 7 of 10 right CALIBRATING, however fast", () => {
    expect(statusFor([...baseline, ...fastRun(7, true), ...fastRun(3, false)], S)).toBe("CALIBRATING");
  });

  it("needs 8 of the last 10 at pace", () => {
    expect(statusFor([...baseline, ...fastRun(8, true), ...fastRun(2, false)], S)).toBe("ONLINE");
  });

  it("needs 9 of the last 10 when slow", () => {
    expect(statusFor([...baseline, ...slowRun(8, true), ...slowRun(2, false)], S)).toBe("CALIBRATING");
    expect(statusFor([...baseline, ...slowRun(9, true), ...slowRun(1, false)], S)).toBe("ONLINE");
  });

  it("still weights accuracy above fluency and fluency above nothing", () => {
    expect(WEIGHTS.accuracy).toBeGreaterThan(WEIGHTS.transfer);
    expect(WEIGHTS.transfer).toBeGreaterThan(WEIGHTS.fluency);
    expect(WEIGHTS.fluency).toBeGreaterThan(0);
    expect(WEIGHTS.accuracy + WEIGHTS.fluency + WEIGHTS.transfer).toBeCloseTo(1, 10);
  });
});
