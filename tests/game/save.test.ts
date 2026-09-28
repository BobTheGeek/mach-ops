import { describe, it, expect, beforeEach } from "vitest";
import {
  newSave, recordAttempt, spendCredits, seeTip, passBoss, earnIntelCard, unlockAirframe,
  hasSeenHash, load, save, clear, SAVE_KEY, RECENT_HASHES, BASE_CREDITS, FAST_MULTIPLIER,
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
    f = recordAttempt(f, { attempt: attempt(false), fastBonus: false, hash: "c", nextTier: 1 });
    expect(f.streak).toBe(0);
    expect(f.credits).toBe(BASE_CREDITS * 2);
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
