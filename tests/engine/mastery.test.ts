import { describe, it, expect } from "vitest";
import {
  masteryScore, stateFor, statusFor, diagnose, baselineMs, median,
  accuracyComponent, transferComponent, TRANSFER_CAP, FAST_WINDOW_MS,
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
  it("takes the baseline from the fastest 20% of correct answers across all skills", () => {
    const log = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000].map((ms) =>
      attempt({ responseMs: ms, correct: true }));
    // fastest 20% of 10 = 2 attempts: 1000 and 2000 -> median 1500
    expect(baselineMs(log)).toBe(1500);
  });

  it("ignores wrong answers when setting the baseline", () => {
    const log = [attempt({ responseMs: 100, correct: false }), attempt({ responseMs: 4000, correct: true })];
    expect(baselineMs(log)).toBe(4000);
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
