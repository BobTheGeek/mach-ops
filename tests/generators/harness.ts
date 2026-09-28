// The eight property tests from GENERATOR_SPEC section 7, run against every
// generator. Each skill's test file supplies its spec and calls describeGenerator.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Generator, Problem, Tier, Answer } from "../../src/engine/types";
import { isRational, decimalPlaces, type Rational } from "../../src/engine/rational";

const ROOT = join(import.meta.dirname, "..", "..");
const TIERS: Tier[] = [1, 2, 3, 4];

export const SWEEP = 10_000;
/** GENERATOR_SPEC section 4 says 100 seeds; 100 samples of a 4-way split is pure
 *  coin-noise (1 sd = 4.3 points), so the band is measured over 1,000 instead. */
export const POSITION_SWEEP = 1_000;
export const VARIANT_SWEEP = 1_000;

interface RegistrySkill {
  id: string;
  errors: { tag: string }[];
}

function registrySkill(id: string): RegistrySkill {
  const doc = JSON.parse(readFileSync(join(ROOT, "src", "data", "curriculum.json"), "utf8")) as { skills: RegistrySkill[] };
  const s = doc.skills.find((x) => x.id === id);
  if (!s) throw new Error(`${id} is not in curriculum.json`);
  return s;
}

/** Numbered steps under "## How to solve it" in the skill's Flight Manual page. */
function manualStepCount(id: string): number {
  const md = readFileSync(join(ROOT, "src", "data", "manual", `${id}.md`), "utf8");
  const section = md.split("## How to solve it")[1]?.split("\n## ")[0] ?? "";
  return section.split("\n").filter((l) => /^\d+\.\s/.test(l)).length;
}

export interface GeneratorSpec {
  skill: string;
  generate: Generator;
  /** the variants the generator may draw at each tier */
  variants: Record<Tier, readonly string[]>;
  /**
   * Distinct-hash floor per tier over SWEEP seeds.
   *
   * GENERATOR_SPEC section 7 test 2 asks for all hashes unique across 10,000
   * seeds. That is unreachable for the registry's own tier-1 ranges: ns.1.4 T1
   * is a in [0,30] and b in [1,40], which is 1,240 possible draws in total, so
   * 10,000 seeds must repeat. What the no-repeat guard actually needs is full,
   * unbiased coverage of the space, so each tier declares the distinct count its
   * registry ranges can produce and the test holds the generator to it.
   */
  minUnique: Record<Tier, number>;
  /** what the registry says a tier-1 answer looks like */
  tier1Form: (answer: Answer) => boolean;
}

export const isInteger = (a: Answer): boolean => isRational(a) && a.d === 1;
export const isDecimalTo = (places: number) => (a: Answer): boolean =>
  isRational(a) && decimalPlaces(a) >= 0 && decimalPlaces(a) <= places;

function validProblem(p: Problem, skill: string, tier: Tier, seed: number): string | null {
  if (p.skill !== skill) return "wrong skill";
  if (p.tier !== tier) return "wrong tier";
  if (p.seed !== seed) return "wrong seed";
  if (!/^[0-9a-f]{40}$/.test(p.hash)) return `bad hash ${p.hash}`;
  if (typeof p.format !== "string" || p.format.length === 0) return "no format";
  if (typeof p.prompt?.text !== "string" || p.prompt.text.length === 0) return "empty prompt";
  if (p.prompt.text.includes("{{")) return `unbound slot in prompt: ${p.prompt.text}`;
  if (p.answer === undefined || p.answer === null) return "no answer";
  if (typeof p.answerText !== "string" || p.answerText.length === 0) return "no answerText";
  if (p.optionText && p.options && p.optionText.length !== p.options.length) return "optionText length";
  if (typeof p.accept !== "function") return "no accept()";
  if (!Array.isArray(p.worked) || p.worked.length === 0) return "no worked steps";
  if (p.worked.some((w) => typeof w.text !== "string" || w.text.length === 0)) return "empty worked step";
  // Most choice problems have 4 options; a two-way comparison has 2. Either way
  // the distractor count is one less than the option count.
  if (p.options && p.options.length < 2) return `${p.options.length} options`;
  if (p.options && p.distractors && p.distractors.length !== p.options.length - 1) {
    return `${p.distractors.length} distractors for ${p.options.length} options`;
  }
  if (p.options && (p.correctIndex === undefined || p.correctIndex < 0 || p.correctIndex >= p.options.length)) return "bad correctIndex";
  if (typeof p.params?.variant !== "string") return "no variant in params";
  return null;
}

