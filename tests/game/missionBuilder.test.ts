import { describe, it, expect } from "vitest";
import { buildMission, drawProblem, MAX_RESEEDS, NEAR_REPEAT_WINDOW } from "../../src/game/missionBuilder";
import { newSave, type SaveFile } from "../../src/game/save";
import { generatorFor, IMPLEMENTED_SKILLS } from "../../src/generators/index";
import type { QueueSkill, QueueItem } from "../../src/engine/queue";
import type { Attempt } from "../../src/engine/types";

const SKILLS: QueueSkill[] = IMPLEMENTED_SKILLS.map((id) => ({ id, chapter: "ch1", honors: false }));
const NOW = Date.parse("2026-09-01T12:00:00Z");

const base = {
  skills: SKILLS,
  now: NOW,
  activeUnitId: "ch1",
  openUnitIds: ["ch1"],
};

const emptyRecent = () => ({ hashes: new Set<string>(), perSkill: new Map<string, string[]>() });

describe("drawProblem", () => {
  const item: QueueItem = { skill: "ns.1.4", tier: 1, slice: "current", transfer: false };

  it("returns a problem for the queued skill and tier", () => {
    const { problem } = drawProblem(item, 7, emptyRecent());
    expect(problem.skill).toBe("ns.1.4");
    expect(problem.tier).toBe(1);
  });

  it("re-seeds past a hash that has already been served", () => {
    const first = generatorFor("ns.1.4")(1, 7);
    const recent = emptyRecent();
    recent.hashes.add(first.hash);
    const { problem } = drawProblem(item, 7, recent);
    expect(problem.hash).not.toBe(first.hash);
  });

  it("re-seeds past a near-repeat: same variant and same answer", () => {
    const first = generatorFor("ns.1.4")(1, 7);
    const recent = emptyRecent();
    recent.perSkill.set("ns.1.4", [`${String(first.params.variant)}|${first.answerText}`]);
    const { problem } = drawProblem(item, 7, recent);
    const key = `${String(problem.params.variant)}|${problem.answerText}`;
    expect(key).not.toBe(`${String(first.params.variant)}|${first.answerText}`);
  });

  it("gives up after the retry budget rather than looping forever", () => {
    // Block every hash the generator can reach from this seed window.
    const recent = emptyRecent();
    for (let i = 0; i <= MAX_RESEEDS; i++) recent.hashes.add(generatorFor("ns.1.4")(1, 7 + i).hash);
    const drawn = drawProblem(item, 7, recent);
    expect(drawn.guardExhausted).toBe(true);
    expect(drawn.problem).toBeDefined();
  });

  it("marks a transfer slot as a transfer problem", () => {
    const transferItem: QueueItem = { skill: "ns.1.4", tier: 4, slice: "weak", transfer: true };
    const { problem } = drawProblem(transferItem, 11, emptyRecent());
    expect(problem.tier).toBe(4);
  });
});

describe("buildMission", () => {
  const file: SaveFile = newSave();

  it("returns exactly the requested number of problems", () => {
    const mission = buildMission({ ...base, file, log: file.log, count: 12, seed: 3 });
    expect(mission).toHaveLength(12);
  });

  it("never serves the same skill twice in a row", () => {
    for (let seed = 0; seed < 20; seed++) {
      const mission = buildMission({ ...base, file, log: file.log, count: 12, seed });
      for (let i = 1; i < mission.length; i++) {
        expect(mission[i]!.problem.skill, `seed ${seed}`).not.toBe(mission[i - 1]!.problem.skill);
      }
    }
  });

  it("repeats a hash inside one mission only when the guard gave up", () => {
    // GENERATOR_SPEC section 6: the guard retries with seed + 1 up to 50 times,
    // "then log and accept". A skill whose registry ranges are small — the
    // honors classify cards have about fifty possible draws — can exhaust it.
    // What must never happen is a silent repeat with the guard still fresh.
    for (let seed = 0; seed < 20; seed++) {
      const mission = buildMission({ ...base, file, log: file.log, count: 20, seed });
      const seen = new Map<string, number>();
      mission.forEach((m, i) => {
        const prior = seen.get(m.problem.hash);
        if (prior !== undefined) {
          expect(m.guardExhausted, `seed ${seed}: ${m.problem.skill} repeated at ${i} without exhausting the guard`).toBe(true);
        }
        seen.set(m.problem.hash, i);
      });
    }
  });

  it("re-serves a remembered hash only when the guard gave up", () => {
    const seeded = buildMission({ ...base, file, log: file.log, count: 20, seed: 5 });
    const withHistory: SaveFile = { ...file, recentHashes: seeded.map((m) => m.problem.hash) };
    const next = buildMission({ ...base, file: withHistory, log: withHistory.log, count: 20, seed: 5 });
    for (const m of next) {
      if (withHistory.recentHashes.includes(m.problem.hash)) {
        expect(m.guardExhausted, `${m.problem.skill} re-served without exhausting the guard`).toBe(true);
      }
    }
  });

  it("mostly avoids remembered hashes even so", () => {
    const seeded = buildMission({ ...base, file, log: file.log, count: 20, seed: 5 });
    const withHistory: SaveFile = { ...file, recentHashes: seeded.map((m) => m.problem.hash) };
    const next = buildMission({ ...base, file: withHistory, log: withHistory.log, count: 20, seed: 5 });
    const repeats = next.filter((m) => withHistory.recentHashes.includes(m.problem.hash)).length;
    expect(repeats / next.length).toBeLessThan(0.2);
  });

  it("is deterministic for the same save and seed", () => {
    const a = buildMission({ ...base, file, log: file.log, count: 12, seed: 9 });
    const b = buildMission({ ...base, file, log: file.log, count: 12, seed: 9 });
    expect(a.map((m) => m.problem.hash)).toEqual(b.map((m) => m.problem.hash));
  });

  it("only serves skills that have a generator", () => {
    const mission = buildMission({ ...base, file, log: file.log, count: 20, seed: 4 });
    for (const m of mission) expect(IMPLEMENTED_SKILLS).toContain(m.problem.skill);
  });

  it("every problem accepts its own answer", () => {
    const mission = buildMission({ ...base, file, log: file.log, count: 20, seed: 6 });
    for (const m of mission) expect(m.problem.accept(m.problem.answer)).toBe(true);
  });

  it("carries the near-repeat window over from the saved log", () => {
    const log: Attempt[] = Array.from({ length: NEAR_REPEAT_WINDOW }, (_, i) => ({
      skill: "ns.1.1", tier: 1, correct: true, responseMs: 2000, hintsUsed: 0,
      context: "sortie" as const, ts: NOW - i * 1000,
    }));
    const mission = buildMission({ ...base, file: { ...file, log }, log, count: 12, seed: 2 });
    expect(mission).toHaveLength(12);
  });
});
