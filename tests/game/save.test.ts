import { describe, it, expect, beforeEach } from "vitest";
import {
  newSave, recordAttempt, spendCredits, seeTip, passBoss, earnIntelCard, unlockAirframe,
  awardMedal, seeMedal, applyMedalAward,
  setCallsign, setPaint, setChapterDate, buyItem, owns, equip, recordBests,
  streakMultiplier, STREAK_STEP, STREAK_CAP,
  hasSeenHash, load, save, clear, SAVE_KEY, RECENT_HASHES, BASE_CREDITS, FAST_MULTIPLIER,
  gradeSortie, recordMissionBest, needsPilotName, isCallsignChar, DEFAULT_CALLSIGN, MAX_CALLSIGN,
  type SaveFile,
} from "../../src/game/save";
import type { Attempt } from "../../src/engine/types";

/** A tiny in-memory Storage so the tests never touch a real browser. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  } as Storage;
}

const attempt = (correct: boolean, skill = "ns.1.4"): Attempt => ({
  skill, tier: 1, correct, responseMs: 2000, hintsUsed: 0, context: "sortie", ts: 1,
});

let file: SaveFile;
beforeEach(() => { file = newSave(); });

describe("new save", () => {
  it("starts with the first airframe unlocked and nothing else", () => {
    expect(file.unlockedAirframes).toEqual(["t38"]);
    expect(file.credits).toBe(0);
    expect(file.log).toEqual([]);
    expect(file.bossesPassed).toEqual([]);
  });
});

describe("recordAttempt", () => {
  it("pays base credits for a correct answer and 1.5x for a fast one", () => {
    const slow = recordAttempt(file, { attempt: attempt(true), fastBonus: false, hash: "a", nextTier: 1 });
    expect(slow.credits).toBe(BASE_CREDITS);
    const fast = recordAttempt(file, { attempt: attempt(true), fastBonus: true, hash: "a", nextTier: 1 });
    expect(fast.credits).toBe(Math.round(BASE_CREDITS * FAST_MULTIPLIER));
  });

  it("pays nothing for a wrong answer and resets the streak", () => {
    let f = recordAttempt(file, { attempt: attempt(true), fastBonus: false, hash: "a", nextTier: 1 });
    f = recordAttempt(f, { attempt: attempt(true), fastBonus: false, hash: "b", nextTier: 1 });
    expect(f.streak).toBe(2);
    const earned = f.credits;
    f = recordAttempt(f, { attempt: attempt(false), fastBonus: false, hash: "c", nextTier: 1 });
    expect(f.streak).toBe(0);
    // The miss takes nothing away; it only ends the run.
    expect(f.credits).toBe(earned);
    // Two answers, the second of them carrying one step of the streak bonus.
    expect(earned).toBe(BASE_CREDITS + Math.round(BASE_CREDITS * streakMultiplier(2)));
  });

  it("remembers the best streak even after it breaks", () => {
    let f = file;
    for (let i = 0; i < 3; i++) f = recordAttempt(f, { attempt: attempt(true), fastBonus: false, hash: `h${i}`, nextTier: 1 });
    f = recordAttempt(f, { attempt: attempt(false), fastBonus: false, hash: "x", nextTier: 1 });
    expect(f.bestStreak).toBe(3);
    expect(f.streak).toBe(0);
  });

  it("appends to the log and stores the skill's next tier", () => {
    const f = recordAttempt(file, { attempt: attempt(true), fastBonus: false, hash: "a", nextTier: 3 });
    expect(f.log).toHaveLength(1);
    expect(f.tiers["ns.1.4"]).toBe(3);
  });

  it("keeps only the last 500 hashes for the no-repeat guard", () => {
    let f = file;
    for (let i = 0; i < RECENT_HASHES + 50; i++) {
      f = recordAttempt(f, { attempt: attempt(true), fastBonus: false, hash: `h${i}`, nextTier: 1 });
    }
    expect(f.recentHashes).toHaveLength(RECENT_HASHES);
    expect(hasSeenHash(f, `h${RECENT_HASHES + 49}`)).toBe(true);
    expect(hasSeenHash(f, "h0")).toBe(false);
  });

  it("does not mutate the file it was given", () => {
    const before = JSON.stringify(file);
    recordAttempt(file, { attempt: attempt(true), fastBonus: true, hash: "a", nextTier: 2 });
    expect(JSON.stringify(file)).toBe(before);
  });
});

describe("other reducers", () => {
  it("never spends below zero credits", () => {
    expect(spendCredits(file, 50).credits).toBe(0);
  });

  it("records a tip only once", () => {
    const once = seeTip(file, "FT1");
    expect(seeTip(once, "FT1").tipsSeen).toEqual(["FT1"]);
  });

  it("records a boss pass only once", () => {
    expect(passBoss(passBoss(file, "ch1"), "ch1").bossesPassed).toEqual(["ch1"]);
  });

  it("collects intel cards in order without duplicates", () => {
    let f = earnIntelCard(file, "t38", 3);
    f = earnIntelCard(f, "t38", 1);
    f = earnIntelCard(f, "t38", 3);
    expect(f.intelCards["t38"]).toEqual([1, 3]);
  });

  it("unlocks an airframe once and gives it an empty card set", () => {
    const f = unlockAirframe(unlockAirframe(file, "f4"), "f4");
    expect(f.unlockedAirframes).toEqual(["t38", "f4"]);
    expect(f.intelCards["f4"]).toEqual([]);
  });
});

describe("persistence", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    const f = recordAttempt(file, { attempt: attempt(true), fastBonus: true, hash: "a", nextTier: 2 });
    save(f, storage);
    expect(load(storage).credits).toBe(f.credits);
    expect(load(storage).log).toHaveLength(1);
  });

  it("starts a fresh pilot when storage is empty, corrupt or a different version", () => {
    const storage = memoryStorage();
    expect(load(storage).credits).toBe(0);
    storage.setItem(SAVE_KEY, "{not json");
    expect(load(storage).credits).toBe(0);
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99, credits: 500 }));
    expect(load(storage).credits).toBe(0);
  });

  it("fills in keys a save written by an older build is missing", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, credits: 42 }));
    const loaded = load(storage);
    expect(loaded.credits).toBe(42);
    expect(loaded.settings.volume).toBeGreaterThan(0);
    expect(loaded.recentHashes).toEqual([]);
  });

  it("clears", () => {
    const storage = memoryStorage();
    save(file, storage);
    clear(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("survives a storage that throws on write", () => {
    const hostile = { getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("no"); } } as unknown as Storage;
    expect(() => save(file, hostile)).not.toThrow();
    expect(() => clear(hostile)).not.toThrow();
    expect(load(hostile).credits).toBe(0);
  });
});

describe("the pilot's own settings", () => {
  const file = newSave();

  it("stores a callsign in capitals with the spaces trimmed off", () => {
    expect(setCallsign(file, "  viper ").callsign).toBe("VIPER");
  });

  it("keeps the old callsign rather than accept an empty one", () => {
    expect(setCallsign(file, "   ").callsign).toBe(file.callsign);
    expect(setCallsign(file, "").callsign).toBe(file.callsign);
  });

  it("cuts a long callsign to twelve characters, which is what the card fits", () => {
    expect(setCallsign(file, "abcdefghijklmnopq").callsign).toHaveLength(MAX_CALLSIGN);
  });

  it("records a paint scheme per airframe and leaves the others alone", () => {
    const one = setPaint(file, "t38", "nasa");
    const two = setPaint(one, "f18", "blueangels");
    expect(two.paint).toEqual({ t38: "nasa", f18: "blueangels" });
    expect(file.paint).toEqual({});
  });

  it("goes back to the standard scheme on an empty livery", () => {
    const painted = setPaint(file, "t38", "nasa");
    expect(setPaint(painted, "t38", "").paint.t38).toBe("");
  });

  it("gives a save written before paint schemes existed an empty one", () => {
    const storage = memoryStorage();
    const old = { ...newSave() } as Partial<SaveFile>;
    delete old.paint;
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    expect(load(storage).paint).toEqual({});
  });
});

describe("the pilot's name prompt", () => {
  it("asks a fresh pilot to name themselves", () => {
    expect(newSave().callsign).toBe(DEFAULT_CALLSIGN);
    expect(needsPilotName(newSave())).toBe(true);
  });

  it("stops asking once a real callsign is committed", () => {
    expect(needsPilotName(setCallsign(newSave(), "goose"))).toBe(false);
  });

  it("keeps asking when a blank entry left the default in place", () => {
    expect(needsPilotName(setCallsign(newSave(), "   "))).toBe(true);
  });

  it("asks again when a pilot deliberately goes back to the default name", () => {
    const named = setCallsign(newSave(), "goose");
    expect(needsPilotName(setCallsign(named, "maverick"))).toBe(true);
  });
});

describe("callsign characters", () => {
  it("accepts letters, digits, space and dash, which is what a callsign may carry", () => {
    for (const k of ["a", "Z", "7", " ", "-"]) expect(isCallsignChar(k)).toBe(true);
  });

  it("refuses everything else, keys the game binds elsewhere included", () => {
    for (const k of ["_", ".", "@", "Enter", "Escape", "Backspace"]) expect(isCallsignChar(k)).toBe(false);
  });
});

describe("chapter dates", () => {
  const file = newSave();

  it("starts with no date edits", () => {
    expect(file.scheduleDates).toEqual({});
  });

  it("records a moved chapter and leaves the others alone", () => {
    const one = setChapterDate(file, "ch4", "2026-11-09");
    const two = setChapterDate(one, "ch5", "2026-12-01");
    expect(two.scheduleDates).toEqual({ ch4: "2026-11-09", ch5: "2026-12-01" });
    expect(file.scheduleDates).toEqual({});
  });

  it("removes the edit on a blank date rather than storing an empty string", () => {
    const moved = setChapterDate(file, "ch4", "2026-11-09");
    expect(setChapterDate(moved, "ch4", "").scheduleDates).toEqual({});
  });

  it("gives a save written before date edits existed an empty map", () => {
    const storage = memoryStorage();
    const old = { ...newSave() } as Partial<SaveFile>;
    delete old.scheduleDates;
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    expect(load(storage).scheduleDates).toEqual({});
  });
});

describe("the streak multiplier", () => {
  it("pays plain on the first answer of a run", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(1)).toBe(1);
  });

  it("adds a step for each further answer in the run", () => {
    expect(streakMultiplier(2)).toBeCloseTo(1 + STREAK_STEP);
    expect(streakMultiplier(5)).toBeCloseTo(1 + 4 * STREAK_STEP);
  });

  it("caps, so a long run cannot run away with the economy", () => {
    expect(streakMultiplier(1000)).toBe(STREAK_CAP);
  });

  it("never drops below plain, so a miss costs the bonus and nothing more", () => {
    expect(streakMultiplier(-5)).toBe(1);
  });
});

describe("credits follow the streak", () => {
  const answer = (correct: boolean): Attempt => ({
    skill: "ns.1.1", tier: 1, correct, responseMs: 9000, hintsUsed: 0,
    context: "sortie", firstTry: true, ts: 1,
  });
  const fold = (f: SaveFile, correct: boolean): SaveFile =>
    recordAttempt(f, { attempt: answer(correct), fastBonus: false, hash: String(Math.random()), nextTier: 1 });

  it("pays the base rate for the first correct answer", () => {
    expect(fold(newSave(), true).credits).toBe(BASE_CREDITS);
  });

  it("pays more for the third than the second", () => {
    let f = newSave();
    f = fold(f, true);
    const afterFirst = f.credits;
    f = fold(f, true);
    const second = f.credits - afterFirst;
    const before = f.credits;
    f = fold(f, true);
    const third = f.credits - before;
    expect(third).toBeGreaterThan(second);
  });

  it("pays nothing for a wrong answer and starts the run again", () => {
    let f = newSave();
    f = fold(f, true); f = fold(f, true); f = fold(f, true);
    const before = f.credits;
    f = fold(f, false);
    expect(f.credits).toBe(before);
    expect(f.streak).toBe(0);
    // Back to the base rate, not below it.
    const after = fold(f, true);
    expect(after.credits - f.credits).toBe(BASE_CREDITS);
  });

  it("keeps the best streak through a miss", () => {
    let f = newSave();
    f = fold(f, true); f = fold(f, true);
    f = fold(f, false);
    expect(f.bestStreak).toBe(2);
  });
});

describe("the shop", () => {
  const rich: SaveFile = { ...newSave(), credits: 5000 };

  it("takes the credits and records what was bought", () => {
    const f = buyItem(rich, "hud.amber", 600);
    expect(f.credits).toBe(4400);
    expect(owns(f, "hud.amber")).toBe(true);
  });

  it("refuses when it cannot be afforded, and takes nothing", () => {
    const poor: SaveFile = { ...newSave(), credits: 100 };
    expect(buyItem(poor, "hud.amber", 600)).toBe(poor);
  });

  it("refuses to sell the same thing twice", () => {
    const once = buyItem(rich, "hud.amber", 600);
    expect(buyItem(once, "hud.amber", 600)).toBe(once);
  });

  it("only wears what has been bought", () => {
    expect(equip(rich, "hud", "hud.amber").hud).toBe("");
    const owned = buyItem(rich, "hud.amber", 600);
    expect(equip(owned, "hud", "hud.amber").hud).toBe("hud.amber");
  });

  it("always allows going back to the default", () => {
    const worn = equip(buyItem(rich, "hud.amber", 600), "hud", "hud.amber");
    expect(equip(worn, "hud", "").hud).toBe("");
  });
});

describe("personal bests", () => {
  const base = newSave();

  it("starts with nothing recorded", () => {
    expect(base.records.fastestSortieMs).toBeNull();
    expect(base.records.mostFirstTryHits).toBe(0);
  });

  it("takes the first sortie as the best of everything", () => {
    const f = recordBests(base, { durationMs: 90_000, firstTryHits: 5, credits: 700 });
    expect(f.records).toEqual({ fastestSortieMs: 90_000, mostFirstTryHits: 5, bestSortieCredits: 700 });
  });

  it("keeps the quickest time and the biggest counts", () => {
    let f = recordBests(base, { durationMs: 90_000, firstTryHits: 5, credits: 700 });
    f = recordBests(f, { durationMs: 120_000, firstTryHits: 8, credits: 400 });
    expect(f.records.fastestSortieMs).toBe(90_000);
    expect(f.records.mostFirstTryHits).toBe(8);
    expect(f.records.bestSortieCredits).toBe(700);
  });

  it("gives a save written before records existed an empty set", () => {
    const storage = memoryStorage();
    const old = { ...newSave() } as Partial<SaveFile>;
    delete old.records;
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    expect(load(storage).records.mostFirstTryHits).toBe(0);
  });
});

describe("sortie ratings", () => {
  const input = (over: Partial<Parameters<typeof gradeSortie>[0]> = {}) => ({
    firstTryHits: 6, problems: 10, escaped: 0, failed: false, hitsNeeded: 6, ...over,
  });

  it("rates a near-perfect clean flight OPTIMIZED", () => {
    expect(gradeSortie(input({ firstTryHits: 9 }))).toBe("OPTIMIZED");
    expect(gradeSortie(input({ firstTryHits: 10 }))).toBe("OPTIMIZED");
  });

  it("will not rate a flight with an escaped contact OPTIMIZED", () => {
    expect(gradeSortie(input({ firstTryHits: 10, escaped: 1 }))).toBe("ONLINE");
  });

  it("rates a card-earning flight ONLINE", () => {
    expect(gradeSortie(input({ firstTryHits: 6 }))).toBe("ONLINE");
    expect(gradeSortie(input({ firstTryHits: 5 }))).toBe("CALIBRATING");
  });

  it("rates a sortie that ran out of fuel or shields CALIBRATING", () => {
    expect(gradeSortie(input({ firstTryHits: 10, failed: true }))).toBe("CALIBRATING");
  });

  it("survives a mission with no problems at all", () => {
    expect(gradeSortie(input({ problems: 0, firstTryHits: 0 }))).toBe("CALIBRATING");
  });
});

describe("per-mission bests", () => {
  const base = newSave();

  it("records the first flight as the best of everything", () => {
    const f = recordMissionBest(base, "ch1-01", { grade: "ONLINE", firstTryHits: 7, durationMs: 80_000 });
    expect(f.missionBests["ch1-01"]).toEqual({ grade: "ONLINE", firstTryHits: 7, fastestMs: 80_000 });
  });

  it("keeps the better rating, the bigger hits and the quicker time", () => {
    let f = recordMissionBest(base, "ch1-01", { grade: "ONLINE", firstTryHits: 7, durationMs: 80_000 });
    f = recordMissionBest(f, "ch1-01", { grade: "OPTIMIZED", firstTryHits: 6, durationMs: 95_000 });
    expect(f.missionBests["ch1-01"]).toEqual({ grade: "OPTIMIZED", firstTryHits: 7, fastestMs: 80_000 });
  });

  it("never lets a worse run lower a best", () => {
    let f = recordMissionBest(base, "ch1-01", { grade: "OPTIMIZED", firstTryHits: 9, durationMs: 60_000 });
    f = recordMissionBest(f, "ch1-01", { grade: "CALIBRATING", firstTryHits: 2, durationMs: 120_000 });
    expect(f.missionBests["ch1-01"]).toEqual({ grade: "OPTIMIZED", firstTryHits: 9, fastestMs: 60_000 });
  });

  it("keeps missions apart from each other", () => {
    let f = recordMissionBest(base, "ch1-01", { grade: "ONLINE", firstTryHits: 7, durationMs: 80_000 });
    f = recordMissionBest(f, "ch1-02", { grade: "CALIBRATING", firstTryHits: 3, durationMs: 100_000 });
    expect(f.missionBests["ch1-01"]!.firstTryHits).toBe(7);
    expect(f.missionBests["ch1-02"]!.firstTryHits).toBe(3);
  });
});

describe("chapter medals", () => {
  it("starts with no medals and none seen", () => {
    const f = newSave();
    expect(f.medals).toEqual({});
    expect(f.medalsSeen).toEqual({});
  });

  it("raises a medal and never lowers it", () => {
    const a = awardMedal(newSave(), "ch2", 1);
    const b = awardMedal(a, "ch2", 2);
    expect(b.medals.ch2).toBe(2);
    expect(awardMedal(b, "ch2", 1).medals.ch2).toBe(2);
  });

  it("marks a medal seen only when one was earned", () => {
    expect(seeMedal(newSave(), "ch2").medalsSeen.ch2).toBeUndefined();
    expect(seeMedal(awardMedal(newSave(), "ch2", 2), "ch2").medalsSeen.ch2).toBe(2);
  });

  it("pays credits, a card and a livery in one application", () => {
    const f = applyMedalAward(newSave(), {
      unitId: "ch7", tier: 2, card: { airframe: "f18", index: 1 }, paintItem: null,
    });
    expect(f.credits).toBe(500);
    expect(f.intelCards.f18).toEqual([1]);
    expect(f.medals.ch7).toBe(2);
    const g = applyMedalAward(f, {
      unitId: "ch7", tier: 3, card: null, paintItem: "livery.f18.blueangels",
    });
    expect(g.credits).toBe(1500);
    expect(g.owned).toContain("livery.f18.blueangels");
    expect(g.medals.ch7).toBe(3);
  });

  it("fills the new maps on a save written before medals existed", () => {
    const storage = memoryStorage();
    const old = JSON.parse(JSON.stringify(newSave())) as Record<string, unknown>;
    delete old.medals;
    delete old.medalsSeen;
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    const loaded = load(storage);
    expect(loaded.medals).toEqual({});
    expect(loaded.medalsSeen).toEqual({});
  });
});
