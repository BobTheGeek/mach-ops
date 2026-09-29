// ee.4.2 — Solving equations using multiplication or division
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, sub, neg, fmtFraction, fmtImproper, MINUS } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ee.4.2";

type Variant =
  | "integer"    // ax = b, integers, exact              (tier 1)
  | "negative"   // a negative coefficient or b          (tier 2)
  | "divided"    // x/a = b                              (tier 3)
  | "fraction"   // a fraction coefficient               (tier 3)
  | "rate";      // rate x time = distance               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["integer"],
  2: ["negative", "integer"],
  3: ["divided", "fraction"],
  4: ["rate", "fraction"],
};

const SKINS = {
  fuel: {
    unit: "L",
    plain: "Fuel computer: solve {{eq}} for x.",
    rate: "You burn {{a}} L every minute. After x minutes you have used {{b}} L. How many minutes?",
  },
  intercept: {
    unit: "NM",
    plain: "Intercept computer: solve {{eq}} for x.",
    rate: "You close {{a}} NM every minute. After x minutes you have closed {{b}} NM. How many minutes?",
  },
  descent: {
    unit: "FT",
    plain: "Descent computer: solve {{eq}} for x.",
    rate: "You descend {{a}} ft every minute. After x minutes you have lost {{b}} ft. How many minutes?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

function nonZeroOne(rng: () => number, lo: number, hi: number): number {
  let n = int(rng, lo, hi);
  while (n === 0 || n === 1) n = int(rng, lo, hi);
  return n;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "rate" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose x first, then the coefficient --------------------------
  const isRate = variant === "rate";
  const x: Rational = isRate ? rat(int(rng, 2, 20)) : rat(int(rng, -15, 15));

  let a: Rational;
  switch (variant) {
    case "integer": a = rat(int(rng, 2, 12)); break;
    case "negative": a = rat(-int(rng, 2, 12)); break;
    case "divided": a = rat(nonZeroOne(rng, -12, 12)); break;
    case "fraction": {
      // 4/2 reduces to 2, which is not a fraction coefficient at all.
      const d = pick(rng, [2, 3, 4, 5, 6] as const);
      let n = int(rng, 1, 5);
      while (n % d === 0) n += 1;
      a = rat(n, d);
      break;
    }
    case "rate": a = rat(int(rng, 2, 60) * 10); break;
  }

  const dividing = variant === "divided";
  // x/a = b means b = x/a; otherwise ax = b.
  const b = dividing ? div0(x, a) : mul(a, x);

  const eq = dividing
    ? `x / ${fmtImproper(a)} = ${fmtFraction(b)}`
    : `${fmtImproper(a)}x = ${fmtFraction(b)}`;

  // --- 2. prompt --------------------------------------------------------
  const prompt = {
    text: bind(isRate ? skin.rate : skin.plain, {
      eq, a: fmtFraction(a), b: fmtFraction(b),
    }),
    units: isRate ? "MIN" : skin.unit,
    math: [eq],
    figure: {
      kind: (dividing ? "tape-diagram" : "hanger-diagram") as "tape-diagram" | "hanger-diagram",
      rows: [[dividing ? `x / ${fmtImproper(a)}` : `${fmtImproper(a)}x`], [fmtFraction(b)]],
      labels: [fmtFraction(x)],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    {
      text: dividing ? "x is being divided, so undo it by multiplying." : "x is being multiplied, so undo it by dividing.",
      math: eq,
    },
    {
      text: a.d === 1
        ? `Do it to both sides: ${dividing ? "multiply" : "divide"} by ${fmtImproper(a)}.`
        : "A fraction coefficient is undone by multiplying by its reciprocal, which is the fraction upside down.",
      math: a.d === 1
        ? `x = ${fmtFraction(b)} ${dividing ? "×" : "÷"} ${fmtImproper(a)}`
        : `x = ${fmtFraction(b)} × ${fmtImproper(rat(a.d, a.n))}`,
    },
    {
      text: "Watch the sign. A negative divided by a negative is positive.",
      math: `${b.n < 0 ? MINUS : "+"} ÷ ${a.n < 0 ? MINUS : "+"}`,
    },
    { text: "Work it out, then check by putting the answer back in.", math: `x = ${fmtFraction(x)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // subtract-coefficient: 3x = 12 read as x = 12 - 3
    { tag: "subtract-coefficient", value: sub(b, a) },
    // sign-lost: right size, sign dropped
    { tag: "sign-lost", value: rat(Math.abs(x.n), x.d), when: x.n < 0 },
    { tag: "sign-lost", value: neg(x), when: x.n > 0 },
    // reciprocal-missed: multiplies by the fraction instead of dividing by it
    { tag: "reciprocal-missed", value: mul(b, a) },
    { tag: "reciprocal-missed", value: () => div0(a, b), when: b.n !== 0 },
  ];

  const fmt = (v: Answer): string => fmtFraction(v as Rational);
  const choice = buildChoice(rng, x, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${x.n}/${x.d}|${a.n}/${a.d}`),
    format: x.d === 1 ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: x,
    answerText: fmtFraction(x),
    accept: acceptRational(x),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, x: `${x.n}/${x.d}`, a: `${a.n}/${a.d}` },
  };
}
