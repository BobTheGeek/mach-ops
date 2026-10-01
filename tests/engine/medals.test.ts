import { describe, it, expect } from "vitest";
import {
  candidateTier, gapLine, gapLineShort, standingCounts, rewardFor, MEDAL_NAME, MEDAL_CREDITS,
  type MedalStanding,
} from "../../src/engine/medals";

const standing = (over: Partial<MedalStanding> = {}): MedalStanding => ({
  bossPassed: true, shieldsNeverZero: true, core: ["mastered"], honors: [], ...over,
});

describe("candidateTier", () => {
  it("is null until the boss is passed", () => {
    expect(candidateTier(standing({ bossPassed: false }))).toBeNull();
  });
  it("reads AIRMANSHIP on the pass alone", () => {
    expect(candidateTier(standing({ core: ["learning", "new"] }))).toBe(1);
  });
  it("reads DISTINGUISHED when every core skill is ONLINE and the run was clean", () => {
    expect(candidateTier(standing({ core: ["fluent", "mastered"] }))).toBe(2);
  });
  it("holds at AIRMANSHIP when shields hit zero on the run", () => {
    expect(candidateTier(standing({ core: ["fluent"], shieldsNeverZero: false }))).toBe(1);
  });
  it("reads ACE when core and honors are all mastered", () => {
    expect(candidateTier(standing({ core: ["mastered"], honors: ["mastered"] }))).toBe(3);
  });
  it("holds at DISTINGUISHED while an honors skill is short", () => {
    expect(candidateTier(standing({ core: ["mastered"], honors: ["fluent"] }))).toBe(2);
  });
  it("treats an empty honors list as complete", () => {
    expect(candidateTier(standing({ core: ["mastered"], honors: [] }))).toBe(3);
  });
});

describe("gapLine", () => {
  it("names the boss as the way in", () => {
    expect(gapLine(null, standing({ bossPassed: false }))).toBe("PASS THE BOSS FOR AIRMANSHIP");
  });
  it("counts the core skills short of ONLINE", () => {
    expect(gapLine(1, standing({ core: ["fluent", "learning", "new"] })))
      .toBe("NEXT: DISTINGUISHED · 2 SKILLS TO ONLINE · KEEP SHIELDS ABOVE 0");
    expect(gapLine(1, standing({ core: ["fluent"] })))
      .toBe("NEXT: DISTINGUISHED · KEEP SHIELDS ABOVE 0");
  });
  it("counts the skills short of ACE, with honors", () => {
    expect(gapLine(2, standing({ core: ["mastered", "fluent"], honors: ["mastered", "new", "new"] })))
      .toBe("NEXT: ACE · 1 TO OPTIMIZE · HONORS 1/3");
    expect(gapLine(2, standing({ core: ["fluent"], honors: [] })))
      .toBe("NEXT: ACE · 1 TO OPTIMIZE");
  });
  it("reads complete at the top", () => {
    expect(gapLine(3, standing({ honors: ["mastered"] }))).toBe("ACE · ALL HONORS COMPLETE");
    expect(gapLine(3, standing({ honors: [] }))).toBe("ACE · CHAPTER COMPLETE");
  });
});

describe("standingCounts", () => {
  it("counts online and optimized separately", () => {
    expect(standingCounts(standing({ core: ["fluent", "mastered", "new"], honors: ["mastered"] })))
      .toEqual({ coreOnline: 2, coreTotal: 3, coreOptimized: 1, honorsOptimized: 1, honorsTotal: 1 });
  });
});

describe("gapLineShort", () => {
  // The hangar card's room is ~286 px at 14 px mono, so every short line has
  // to stay under 29 characters or it runs under the SORTIES button.

  it("names the boss as the way in", () => {
    expect(gapLineShort(null, standing({ bossPassed: false }))).toBe("PASS THE BOSS");
  });
  it("counts the core skills short of ONLINE, or says clean boss", () => {
    expect(gapLineShort(1, standing({ core: ["fluent", "learning", "new"] })))
      .toBe("DISTINGUISHED · 2 TO ONLINE");
    expect(gapLineShort(1, standing({ core: ["fluent"] })))
      .toBe("DISTINGUISHED · CLEAN BOSS");
  });
  it("counts everything left for ACE as one number", () => {
    expect(gapLineShort(2, standing({ core: ["mastered", "fluent"], honors: ["mastered", "new", "new"] })))
      .toBe("ACE · 3 TO GO");
    expect(gapLineShort(2, standing({ core: ["fluent"], honors: [] })))
      .toBe("ACE · 1 TO OPTIMIZE");
  });
  it("reads complete at the top", () => {
    expect(gapLineShort(3, standing({ honors: ["mastered"] }))).toBe("ACE · ALL HONORS COMPLETE");
    expect(gapLineShort(3, standing({ honors: [] }))).toBe("ACE · COMPLETE");
  });
  it("never outruns the card's room", () => {
    const lines = [
      gapLineShort(null, standing({ bossPassed: false })),
      gapLineShort(1, standing({ core: ["fluent", "learning", "new"] })),
      gapLineShort(1, standing({ core: ["fluent"] })),
      gapLineShort(2, standing({ core: ["mastered", "fluent"], honors: ["mastered", "new", "new"] })),
      gapLineShort(2, standing({ core: ["fluent"], honors: [] })),
      gapLineShort(3, standing({ honors: ["mastered"] })),
      gapLineShort(3, standing({ honors: [] })),
    ];
    for (const line of lines) expect(line.length, line).toBeLessThanOrEqual(29);
  });
});

describe("constants", () => {
  it("names the tiers and pins the rewards", () => {
    expect(MEDAL_NAME).toEqual({ 1: "AIRMANSHIP", 2: "DISTINGUISHED", 3: "ACE" });
    expect(MEDAL_CREDITS).toEqual({ 1: 200, 2: 500, 3: 1000 });
    expect(rewardFor(1)).toEqual({ credits: 200, intelCard: false, paint: false });
    expect(rewardFor(2)).toEqual({ credits: 500, intelCard: true, paint: false });
    expect(rewardFor(3)).toEqual({ credits: 1000, intelCard: false, paint: true });
  });
});
