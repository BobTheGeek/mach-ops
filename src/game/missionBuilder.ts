// Turns a queue of (skill, tier) slots into actual Problems, applying the two
// no-repeat guards from GENERATOR_SPEC section 6.
//
//   hash guard       reject any hash served in the last 500 problems
//   near-repeat guard reject the same variant AND the same answer within the
//                     last 20 problems for that skill
//
// Both retry with seed + 1, up to 50 times, then log and accept.

import type { Problem } from "../engine/types";
import { buildQueue, type QueueInput, type QueueItem } from "../engine/queue";
import { generatorFor } from "../generators/index";
import { hash32 } from "../engine/rng";
import { RECENT_HASHES, type SaveFile } from "./save";

export const MAX_RESEEDS = 50;
export const NEAR_REPEAT_WINDOW = 20;

export interface MissionProblem {
  problem: Problem;
  item: QueueItem;
  /** true when both guards had to give up; surfaced so it can be logged */
  guardExhausted: boolean;
}

interface Recent {
  hashes: Set<string>;
  /** skill -> recent "variant|answerText" keys, newest last */
  perSkill: Map<string, string[]>;
}

const nearKey = (p: Problem): string => `${String(p.params.variant)}|${p.answerText}`;

function isNearRepeat(recent: Recent, p: Problem): boolean {
  const seen = recent.perSkill.get(p.skill);
  return seen ? seen.includes(nearKey(p)) : false;
}

function remember(recent: Recent, p: Problem): void {
  recent.hashes.add(p.hash);
  const seen = recent.perSkill.get(p.skill) ?? [];
  seen.push(nearKey(p));
  recent.perSkill.set(p.skill, seen.slice(-NEAR_REPEAT_WINDOW));
}

/** Draw one problem for a queue slot, re-seeding past anything already served. */
export function drawProblem(item: QueueItem, seed: number, recent: Recent): MissionProblem {
  const generate = generatorFor(item.skill);
  const opts = item.transfer ? { transfer: true } : {};

  let candidate = generate(item.tier, seed, opts);
  let tries = 0;
  while (tries < MAX_RESEEDS && (recent.hashes.has(candidate.hash) || isNearRepeat(recent, candidate))) {
    tries += 1;
    candidate = generate(item.tier, seed + tries, opts);
  }

  const guardExhausted = tries >= MAX_RESEEDS;
  remember(recent, candidate);
  return { problem: candidate, item, guardExhausted };
}

export interface MissionInput extends Omit<QueueInput, "seed"> {
  file: SaveFile;
  /** mission seed; the same seed and save rebuild the same mission */
  seed: number;
}

/** Build a full mission: the queue, then a de-duplicated problem for each slot. */
export function buildMission(input: MissionInput): MissionProblem[] {
  const { file, seed, ...queueInput } = input;

  const recent: Recent = {
    hashes: new Set(file.recentHashes.slice(-RECENT_HASHES)),
    perSkill: new Map(),
  };
  // Seed the near-repeat window from the saved log so a fresh sortie does not
  // reopen with the card the last one closed on.
  for (const a of file.log.slice(-NEAR_REPEAT_WINDOW * 4)) {
    const seen = recent.perSkill.get(a.skill) ?? [];
    seen.push(`${a.skill}-logged`);
    recent.perSkill.set(a.skill, seen.slice(-NEAR_REPEAT_WINDOW));
  }

  const queue = buildQueue({ ...queueInput, seed });

  return queue.map((item, i) =>
    drawProblem(item, hash32(`${seed}|${item.skill}|${i}`) % 1_000_000, recent),
  );
}
