import { describe, it, expect } from "vitest";
import { applyAttempt, initialTierState, tierFor, MAX_TIER, MIN_TIER } from "../../src/engine/tiers";
import { fastCorrect, fastWrong, slowCorrect, slowWrong } from "./helpers";

describe("tiers", () => {
  it("tiers up after 2 consecutive fast-correct", () => {
    let s = initialTierState(1);
    s = applyAttempt(s, fastCorrect());
    expect(s.tier).toBe(1); // one is not enough
    s = applyAttempt(s, fastCorrect());
    expect(s.tier).toBe(2);
  });

  it("does not tier up on slow-correct", () => {
    let s = initialTierState(1);
    s = applyAttempt(s, slowCorrect());
    s = applyAttempt(s, slowCorrect());
    expect(s.tier).toBe(1);
  });

  it("a slow-correct between two fast-correct breaks the streak", () => {
    let s = initialTierState(1);
    s = applyAttempt(s, fastCorrect());
    s = applyAttempt(s, slowCorrect());
    s = applyAttempt(s, fastCorrect());
    expect(s.tier).toBe(1);
  });

  it("tiers down after 2 wrong at the same tier", () => {
    let s = initialTierState(3);
    s = applyAttempt(s, slowWrong());
    expect(s.tier).toBe(3);
    s = applyAttempt(s, slowWrong());
    expect(s.tier).toBe(2);
  });

  it("a correct answer clears the wrong run", () => {
    let s = initialTierState(3);
    s = applyAttempt(s, slowWrong());
    s = applyAttempt(s, slowCorrect());
    s = applyAttempt(s, slowWrong());
    expect(s.tier).toBe(3);
  });

  it("clamps to tier 1 and tier 4", () => {
    let s = initialTierState(MAX_TIER);
    for (let i = 0; i < 10; i++) s = applyAttempt(s, fastCorrect());
    expect(s.tier).toBe(MAX_TIER);

    s = initialTierState(MIN_TIER);
    for (let i = 0; i < 10; i++) s = applyAttempt(s, fastWrong());
    expect(s.tier).toBe(MIN_TIER);
  });

  it("tracks each skill separately when replaying a mixed log", () => {
    const log = [
      fastCorrect({ skill: "ns.1.1" }), fastCorrect({ skill: "ns.1.1" }),
      slowWrong({ skill: "ns.1.2" }), slowWrong({ skill: "ns.1.2" }),
    ];
    expect(tierFor(log, "ns.1.1", 1).tier).toBe(2);
    expect(tierFor(log, "ns.1.2", 3).tier).toBe(2);
  });
});
