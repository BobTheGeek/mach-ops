// rp.5.2 — Rates and unit rates, including complex fractions
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, fromDecimal, fmtFraction, fmtImproper, isTerminating, fmtDecimal } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.5.2";

type Variant =
  | "whole"     // 240 L in 8 min -> per minute            (tier 1)
  | "decimal"   // a decimal result                        (tier 2)
  | "one-frac"  // a fraction in one place                 (tier 3)
  | "both-frac";// fractions in both                       (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["whole"],
  2: ["decimal", "whole"],
  3: ["one-frac", "decimal"],
  4: ["both-frac", "one-frac"],
};

const SKINS = {
  burn: { top: "L", bottom: "min", unit: "L/MIN", q: "You burn {{a}} L in {{b}} minutes. What is the burn per minute?" },
  range: { top: "km", bottom: "L", unit: "KM/L", q: "You cover {{a}} km on {{b}} L. How far per litre?" },
  climb: { top: "ft", bottom: "min", unit: "FT/MIN", q: "You climb {{a}} ft in {{b}} minutes. What is the climb per minute?" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "both-frac" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the rate first, then the two quantities ----------------
  let b: Rational;
  let rate: Rational;

  switch (variant) {
    case "whole":
      b = rat(int(rng, 2, 12));
      rate = rat(int(rng, 2, 60));
      break;
    case "decimal":
      b = rat(int(rng, 2, 12));
      rate = fromDecimal(int(rng, 15, 900) / 100, 2);
      break;
    case "one-frac":
      b = rat(1, pick(rng, [2, 3, 4, 8] as const));
      rate = rat(int(rng, 2, 24));
      break;
    case "both-frac":
      b = rat(int(rng, 1, 5), pick(rng, [2, 3, 4, 6, 8] as const));
      rate = rat(int(rng, 1, 9), pick(rng, [2, 3, 4] as const));
      break;
  }
  const a = mul(rate, b);

  const anyFraction = variant === "one-frac" || variant === "both-frac";
  const show = (r: Rational): string =>
    anyFraction ? fmtFraction(r) : isTerminating(r) ? fmtDecimal(r) : fmtFraction(r);

  // --- 2. prompt --------------------------------------------------------
  const prompt = {
    text: bind(skin.q, { a: show(a), b: show(b) }),
    units: skin.unit,
    figure: {
      kind: "double-number-line" as const,
      rows: [[show(rat(0)), show(a)], [show(rat(0)), show(b)]],
      labels: [skin.top, skin.bottom],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "A unit rate is 'per 1'. Decide which quantity you want one of; that one goes on the bottom.", math: `${show(a)} ${skin.top} per ${show(b)} ${skin.bottom}` },
    { text: "Divide the first quantity by the second.", math: `${show(a)} ÷ ${show(b)}` },
    {
      text: anyFraction
        ? "Dividing by a fraction is multiplying by its reciprocal: keep, change, flip."
        : "Work the division out.",
      math: anyFraction ? `${fmtImproper(a)} × ${fmtImproper(rat(b.d, b.n))}` : `${show(a)} ÷ ${show(b)}`,
    },
    { text: "Write the answer with its units. The units tell you whether you divided the right way round.", math: `${show(rate)} ${skin.unit}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // divide-backwards: min per litre instead of litres per min
    { tag: "divide-backwards", value: () => div0(b, a), when: a.n !== 0 },
    // fraction-divide: multiplied instead of dividing
    { tag: "fraction-divide", value: mul(a, b) },
    // unit-mismatch: the unconverted value, i.e. the total not the rate
    { tag: "unit-mismatch", value: a },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, rate, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a.n}/${a.d}|${b.n}/${b.d}`),
    format: anyFraction ? (rng() < 0.5 ? "fraction" : "multiple-choice") : rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: rate,
    answerText: show(rate),
    accept: acceptRational(rate),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}` },
  };
}
