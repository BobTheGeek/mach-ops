import { describe, it, expect } from "vitest";
import { PATROL_WEAVE_PX, PATROL_WEAVE_PERIOD, patrolWeave } from "../../src/game/sortieRules";
import { MISSIONS } from "../../src/data/campaign";

describe("the patrol weave", () => {
  it("stays inside its documented amplitude", () => {
    for (let t = 0; t < 30; t += 0.17) {
      for (let lane = 0; lane < 3; lane++) {
        expect(Math.abs(patrolWeave(t, lane))).toBeLessThanOrEqual(PATROL_WEAVE_PX + 1e-9);
      }
    }
  });

  it("is deterministic in elapsed time, so a replay weaves the same", () => {
    expect(patrolWeave(3.25, 1)).toBe(patrolWeave(3.25, 1));
  });

  it("puts the lanes out of phase, so they do not move as one wall", () => {
    expect(patrolWeave(1, 0)).not.toBeCloseTo(patrolWeave(1, 1));
    expect(patrolWeave(1, 1)).not.toBeCloseTo(patrolWeave(1, 2));
  });

  it("completes a cycle in the documented period", () => {
    expect(patrolWeave(0, 0)).toBeCloseTo(patrolWeave(PATROL_WEAVE_PERIOD, 0), 9);
  });
});

describe("mission shapes", () => {
  it("has patrols in the campaign that actually fly the patrol behaviour", () => {
    expect(MISSIONS.filter((m) => m.kind === "patrol").length).toBe(21);
  });

  it("has exactly one capstone and it is the Blackbird Qualification", () => {
    const capstones = MISSIONS.filter((m) => m.capstone);
    expect(capstones).toHaveLength(1);
    expect(capstones[0]!.id).toBe("ch10-10");
    expect(capstones[0]!.kind).toBe("boss");
  });
});