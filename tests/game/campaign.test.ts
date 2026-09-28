import { describe, it, expect } from "vitest";
import { CH1_MISSIONS, CH2_MISSIONS, MISSIONS, missionsFor, mission } from "../../src/data/campaign";
import { DOSSIERS, dossier, CARDS_PER_AIRFRAME, FIRST_TRY_HITS_FOR_CARD } from "../../src/data/intel";
import { IMPLEMENTED_SKILLS } from "../../src/generators/index";
import curriculum from "../../src/data/curriculum.json";

const skillsIn = (chapter: string): string[] =>
  (curriculum as unknown as { skills: { id: string; chapter?: string }[] }).skills
    .filter((s) => s.chapter === chapter)
    .map((s) => s.id);

const ch1Skills = skillsIn("ch1");

const UNITS: [string, typeof CH1_MISSIONS][] = [["ch1", CH1_MISSIONS], ["ch2", CH2_MISSIONS]];

describe.each(UNITS)("%s campaign", (unitId, missions) => {
  const unitSkills = skillsIn(unitId);

  it("has 8 to 12 sorties", () => {
    expect(missions.length).toBeGreaterThanOrEqual(8);
    expect(missions.length).toBeLessThanOrEqual(12);
  });

  it("ends with exactly one boss sortie", () => {
    const bosses = missions.filter((m) => m.kind === "boss");
    expect(bosses).toHaveLength(1);
    expect(bosses[0]!.n).toBe(missions.length);
  });

  it("introduces every skill of its own chapter in its own sortie", () => {
    const introduced = missions.filter((m) => m.focus.length === 1).map((m) => m.focus[0]!);
    expect(introduced.slice().sort()).toEqual(unitSkills.slice().sort());
  });

  it("belongs to its unit and numbers 1..n", () => {
    expect(missions.every((m) => m.unitId === unitId)).toBe(true);
    expect(missions.map((m) => m.n)).toEqual(missions.map((_, i) => i + 1));
  });
});

describe("Chapter 1 campaign", () => {
  it("has 8 to 12 sorties, as the build plan asks", () => {
    expect(CH1_MISSIONS.length).toBeGreaterThanOrEqual(8);
    expect(CH1_MISSIONS.length).toBeLessThanOrEqual(12);
  });

  it("numbers them 1..n with unique ids", () => {
    expect(CH1_MISSIONS.map((m) => m.n)).toEqual(CH1_MISSIONS.map((_, i) => i + 1));
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });

  it("ends the unit with exactly one boss sortie", () => {
    const bosses = CH1_MISSIONS.filter((m) => m.kind === "boss");
    expect(bosses).toHaveLength(1);
    expect(bosses[0]!.n).toBe(CH1_MISSIONS.length);
  });

  it("only focuses skills that exist and have a generator", () => {
    for (const m of CH1_MISSIONS) {
      for (const s of m.focus) {
        expect(ch1Skills, `${m.id} focus`).toContain(s);
        expect(IMPLEMENTED_SKILLS, `${m.id} focus`).toContain(s);
      }
    }
  });

  it("introduces every Chapter 1 skill in its own sortie before mixing", () => {
    const introduced = CH1_MISSIONS.filter((m) => m.focus.length === 1).map((m) => m.focus[0]!);
    expect(introduced.slice().sort()).toEqual(ch1Skills.slice().sort());
  });

  it("gives every sortie a brief, prep problems, problems and fuel", () => {
    for (const m of CH1_MISSIONS) {
      expect(m.brief.length, m.id).toBeGreaterThan(20);
      expect(m.prep, m.id).toBeGreaterThanOrEqual(2);
      expect(m.problems, m.id).toBeGreaterThanOrEqual(6);
      expect(m.bogeys, m.id).toBeGreaterThanOrEqual(1);
      expect(m.fuelSeconds, m.id).toBeGreaterThan(m.problems * 10);
    }
  });

  it("gets longer as the unit goes on", () => {
    for (let i = 1; i < CH1_MISSIONS.length; i++) {
      expect(CH1_MISSIONS[i]!.problems, `sortie ${i + 1}`).toBeGreaterThanOrEqual(CH1_MISSIONS[i - 1]!.problems);
    }
  });

  it("looks up by id and by unit", () => {
    expect(mission("ch1-01").name).toBe("FIRST LIGHT");
    expect(missionsFor("ch1")).toHaveLength(CH1_MISSIONS.length);
    expect(missionsFor("ch9")).toEqual([]);
    expect(() => mission("nope")).toThrow();
  });

  it("makes the boss long enough to be a real review of every skill", () => {
    const boss = CH1_MISSIONS.at(-1)!;
    expect(boss.problems).toBeGreaterThanOrEqual(ch1Skills.length * 2);
    expect(boss.focus).toEqual([]);
  });
});

describe("intel cards", () => {
  it("gives every dossier exactly ten cards, numbered 1..10", () => {
    for (const [id, d] of Object.entries(DOSSIERS)) {
      expect(d.cards, id).toHaveLength(CARDS_PER_AIRFRAME);
      expect(d.cards.map((c) => c.n), id).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });

  it("cites a source on every card, because aircraft facts must be sourced", () => {
    for (const [id, d] of Object.entries(DOSSIERS)) {
      for (const c of d.cards) {
        expect(c.source.length, `${id} card ${c.n}`).toBeGreaterThan(8);
        expect(c.body.length, `${id} card ${c.n}`).toBeGreaterThan(30);
        expect(c.title.length, `${id} card ${c.n}`).toBeGreaterThan(2);
      }
    }
  });

  it("matches the T-38 figures in design/accuracy-check.md", () => {
    const t38 = dossier("t38")!;
    // USAF / Vance AFB fact sheet: 14.0 m long, 7.6 m span, 3.8 m high.
    expect(t38.lengthM).toBe(14.0);
    expect(t38.spanM).toBe(7.6);
    expect(t38.heightM).toBe(3.8);
    // accuracy-check.md ratio table: span / length = 0.545 within 2%.
    expect(t38.spanM / t38.lengthM).toBeCloseTo(0.545, 2);
    expect(t38.crew).toBe(2);
  });

  it("returns null for an airframe with no dossier yet", () => {
    expect(dossier("sr71")).toBeNull();
  });

  it("needs six first-try hits for a card", () => {
    expect(FIRST_TRY_HITS_FOR_CARD).toBe(6);
  });
});
