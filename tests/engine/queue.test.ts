import { describe, it, expect } from "vitest";
import { buildQueue, sliceSizes, deinterleave, WEAK_CAP, SLICES, type QueueSkill, type QueueItem } from "../../src/engine/queue";
import { DAY_MS } from "../../src/engine/scheduler";
import { fastCorrect, slowWrong, T0 } from "./helpers";
import type { Attempt } from "../../src/engine/types";

const CH1: QueueSkill[] = ["ns.1.1", "ns.1.2", "ns.1.3", "ns.1.4", "ns.1.5"].map((id) => ({ id, chapter: "ch1", honors: false }));
const CH2: QueueSkill[] = ["ns.2.1", "ns.2.2", "ns.2.3"].map((id) => ({ id, chapter: "ch2", honors: false }));
const HONORS: QueueSkill[] = [{ id: "h8.ns.a1", honors: true, attachTo: ["ch1"] }];
const ALL = [...CH1, ...CH2, ...HONORS];

const NOW = T0 + 30 * DAY_MS;
const base = { skills: ALL, now: NOW, activeUnitId: "ch2", openUnitIds: ["ch1", "ch2"], seed: 7 };

/** Every ch1 skill answered long ago, so all of them are overdue by NOW. */
const staleLog: Attempt[] = CH1.flatMap((s) => [
  fastCorrect({ skill: s.id, day: 0 }),
  fastCorrect({ skill: s.id, day: 0 }),
  fastCorrect({ skill: s.id, day: 0 }),
]);

describe("slice sizes", () => {
  it("splits 50/30/20 when the weak cap is lifted", () => {
    const s = sliceSizes(20, 1);
    expect(s).toEqual({ weak: 20 * SLICES.weak, current: 20 * SLICES.current, warm: 20 * SLICES.warm });
  });

  it("caps the weak slice at 40% and keeps the 30:20 ratio for the rest", () => {
    const s = sliceSizes(20);
    expect(s.weak).toBe(8); // 40% of 20, not 50%
    expect(s.weak + s.current + s.warm).toBe(20);
    expect(s.current).toBeGreaterThan(s.warm);
  });

  it("never exceeds the weak cap at any mission length", () => {
    for (let n = 1; n <= 60; n++) {
      const s = sliceSizes(n);
      expect(s.weak).toBeLessThanOrEqual(Math.floor(n * WEAK_CAP));
      expect(s.weak + s.current + s.warm).toBe(n);
    }
  });
});

describe("deinterleave", () => {
  it("never puts the same skill next to itself", () => {
    const items: QueueItem[] = [
      ...Array.from({ length: 5 }, () => ({ skill: "a", tier: 1, slice: "weak", transfer: false } as QueueItem)),
      ...Array.from({ length: 5 }, () => ({ skill: "b", tier: 1, slice: "weak", transfer: false } as QueueItem)),
    ];
    const out = deinterleave(items);
    expect(out).toHaveLength(10);
    for (let i = 1; i < out.length; i++) expect(out[i]!.skill).not.toBe(out[i - 1]!.skill);
  });
});

