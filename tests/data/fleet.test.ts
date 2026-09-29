import { describe, it, expect } from "vitest";
import { FLEET, fleetEntry, FLEET_SOURCE } from "../../src/data/fleet";
import { BOSS_UNLOCKS, CAPSTONE_AIRFRAME } from "../../src/data/campaign";
import { STRUCTURE } from "../../src/ui/tokens";

describe("the fleet spec sheet", () => {
  it("has one entry per airframe, in the design's unlock order", () => {
    expect(FLEET.map((f) => f.airframe)).toEqual(STRUCTURE.airframes);
  });

  it("can find every airframe the unlock chain hands out", () => {
    for (const id of [...Object.values(BOSS_UNLOCKS), CAPSTONE_AIRFRAME]) {
      expect(fleetEntry(id), id).not.toBeNull();
    }
  });

  it("returns null for an airframe that is not in the fleet", () => {
    expect(fleetEntry("mig29")).toBeNull();
  });

  it("gives every entry a designation, a name and a note", () => {
    for (const f of FLEET) {
      expect(f.designation.length, f.airframe).toBeGreaterThan(0);
      expect(f.name.length, f.airframe).toBeGreaterThan(0);
      expect(f.note.length, f.airframe).toBeGreaterThan(20);
    }
  });

  it("states dimensions in metres, in a range a real aircraft occupies", () => {
    for (const f of FLEET) {
      expect(f.lengthM, f.airframe).toBeGreaterThan(10);
      expect(f.lengthM, f.airframe).toBeLessThan(40);
      expect(f.spanM, f.airframe).toBeGreaterThan(5);
      expect(f.spanM, f.airframe).toBeLessThan(25);
      expect(f.heightM, f.airframe).toBeGreaterThan(2);
      expect(f.heightM, f.airframe).toBeLessThan(10);
      expect(f.crew, f.airframe).toBeGreaterThanOrEqual(1);
      expect(f.crew, f.airframe).toBeLessThanOrEqual(2);
    }
  });

  it("rounds every dimension to the one decimal place the fact sheets publish", () => {
    for (const f of FLEET) {
      for (const v of [f.lengthM, f.spanM, f.heightM]) {
        expect(Math.round(v * 10) / 10, f.airframe).toBe(v);
      }
    }
  });

  // Two airframes are wider than they are long, and both cards say why: the
  // A-10 because of its wing, the F-14 because its span is quoted unswept. If
  // the figures ever drift, those two sentences stop being true.
  it("knows which airframes are wider than they are long", () => {
    const wide = FLEET.filter((f) => f.spanM > f.lengthM).map((f) => f.airframe);
    expect(wide).toEqual(["a10", "f14"]);
    expect(fleetEntry("a10")?.note).toMatch(/wider/i);
    expect(fleetEntry("f14")?.note).toMatch(/unswept/i);
  });

  it("leaves the speed out rather than invent one", () => {
    const missing = FLEET.filter((f) => f.topSpeed === null).map((f) => f.airframe);
    expect(missing).toEqual(["f4", "a10", "f14", "f15", "f117"]);
    for (const f of FLEET) {
      if (f.topSpeed !== null) expect(f.topSpeed.length, f.airframe).toBeGreaterThan(0);
    }
  });

  it("only offers liveries the design ships a sprite for", () => {
    const offered = FLEET.flatMap((f) => f.liveries.map((l) => `${f.airframe}:${l.id}`));
    expect(offered).toEqual(["t38:nasa", "f18:blueangels"]);
  });

  it("says where the figures came from", () => {
    expect(FLEET_SOURCE).toMatch(/accuracy-check\.md/);
  });
});
