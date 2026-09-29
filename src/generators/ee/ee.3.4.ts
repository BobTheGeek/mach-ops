// ee.3.4 — Factoring linear expressions
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtImproper } from "../../engine/rational";
import {
  lin, fmtLinear, fmtFactored, parseFactored, isFullyFactored, expand, gcfOf, type Factored,
} from "../../engine/linear";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "ee.3.4";

type Variant =
  | "positive"    // GCF from two positive terms          (tier 1)
  | "negative-in" // GCF with a negative constant inside  (tier 2)
  | "negative-gcf"// factor out a negative GCF            (tier 3)
  | "fraction";   // factor out a fraction                (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["positive"],
  2: ["negative-in", "positive"],
  3: ["negative-gcf", "negative-in"],
  4: ["fraction", "negative-gcf"],
};

const SKINS = {
  loadout: { unit: "LB", plain: "Group the identical loads: factor {{expr}}." },
  fuel: { unit: "L", plain: "Rewrite the fuel expression per tank: factor {{expr}}." },
  squadron: { unit: "", plain: "Group the squadron into equal flights: factor {{expr}}." },
} as const;

type SkinKey = keyof typeof SKINS;

/**
 * Every problem needs a constant. Without one the greatest common factor
 * swallows the whole coefficient — 5/2x factors as 5/2(x), not 1/2(5x) — so the
 * intended answer would not be the fully factored one.
 */
function nonZero(rng: () => number, lo: number, hi: number): number {
  let n = int(rng, lo, hi);
  while (n === 0) n = int(rng, lo, hi);
  return n;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "fraction" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];
  const variable = "x";

  // --- 1. build from the factored form, then expand to present ----------
  // The registry says so explicitly, and it guarantees the answer is clean.
  let g = rat(1);
  let a = 1;
  let b = 0;

  switch (variant) {
    case "positive":
      g = rat(int(rng, 2, 12));
      a = int(rng, 1, 9);
      b = int(rng, 1, 15);
      break;
    case "negative-in":
      g = rat(int(rng, 2, 12));
      a = int(rng, 1, 9);
      b = -int(rng, 1, 15);
      break;
    case "negative-gcf":
      g = rat(-int(rng, 2, 12));
      a = int(rng, 1, 9);
      b = nonZero(rng, -15, 15);
      break;
    case "fraction":
      g = rat(1, pick(rng, [2, 3, 4] as const));
      a = int(rng, 1, 9);
      b = nonZero(rng, -15, 15);
      break;
  }
  // Coprime inside, or g would not be the greatest common factor.
  const divisor = (x: number, y: number): number => { x = Math.abs(x); y = Math.abs(y); while (y) { const t = y; y = x % y; x = t; } return x || 1; };
  if (b !== 0) {
    const common = divisor(a, b);
    a /= common;
    b /= common;
  }

  const answer: Factored = { g, inner: lin(rat(a), rat(b)) };
  const target = expand(answer);
  const shown = fmtLinear(target, variable);
  const answerText = fmtFactored(answer, variable);

  // --- 2. prompt --------------------------------------------------------
  const prompt = {
    text: bind(skin.plain, { expr: shown }),
    ...(skin.unit ? { units: skin.unit } : {}),
    math: [shown],
    figure: {
      kind: "area-model-reverse" as const,
      labels: [fmtImproper(g), fmtLinear(answer.inner, variable)],
      rows: [[shown], [answerText]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Look at both terms and find the largest thing that divides into both.", math: shown },
    { text: "That is the greatest common factor. Write it outside the brackets.", math: `${fmtImproper(gcfOf(target))}(   )` },
    { text: "Divide each term by it and write what is left inside.", math: answerText },
    { text: "Check by multiplying back out. You should land on what you started with.", math: shown },
  ];

  // --- 4. distractors from registry error tags --------------------------
  // not-greatest: a real common factor, but not the greatest one. Factoring by 1
  // is not a wrong factoring, it is no factoring, so only a divisor above 1 counts.
  const properDivisor = (n: number): number | null => {
    for (let candidate = Math.floor(Math.abs(n) / 2); candidate > 1; candidate--) {
      if (Math.abs(n) % candidate === 0) return candidate;
    }
    return null;
  };
  const partial = g.d === 1 ? properDivisor(g.n) : null;
  const notGreatest: Factored | null = partial
    ? { g: rat(Math.sign(g.n) * partial), inner: lin(rat((a * Math.abs(g.n)) / partial), rat((b * Math.abs(g.n)) / partial)) }
    : null;
  // zero-term: the constant is lost inside the brackets
  const zeroTerm: Factored = { g, inner: lin(rat(a), rat(0)) };
  // sign-error: the sign inside the brackets is wrong
  const signError: Factored = { g, inner: lin(rat(a), rat(-b)) };

  const candidates: Candidate[] = [
    { tag: "not-greatest", value: notGreatest ? fmtFactored(notGreatest, variable) : "", when: notGreatest !== null },
    { tag: "zero-term", value: fmtFactored(zeroTerm, variable), when: b !== 0 },
    { tag: "sign-error", value: fmtFactored(signError, variable), when: b !== 0 },
  ];
  const choice = buildChoice(rng, answerText, candidates, (x) => String(x));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${g.n}/${g.d}|${a}|${b}`),
    format: rng() < 0.5 ? "expression" : "multiple-choice",
    prompt,
    answer: answerText,
    answerText,
    // Expanding correctly is not enough: 2(3x + 6) is not 6x + 12 factored.
    accept: (input: Answer) => {
      const parsed = parseFactored(String(input), variable);
      return parsed !== null && isFullyFactored(parsed, target);
    },
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, g: `${g.n}/${g.d}`, a, b },
  };
}