describe("buildQueue", () => {
  it("returns exactly the requested number of problems", () => {
    expect(buildQueue({ ...base, log: staleLog, count: 20 })).toHaveLength(20);
  });

  it("never serves the same skill twice in a row", () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = buildQueue({ ...base, log: staleLog, count: 20, seed });
      for (let i = 1; i < q.length; i++) {
        expect(q[i]!.skill, `seed ${seed} index ${i}`).not.toBe(q[i - 1]!.skill);
      }
    }
  });

  it("holds the weak slice to 40% of a sortie", () => {
    const q = buildQueue({ ...base, log: staleLog, count: 20 });
    const weak = q.filter((i) => i.slice === "weak").length;
    expect(weak).toBe(8);
    expect(weak / q.length).toBeLessThanOrEqual(WEAK_CAP);
  });

  it("splits 50/30/20 when the cap is lifted", () => {
    const q = buildQueue({ ...base, log: staleLog, count: 20, weakCap: 1 });
    const count = (s: string): number => q.filter((i) => i.slice === s).length;
    expect([count("weak"), count("current"), count("warm")]).toEqual([10, 6, 4]);
  });

  it("draws the weak slice from overdue skills, lowest score first", () => {
    const log = [
      ...staleLog,
      // ns.1.3 is the weakest of the overdue set
      ...Array.from({ length: 6 }, () => slowWrong({ skill: "ns.1.3", day: 0 })),
    ];
    const q = buildQueue({ ...base, log, count: 20 });
    const weakSkills = q.filter((i) => i.slice === "weak").map((i) => i.skill);
    expect(weakSkills).toContain("ns.1.3");
  });

  it("draws the current slice from the active chapter", () => {
    const q = buildQueue({ ...base, log: staleLog, count: 20 });
    const currentSkills = new Set(q.filter((i) => i.slice === "current").map((i) => i.skill));
    for (const s of currentSkills) expect(s.startsWith("ns.2.")).toBe(true);
  });

  it("includes honors skills attached to the active chapter", () => {
    const q = buildQueue({ ...base, log: staleLog, activeUnitId: "ch1", count: 20 });
    const skills = new Set(q.map((i) => i.skill));
    expect(skills.has("h8.ns.a1")).toBe(true);
  });

  it("never serves a skill from a closed chapter", () => {
    const q = buildQueue({ ...base, log: staleLog, openUnitIds: ["ch1"], activeUnitId: "ch1", count: 20 });
    for (const item of q) expect(item.skill.startsWith("ns.2.")).toBe(false);
  });

  it("marks a transfer problem every 8-10 serves of a skill, at tier 4", () => {
    // The cadence is per skill, so it only fires once some skill has been served
    // 8 or more times: one open chapter, six skills, a 60-problem run.
    const q = buildQueue({ ...base, log: staleLog, openUnitIds: ["ch1"], activeUnitId: "ch1", count: 60 });
    const transfers = q.filter((i) => i.transfer);
    expect(transfers.length).toBeGreaterThan(0);
    for (const t of transfers) expect(t.tier).toBe(4);
  });

  it("spaces a skill's transfers 8 to 10 serves apart", () => {
    const q = buildQueue({ ...base, log: staleLog, openUnitIds: ["ch1"], activeUnitId: "ch1", count: 80 });

    // Serve numbers continue from the saved log, so start each skill's count there.
    const served = new Map<string, number>();
    for (const a of staleLog) served.set(a.skill, (served.get(a.skill) ?? 0) + 1);

    const marks = new Map<string, number[]>();
    for (const item of q) {
      const n = (served.get(item.skill) ?? 0) + 1;
      served.set(item.skill, n);
      if (item.transfer) marks.set(item.skill, [...(marks.get(item.skill) ?? []), n]);
    }

    expect(marks.size).toBeGreaterThan(0);
    for (const [skill, ns] of marks) {
      const cadence = ns[0]!;
      expect(cadence, `${skill} first transfer`).toBeGreaterThanOrEqual(8);
      expect(cadence, `${skill} first transfer`).toBeLessThanOrEqual(10);
      for (let i = 1; i < ns.length; i++) {
        expect(ns[i]! - ns[i - 1]!, `${skill} gap`).toBe(cadence);
      }
    }
  });

  it("is deterministic for the same seed and log", () => {
    const a = buildQueue({ ...base, log: staleLog, count: 20 });
    const b = buildQueue({ ...base, log: staleLog, count: 20 });
    expect(a).toEqual(b);
  });

  it("returns nothing when no chapter is open", () => {
    expect(buildQueue({ ...base, log: [], openUnitIds: [], count: 20 })).toEqual([]);
  });
});

describe("mission focus", () => {
  it("draws the current slice only from the focused skills", () => {
    const q = buildQueue({ ...base, log: staleLog, activeUnitId: "ch1", count: 20, focusSkills: ["ns.1.3"] });
    const current = q.filter((i) => i.slice === "current").map((i) => i.skill);
    expect(current.length).toBeGreaterThan(0);
    expect(new Set(current)).toEqual(new Set(["ns.1.3"]));
  });

  it("still reviews other skills around the focus", () => {
    const q = buildQueue({ ...base, log: staleLog, activeUnitId: "ch1", count: 20, focusSkills: ["ns.1.3"] });
    const others = q.filter((i) => i.skill !== "ns.1.3");
    expect(others.length).toBeGreaterThan(0);
  });

  it("falls back to the whole chapter when the focus names nothing available", () => {
    const q = buildQueue({ ...base, log: staleLog, activeUnitId: "ch1", count: 20, focusSkills: ["nope.1.1"] });
    const current = q.filter((i) => i.slice === "current").map((i) => i.skill);
    expect(current.length).toBeGreaterThan(0);
    // ch1 means its core skills plus the honors skills attached to it.
    const ch1Skills = ALL.filter((s) => s.chapter === "ch1" || (s.attachTo ?? []).includes("ch1")).map((s) => s.id);
    for (const s of current) expect(ch1Skills).toContain(s);
  });

  it("is unchanged when no focus is given", () => {
    const withEmpty = buildQueue({ ...base, log: staleLog, activeUnitId: "ch1", count: 20, focusSkills: [] });
    const without = buildQueue({ ...base, log: staleLog, activeUnitId: "ch1", count: 20 });
    expect(withEmpty).toEqual(without);
  });
});

describe("a first sortie still varies", () => {
  it("does not serve one skill over and over when nothing is overdue yet", () => {
    // A fresh pilot has no overdue skills and nothing warm, so both of those
    // slices fall back. If the fallback were narrowed to the focus, the whole
    // sortie would be one skill repeated.
    const q = buildQueue({ ...base, log: [], activeUnitId: "ch1", count: 12, focusSkills: ["ns.1.3"] });
    const distinct = new Set(q.map((i) => i.skill));
    expect(distinct.size).toBeGreaterThan(1);
    for (let i = 1; i < q.length; i++) expect(q[i]!.skill).not.toBe(q[i - 1]!.skill);
  });

  it("still leans on the focused skill", () => {
    const q = buildQueue({ ...base, log: [], activeUnitId: "ch1", count: 12, focusSkills: ["ns.1.3"] });
    const focusCount = q.filter((i) => i.skill === "ns.1.3").length;
    expect(focusCount).toBeGreaterThan(q.length / 6);
  });
});