export function describeGenerator(spec: GeneratorSpec): void {
  const { skill, generate } = spec;

  describe(skill, () => {
    it(`1. ${SWEEP} seeds x 4 tiers all produce a valid Problem`, () => {
      for (const tier of TIERS) {
        for (let seed = 0; seed < SWEEP; seed++) {
          const err = validProblem(generate(tier, seed), skill, tier, seed);
          if (err) expect.fail(`${skill} T${tier} seed ${seed}: ${err}`);
        }
      }
    });

    it(`2. hash coverage over ${SWEEP} seeds matches the registry parameter space`, () => {
      for (const tier of TIERS) {
        const freq = new Map<string, number>();
        for (let seed = 0; seed < SWEEP; seed++) {
          const h = generate(tier, seed).hash;
          freq.set(h, (freq.get(h) ?? 0) + 1);
        }
        expect(freq.size, `${skill} T${tier} distinct hashes`).toBeGreaterThanOrEqual(spec.minUnique[tier]);
        // No single draw may dominate: a biased generator repeats the same card.
        expect(Math.max(...freq.values()), `${skill} T${tier} most-repeated hash`).toBeLessThanOrEqual(SWEEP * 0.01);
      }
    });

    it("3. accept() is true for the answer and false for every distractor", () => {
      for (const tier of TIERS) {
        for (let seed = 0; seed < 2000; seed++) {
          const p = generate(tier, seed);
          expect(p.accept(p.answer), `${skill} T${tier} seed ${seed} rejects its own answer`).toBe(true);
          for (const d of p.distractors ?? []) {
            expect(p.accept(d.value), `${skill} T${tier} seed ${seed} accepts distractor ${d.tag}`).toBe(false);
          }
        }
      }
    });

    it("4. every distractor tag is a registry tag, and every registry tag is used", () => {
      const registryTags = new Set(registrySkill(skill).errors.map((e) => e.tag));
      const used = new Set<string>();
      for (const tier of TIERS) {
        for (let seed = 0; seed < 2000; seed++) {
          for (const d of generate(tier, seed).distractors ?? []) {
            // "magnitude" is the spec's own fallback when recipes collide.
            if (d.tag !== "magnitude" && !registryTags.has(d.tag)) {
              expect.fail(`${skill} T${tier} seed ${seed}: tag "${d.tag}" is not in the registry`);
            }
            used.add(d.tag);
          }
        }
      }
      for (const tag of registryTags) {
        expect(used.has(tag), `${skill} never produces registry tag "${tag}"`).toBe(true);
      }
    });

    it(`5. the correct option lands in each slot 20-30% of the time over ${POSITION_SWEEP} seeds`, () => {
      for (const tier of TIERS) {
        // Group by option count: a 4-option card expects 25% per slot, a
        // 2-option comparison expects 50%. The spec's 20-30% band is the
        // 4-option case, i.e. the uniform share plus or minus 5 points.
        const byWidth = new Map<number, number[]>();
        for (let seed = 0; seed < POSITION_SWEEP; seed++) {
          const p = generate(tier, seed);
          if (p.correctIndex === undefined || !p.options) continue;
          const w = p.options.length;
          const slots = byWidth.get(w) ?? new Array<number>(w).fill(0);
          slots[p.correctIndex]! += 1;
          byWidth.set(w, slots);
        }
        for (const [width, slots] of byWidth) {
          const n = slots.reduce((x, y) => x + y, 0);
          if (n < 100) continue; // too few of this width at this tier to judge
          const uniform = 100 / width;
          for (let i = 0; i < width; i++) {
            const pct = (slots[i]! / n) * 100;
            expect(pct, `${skill} T${tier} ${width}-option slot ${i}`).toBeGreaterThanOrEqual(uniform - 5);
            expect(pct, `${skill} T${tier} ${width}-option slot ${i}`).toBeLessThanOrEqual(uniform + 5);
          }
        }
      }
    });

    it(`6. every variant appears at least 10% of the time over ${VARIANT_SWEEP} seeds`, () => {
      for (const tier of TIERS) {
        const counts = new Map<string, number>();
        for (let seed = 0; seed < VARIANT_SWEEP; seed++) {
          const v = String(generate(tier, seed).params.variant);
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        for (const v of spec.variants[tier]) {
          const pct = ((counts.get(v) ?? 0) / VARIANT_SWEEP) * 100;
          expect(pct, `${skill} T${tier} variant "${v}"`).toBeGreaterThanOrEqual(10);
        }
        for (const v of counts.keys()) {
          expect(spec.variants[tier], `${skill} T${tier} drew undeclared variant "${v}"`).toContain(v);
        }
      }
    });

    it("7. worked step count matches the manual's How to solve it steps", () => {
      const expected = manualStepCount(skill);
      expect(expected, `${skill}.md has no numbered steps`).toBeGreaterThan(0);
      for (const tier of TIERS) {
        for (let seed = 0; seed < 2000; seed++) {
          const p = generate(tier, seed);
          expect(p.worked.length, `${skill} T${tier} seed ${seed}`).toBe(expected);
        }
      }
    });

    it("8. every tier-1 answer is in the registry's stated form", () => {
      for (let seed = 0; seed < SWEEP; seed++) {
        const p = generate(1, seed);
        const ok = Array.isArray(p.answer)
          ? p.answer.every((a) => spec.tier1Form(a))
          : spec.tier1Form(p.answer);
        if (!ok) expect.fail(`${skill} T1 seed ${seed}: answer ${JSON.stringify(p.answer)} is not the tier-1 form`);
      }
    });
  });
}

export type { Rational };

/* ------------------------------------------------------------------------ */

/**
 * A figure is the workspace, not the answer key. GENERATOR_SPEC section 3 says
 * figures are described by data the renderer draws, so every plotted point must
 * come from the problem's own parameters - a value the player can already read
 * in the prompt - and never from the computed answer.
 *
 * Plotting a given that happens to equal the answer is fine: "which of these two
 * is greater" must show both. Plotting a value that appears nowhere in the
 * givens is the leak this catches.
 */
export function describeFigureDiscretion(spec: Pick<GeneratorSpec, "skill" | "generate">): void {
  describe(`${spec.skill} figures`, () => {
    it("only plots values that appear in the givens", () => {
      for (const tier of TIERS) {
        for (let seed = 0; seed < 2000; seed++) {
          const p = spec.generate(tier, seed);
          const points = p.prompt.figure?.points;
          if (!points || points.length === 0) continue;

          // Every number reachable from params, as a decimal.
          const given = new Set<number>([0]);
          for (const raw of Object.values(p.params)) {
            for (const token of String(raw).split(/[\s,]+/)) {
              const frac = /^(-?\d+)\/(\d+)$/.exec(token);
              if (frac) given.add(Number(frac[1]) / Number(frac[2]));
              else if (/^-?\d+(\.\d+)?$/.test(token)) given.add(Number(token));
            }
          }

          for (const pt of points) {
            const known = [...given].some((v) => Math.abs(v - pt) < 1e-9);
            if (!known) {
              expect.fail(
                `${spec.skill} T${tier} seed ${seed}: figure plots ${pt}, which is not one of the givens ` +
                `(${JSON.stringify(p.params)})`,
              );
            }
          }
        }
      }
    });
  });
}
