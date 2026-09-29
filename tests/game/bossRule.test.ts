import { describe, it, expect } from "vitest";
import { MISSIONS } from "../../src/data/campaign";
import { LANE_OFFSETS, LOCK_RANGE, BOSS_LOCK_RANGE } from "../../src/game/sortieRules";

describe("the boss rule", () => {
  it("holds a tighter cone than an ordinary sortie", () => {
    expect(BOSS_LOCK_RANGE).toBeLessThan(LOCK_RANGE);
  });

  // The rule has to bite without ever stranding a contact. Every lane a contact
  // can arrive in must sit inside even the tighter cone, or a boss could put one
  // on screen that cannot be locked at all.
  it("keeps every lane reachable even at the boss cone", () => {
    for (const dx of LANE_OFFSETS) {
      expect(Math.abs(dx), `lane ${dx}`).toBeLessThan(BOSS_LOCK_RANGE);
    }
  });

  it("leaves a margin, so a contact is not lockable only at the exact centre", () => {
    const widest = Math.max(...LANE_OFFSETS.map(Math.abs));
    expect(BOSS_LOCK_RANGE - widest).toBeGreaterThan(40);
  });

  it("applies to the bosses the campaign actually has", () => {
    const bosses = MISSIONS.filter((m) => m.kind === "boss");
    expect(bosses.length).toBe(10);
  });
});
