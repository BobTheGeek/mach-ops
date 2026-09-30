import { describe, it, expect } from "vitest";
import {
  paceMs, estimatedSortieMs, estimateMinutes, fuelCovers, LOCK_TRANSIT_MS,
} from "../../src/engine/pacing";
import { DEFAULT_BASELINE_MS } from "../../src/engine/mastery";
import { MISSIONS } from "../../src/data/campaign";
import { TANKER_SECONDS } from "../../src/game/sortieRules";
import { attempt } from "./helpers";

describe("sortie pacing", () => {
  it("takes the pace from the median correct answer", () => {
    const log = [
      attempt({ correct: true, responseMs: 4000 }),
      attempt({ correct: true, responseMs: 6000 }),
      attempt({ correct: true, responseMs: 20_000 }),
      attempt({ correct: false, responseMs: 90_000 }),
    ];
    expect(paceMs(log)).toBe(6000);
  });

  it("falls back to the default pace when nothing correct has been answered", () => {
    expect(paceMs([])).toBe(DEFAULT_BASELINE_MS);
    expect(paceMs([attempt({ correct: false })])).toBe(DEFAULT_BASELINE_MS);
  });

  it("adds the flying time between contacts to the answer time", () => {
    expect(estimatedSortieMs(10, 6000)).toBe(10 * (6000 + LOCK_TRANSIT_MS));
    expect(estimatedSortieMs(0, 6000)).toBe(0);
  });

  it("reports whole minutes and never less than one", () => {
    expect(estimateMinutes(estimatedSortieMs(12, 8000))).toBe(2);
    expect(estimateMinutes(1000)).toBe(1);
  });

  // Fuel burns only in flight, never while a card is up, so the budget really
  // covers flying. This is the floor no mission may fall through: even a pilot
  // taking half a minute to line each contact up reaches the last problem, with
  // the one tanker top-up.
  describe("the fuel guard", () => {
    it("covers every mission at a slow contact pace", () => {
      for (const m of MISSIONS) {
        expect(fuelCovers(m.problems, m.fuelSeconds, TANKER_SECONDS), m.id).toBe(true);
      }
    });

    it("would catch a budget that is too thin", () => {
      expect(fuelCovers(18, 60, TANKER_SECONDS)).toBe(false);
      expect(fuelCovers(18, 400, TANKER_SECONDS)).toBe(false);
      expect(fuelCovers(18, 460, TANKER_SECONDS)).toBe(true);
    });
  });
});