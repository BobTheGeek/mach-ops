import { describe, it, expect } from "vitest";
import { withDateOverrides, isUnitOpen, type Schedule } from "../../src/engine/scheduler";

const base: Schedule = {
  quarters: [{ q: 1, starts: "2026-08-10" }, { q: 2, starts: "2026-11-02" }],
  units: [
    { id: "ch1", name: "One", quarter: 1, opens: "2026-08-10" },
    { id: "ch2", name: "Two", quarter: 1, opens: "2026-09-01" },
    { id: "ch3", name: "Three", quarter: 2, opens: "2026-11-02" },
  ],
  honors: {},
  blackbirdQualification: { opens: "2027-05-01" },
};

const open = (id: string, s: Schedule): boolean =>
  isUnitOpen(id, { schedule: s });

describe("withDateOverrides", () => {
  it("returns the same object when there is nothing to apply", () => {
    expect(withDateOverrides(base, {})).toBe(base);
    expect(withDateOverrides(base)).toBe(base);
  });

  it("moves the chapter it names and leaves the others alone", () => {
    const s = withDateOverrides(base, { ch2: "2026-10-05" });
    expect(s.units.find((u) => u.id === "ch2")!.opens).toBe("2026-10-05");
    expect(s.units.find((u) => u.id === "ch1")!.opens).toBe("2026-08-10");
  });

  it("does not mutate the schedule it was given", () => {
    withDateOverrides(base, { ch2: "2026-10-05" });
    expect(base.units.find((u) => u.id === "ch2")!.opens).toBe("2026-09-01");
  });

  it("ignores a date it cannot parse rather than opening everything", () => {
    const s = withDateOverrides(base, { ch2: "not a date" });
    expect(s.units.find((u) => u.id === "ch2")!.opens).toBe("2026-09-01");
  });

  it("ignores a unit id that is not in the schedule", () => {
    const s = withDateOverrides(base, { ch99: "2026-01-01" });
    expect(s.units).toHaveLength(base.units.length);
  });

  // A quarter is not a separate setting: it is its earliest chapter, so the two
  // can never contradict each other.
  it("pulls a quarter back when its first chapter moves earlier", () => {
    const s = withDateOverrides(base, { ch1: "2026-08-01" });
    expect(s.quarters.find((q) => q.q === 1)!.starts).toBe("2026-08-01");
  });

  it("pushes a quarter forward when every chapter in it moves later", () => {
    const s = withDateOverrides(base, { ch1: "2026-09-15", ch2: "2026-09-20" });
    expect(s.quarters.find((q) => q.q === 1)!.starts).toBe("2026-09-15");
  });

  it("leaves a quarter alone when only a later chapter in it moves", () => {
    const s = withDateOverrides(base, { ch2: "2026-10-05" });
    expect(s.quarters.find((q) => q.q === 1)!.starts).toBe("2026-08-10");
  });

  // Since the 2026-09-30 unlock ruling a moved date is informational: it no
  // longer opens or closes anything, in either direction.
  it("no longer gates on the moved date", () => {
    expect(open("ch2", base)).toBe(true);
    expect(open("ch2", withDateOverrides(base, { ch2: "2026-10-05" }))).toBe(true);
    expect(open("ch3", base)).toBe(true);
    expect(open("ch3", withDateOverrides(base, { ch3: "2026-08-15" }))).toBe(true);
  });
});
