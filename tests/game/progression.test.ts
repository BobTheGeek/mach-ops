import { describe, it, expect } from "vitest";
import { rankFor, nextRank, rankProgress, RANKS, RANK_THRESHOLDS } from "../../src/engine/ranks";
import { newSave, completeSortie } from "../../src/game/save";
import { CARDS_PER_AIRFRAME, FIRST_TRY_HITS_FOR_CARD } from "../../src/data/intel";

describe("ranks", () => {
  it("starts every pilot at Cadet", () => {
    expect(rankFor(0)).toBe("CADET");
  });

  it("climbs the ladder in order and never skips backwards", () => {
    let seen = 0;
    for (let mastered = 0; mastered <= 83; mastered++) {
      const i = RANKS.indexOf(rankFor(mastered));
      expect(i).toBeGreaterThanOrEqual(seen);
      seen = i;
    }
  });

  it("reaches each rank exactly at its threshold", () => {
    for (const r of RANKS) expect(rankFor(RANK_THRESHOLDS[r])).toBe(r);
  });

  it("tops out at Colonel", () => {
    expect(rankFor(83)).toBe("COLONEL");
    expect(nextRank(83)).toBeNull();
    expect(rankProgress(83)).toBe(1);
  });

  it("reports progress toward the next rank between 0 and 1", () => {
    for (let m = 0; m <= 83; m++) {
      const p = rankProgress(m);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    expect(nextRank(0)?.rank).toBe("2ND LT");
  });
});

describe("completeSortie", () => {
  const opts = {
    missionId: "ch1-01",
    airframe: "t38",
    hitsNeeded: FIRST_TRY_HITS_FOR_CARD,
    cardsPerAirframe: CARDS_PER_AIRFRAME,
  };

  it("counts the sortie and remembers the mission", () => {
    const { file } = completeSortie(newSave(), { ...opts, firstTryHits: 0 });
    expect(file.sortiesFlown).toBe(1);
    expect(file.missionsFlown).toEqual(["ch1-01"]);
  });

  it("does not list the same mission twice when it is re-flown", () => {
    let file = completeSortie(newSave(), { ...opts, firstTryHits: 0 }).file;
    file = completeSortie(file, { ...opts, firstTryHits: 0 }).file;
    expect(file.missionsFlown).toEqual(["ch1-01"]);
    expect(file.sortiesFlown).toBe(2);
  });

  it("awards no card below the first-try threshold", () => {
    const { cardEarned } = completeSortie(newSave(), { ...opts, firstTryHits: FIRST_TRY_HITS_FOR_CARD - 1 });
    expect(cardEarned).toBeNull();
  });

  it("awards the next card at or above the threshold", () => {
    const { file, cardEarned } = completeSortie(newSave(), { ...opts, firstTryHits: FIRST_TRY_HITS_FOR_CARD });
    expect(cardEarned).toBe(1);
    expect(file.intelCards["t38"]).toEqual([1]);
  });

  it("awards cards one at a time, in order", () => {
    let file = newSave();
    for (let i = 1; i <= CARDS_PER_AIRFRAME; i++) {
      const r = completeSortie(file, { ...opts, firstTryHits: 10 });
      expect(r.cardEarned).toBe(i);
      file = r.file;
    }
    expect(file.intelCards["t38"]).toHaveLength(CARDS_PER_AIRFRAME);
  });

  it("stops at ten cards per airframe", () => {
    let file = newSave();
    for (let i = 0; i < CARDS_PER_AIRFRAME; i++) file = completeSortie(file, { ...opts, firstTryHits: 10 }).file;
    const r = completeSortie(file, { ...opts, firstTryHits: 10 });
    expect(r.cardEarned).toBeNull();
    expect(r.file.intelCards["t38"]).toHaveLength(CARDS_PER_AIRFRAME);
  });

  it("does not mutate the file it was given", () => {
    const file = newSave();
    const before = JSON.stringify(file);
    completeSortie(file, { ...opts, firstTryHits: 10 });
    expect(JSON.stringify(file)).toBe(before);
  });
});
