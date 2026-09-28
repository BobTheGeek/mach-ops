// Mission queue assembly.
// Rules: docs/engine-rules.md "Queue assembly per mission" and "Anti-frustration".
//
//   50% overdue / weak   (past nextDue, lowest score first; capped at 40% of a sortie)
//   30% current unit     (active chapter + its attached honors skills)
//   20% warm review      (random fluent / mastered)
//
// Consecutive problems are never the same skill. Every 8-10 problems on a skill,
// that serve becomes a transfer problem (tier 4, opts.transfer = true).
//
// Pure: takes a skill catalog, an attempt log and a seed; reads no clock and no disk.

import type { Attempt, Tier } from "./types";
import { masteryScore, stateFor } from "./mastery";
import { reviewFor, isOverdue } from "./scheduler";
import { tierFor } from "./tiers";
import { mulberry32, hash32, shuffle, int } from "./rng";

export const SLICES = { weak: 0.5, current: 0.3, warm: 0.2 } as const;

/** The weak slice may never exceed this share of a single sortie. */
export const WEAK_CAP = 0.4;

/** A skill gets a transfer problem every N serves; N is drawn per skill. */
export const TRANSFER_EVERY_MIN = 8;
export const TRANSFER_EVERY_MAX = 10;

export const TRANSFER_TIER: Tier = 4;

export type Slice = "weak" | "current" | "warm";

export interface QueueSkill {
  id: string;
  /** core skills: the chapter they belong to, e.g. "ch1" */
  chapter?: string;
  honors: boolean;
  /** honors skills: the units whose mission lists include them */
  attachTo?: string[];
}

export interface QueueInput {
  skills: readonly QueueSkill[];
  log: readonly Attempt[];
  now: number;
  /** the chapter the class is on; drives the 30% slice */
  activeUnitId: string;
  /** every unit currently open; a skill from a closed unit is never served */
  openUnitIds: readonly string[];
  count: number;
  seed: number;
  /** set to 1 to see the uncapped 50/30/20 split */
  weakCap?: number;
}

export interface QueueItem {
  skill: string;
  tier: Tier;
  slice: Slice;
  transfer: boolean;
}

/** Units a skill belongs to: its chapter for core, its attachTo list for honors. */
function unitsOf(s: QueueSkill): string[] {
  if (s.honors) return s.attachTo ?? [];
  return s.chapter ? [s.chapter] : [];
}

function isAvailable(s: QueueSkill, open: ReadonlySet<string>): boolean {
  const units = unitsOf(s);
  return units.length === 0 ? false : units.some((u) => open.has(u));
}

/** Split `count` into slice sizes, applying the weak cap and spilling the rest 3:2. */
export function sliceSizes(count: number, weakCap = WEAK_CAP): Record<Slice, number> {
  const weak = Math.min(Math.round(count * SLICES.weak), Math.floor(count * weakCap));
  const rest = count - weak;
  // The remainder keeps the 30:20 ratio between current unit and warm review.
  const current = Math.round(rest * (SLICES.current / (SLICES.current + SLICES.warm)));
  return { weak, current, warm: rest - current };
}

/**
 * Lay items out so no two neighbours share a skill.
 * Greedy: always take the most-common remaining skill that is not the previous one.
 */
export function deinterleave<T extends { skill: string }>(items: readonly T[]): T[] {
  const bySkill = new Map<string, T[]>();
  for (const it of items) {
    const list = bySkill.get(it.skill);
    if (list) list.push(it);
    else bySkill.set(it.skill, [it]);
  }

  const out: T[] = [];
  let prev: string | null = null;

  while (out.length < items.length) {
    let best: string | null = null;
    let bestLen = 0;
    for (const [skill, list] of bySkill) {
      if (list.length === 0 || skill === prev) continue;
      if (list.length > bestLen) { best = skill; bestLen = list.length; }
    }
    if (best === null) {
      // Only the previous skill is left; appending it would repeat, so swap it
      // backwards into the nearest legal gap instead of breaking the rule.
      const remaining = [...bySkill.values()].flat();
      for (const it of remaining) {
        let placed = false;
        for (let i = out.length - 1; i >= 0; i--) {
          const before = i > 0 ? out[i - 1]!.skill : null;
          const at = out[i]!.skill;
          if (before !== it.skill && at !== it.skill) { out.splice(i, 0, it); placed = true; break; }
        }
        if (!placed) out.push(it);
      }
      break;
    }
    const list = bySkill.get(best)!;
    out.push(list.pop()!);
    prev = best;
  }
  return out;
}

export function buildQueue(input: QueueInput): QueueItem[] {
  const { skills, log, now, activeUnitId, openUnitIds, count, seed, weakCap = WEAK_CAP } = input;
  if (count <= 0) return [];

  const rng = mulberry32(hash32(`queue|${activeUnitId}|${seed}`));
  const open = new Set(openUnitIds);
  const available = skills.filter((s) => isAvailable(s, open));
  if (available.length === 0) return [];

  const score = new Map<string, number>();
  for (const s of available) score.set(s.id, masteryScore(log, s.id));

  // --- pools ------------------------------------------------------------
  const weakPool = available
    .filter((s) => isOverdue(reviewFor(log, s.id), now))
    .sort((a, b) => score.get(a.id)! - score.get(b.id)!)
    .map((s) => s.id);

  const currentPool = shuffle(rng, available.filter((s) => unitsOf(s).includes(activeUnitId)).map((s) => s.id));

  const warmPool = shuffle(
    rng,
    available.filter((s) => {
      const st = stateFor(log, s.id);
      return st === "fluent" || st === "mastered";
    }).map((s) => s.id),
  );

  // A pool that cannot fill its slice falls back to the current unit, then to
  // anything available — a mission is never short.
  const fallback = currentPool.length ? currentPool : available.map((s) => s.id);

  const sizes = sliceSizes(count, weakCap);
  const picks: { skill: string; slice: Slice }[] = [];

  const take = (pool: readonly string[], n: number, slice: Slice): void => {
    const src = pool.length ? pool : fallback;
    for (let i = 0; i < n; i++) picks.push({ skill: src[i % src.length]!, slice });
  };

  take(weakPool, sizes.weak, "weak");
  take(currentPool, sizes.current, "current");
  take(warmPool, sizes.warm, "warm");

  // --- layout, then tier and transfer marking ---------------------------
  // The cadence has to be counted in the order the problems are actually served,
  // so the no-consecutive-repeat layout happens first and marking follows it.
  const ordered = deinterleave(picks);

  // Serve counts continue from the saved log, so transfers land on the real cadence.
  const served = new Map<string, number>();
  for (const a of log) served.set(a.skill, (served.get(a.skill) ?? 0) + 1);

  const cadence = new Map<string, number>();
  for (const s of available) cadence.set(s.id, int(rng, TRANSFER_EVERY_MIN, TRANSFER_EVERY_MAX));

  return ordered.map(({ skill, slice }) => {
    const n = (served.get(skill) ?? 0) + 1;
    served.set(skill, n);
    const every = cadence.get(skill) ?? TRANSFER_EVERY_MAX;
    const transfer = n % every === 0;
    return {
      skill,
      tier: transfer ? TRANSFER_TIER : tierFor(log, skill).tier,
      slice,
      transfer,
    };
  });
}
