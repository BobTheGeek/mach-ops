// Prints a 20-problem mission for a sample attempt log, showing which Math Kit
// figure (MK-*) and Answer Input (AI-*) each problem would use.
//
// Run: pnpm mission [count] [seed]

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildQueue, type QueueSkill } from "../src/engine/queue";
import { activeUnit, openUnits, isoToMs, DAY_MS, type Schedule } from "../src/engine/scheduler";
import { masteryScore, statusFor } from "../src/engine/mastery";
import { generatorFor, IMPLEMENTED_SKILLS } from "../src/generators/index";
import { mathKitFor, answerInputFor, MATH_KIT_NAME, ANSWER_INPUT_NAME } from "../src/engine/mathkit";
import type { Attempt, Tier } from "../src/engine/types";

const ROOT = resolve(import.meta.dirname, "..");
const read = <T,>(...p: string[]): T => JSON.parse(readFileSync(join(ROOT, ...p), "utf8")) as T;

const COUNT = Number(process.argv[2] ?? 20);
const SEED = Number(process.argv[3] ?? 1);

interface RegistrySkill { id: string; chapter?: string; honors: boolean; attachTo?: string[] }

const curriculum = read<{ skills: RegistrySkill[] }>("src", "data", "curriculum.json");
const schedule = read<Schedule>("src", "data", "schedule.json");

// Pretend the class is two weeks into Chapter 1.
const NOW = isoToMs("2026-08-24");

// Phase 1 ships Chapter 1 generators only, so the catalog is filtered to the
// skills that can actually be drawn. Later phases drop this filter.
const implemented = new Set(IMPLEMENTED_SKILLS);
const skills: QueueSkill[] = curriculum.skills.filter((s) => implemented.has(s.id)).map((s) => ({
  id: s.id,
  ...(s.chapter ? { chapter: s.chapter } : {}),
  honors: s.honors,
  ...(s.attachTo ? { attachTo: s.attachTo } : {}),
}));

/* ------------------------------------------------------- sample attempt log */

// A pilot who is solid on 1.1 and 1.2, shaky on 1.3, and has barely seen 1.4/1.5.
const SAMPLE: { skill: string; results: [boolean, number][]; context?: Attempt["context"] }[] = [
  { skill: "ns.1.1", results: [[true, 2600], [true, 2100], [true, 1900], [true, 2400], [true, 2000]] },
  { skill: "ns.1.2", results: [[true, 3200], [false, 9000], [true, 2800], [true, 2500], [true, 2200]] },
  { skill: "ns.1.3", results: [[false, 14000], [false, 3100], [true, 11000], [false, 12000], [true, 9500]] },
  { skill: "ns.1.4", results: [[true, 7000], [false, 13000], [true, 6500]] },
  { skill: "ns.1.5", results: [[false, 15000], [true, 12000]] },
];

const log: Attempt[] = [];
let day = -20;
for (const entry of SAMPLE) {
  let tier: Tier = 1;
  for (const [correct, responseMs] of entry.results) {
    log.push({
      skill: entry.skill,
      tier,
      correct,
      responseMs,
      hintsUsed: correct ? 0 : 1,
      context: entry.context ?? "sortie",
      ts: NOW + day * DAY_MS,
      ...(correct ? {} : { errorTag: "sample" }),
    });
    day += 1;
    if (correct && responseMs <= 5000 && tier < 4) tier = (tier + 1) as Tier;
  }
  day = -20;
}
log.sort((a, b) => a.ts - b.ts);

/* --------------------------------------------------------------- the mission */

const open = openUnits({ schedule, now: NOW, bossesPassed: new Set() });
const active = activeUnit({ schedule, now: NOW, bossesPassed: new Set() });
if (!active) throw new Error("no chapter is open on this date");

const queue = buildQueue({
  skills,
  log,
  now: NOW,
  activeUnitId: active.id,
  openUnitIds: open.map((u) => u.id),
  count: COUNT,
  seed: SEED,
});

/* ----------------------------------------------------------------- printing */

const pad = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));

console.log(`\nMISSION · ${active.name} · ${open.length} chapter(s) open · seed ${SEED}`);
console.log(`Phase 1: ${IMPLEMENTED_SKILLS.length} of ${curriculum.skills.length} skills have generators.\n`);

console.log("SYSTEMS STATUS");
for (const s of skills.filter((x) => x.chapter === "ch1")) {
  const score = masteryScore(log, s.id);
  console.log(`  ${pad(s.id, 9)} ${pad(statusFor(log, s.id), 12)} score ${score.toFixed(2)}`);
}

console.log(`\n${COUNT}-PROBLEM QUEUE`);
console.log(`  ${pad("#", 4)}${pad("SKILL", 9)}${pad("T", 3)}${pad("SLICE", 9)}${pad("FIGURE", 22)}${pad("INPUT", 30)}PROMPT`);

const usedSlices = new Map<string, number>();
queue.forEach((item, i) => {
  const problem = generatorFor(item.skill)(item.tier, SEED * 1000 + i, item.transfer ? { transfer: true } : {});
  const rep = problem.prompt.figure?.kind;
  const mk = rep ? mathKitFor(rep) : null;
  const figure = mk ? `${mk} ${MATH_KIT_NAME[mk]}` : rep ? `? ${rep}` : "none";
  const ai = answerInputFor(problem.format);

  usedSlices.set(item.slice, (usedSlices.get(item.slice) ?? 0) + 1);

  console.log(
    `  ${pad(String(i + 1), 4)}${pad(item.skill, 9)}${pad(String(item.tier), 3)}` +
    `${pad(item.transfer ? `${item.slice}*` : item.slice, 9)}${pad(figure, 22)}` +
    `${pad(`${ai} ${ANSWER_INPUT_NAME[ai]}`, 30)}${pad(problem.prompt.text, 60)}`,
  );
  console.log(`  ${" ".repeat(47)}answer: ${problem.answerText}${problem.prompt.units ? " " + problem.prompt.units : ""}`);
});

console.log("\nSLICES");
for (const [slice, n] of usedSlices) console.log(`  ${pad(slice, 9)} ${n} (${Math.round((n / COUNT) * 100)}%)`);
console.log("  * = transfer problem (tier 4)\n");
