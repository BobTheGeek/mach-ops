// ns.2.5 — Dividing rational numbers and complex fractions
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fromDecimal, mul, neg, fmtFraction, fmtDecimal, fmtImproper, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ns.2.5";

type Variant =
  | "decimal-integer"  // signed decimal / integer                     (tier 1)
  | "fraction-pair"    // fraction / fraction with signs               (tier 2)
  | "complex-fraction" // (1/2)/(3/4), mixed numbers                   (tier 3)
  | "rate-context";    // total / fraction of time                     (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["decimal-integer"],
  2: ["fraction-pair", "decimal-integer"],
  3: ["complex-fraction", "fraction-pair"],
  4: ["rate-context", "complex-fraction"],
};

const SKINS = {
  fuel: {
    unit: "L",
    plain: "Fuel computer: {{a}} ÷ {{b}} = ?",
    complex: "The fuel computer shows the complex fraction {{complex}}. Simplify it.",
    rate: "You have {{a}} L of margin and each leg takes {{b}} of a tank. How many legs does that cover?",
  },
  thrust: {
    unit: "%",
    plain: "Thrust trim: {{a}} ÷ {{b}} = ?",
    complex: "The engine map shows the complex fraction {{complex}}. Simplify it.",
    rate: "You have {{a}}% of thrust margin and each climb uses {{b}} of it. How many climbs does that cover?",
  },
  tanks: {
    unit: "",
    plain: "Tank split: {{a}} ÷ {{b}} = ?",
    complex: "The loadout sheet shows the complex fraction {{complex}}. Simplify it.",
    rate: "You split {{a}} across tanks holding {{b}} each. How many tanks does that fill?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

function properNumerator(rng: () => number, d: number, maxWhole: number): number {
  let n = int(rng, 1, d * maxWhole);
  if (n % d === 0) n += 1;
  return n;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "rate-context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the dividend and divisor --------------------------------
  let a: Rational;
  let b: Rational;
  let decimalForm = false;

  switch (variant) {
    case "decimal-integer": {
      // Choose the answer first (GENERATOR_SPEC section 2) so tier 1 divides
      // cleanly: a 1-place decimal quotient times an integer divisor.
      const sign = rng() < 0.5 ? 1 : -1;
      let quotientUnits = int(rng, 1, 149);
      if (quotientUnits % 10 === 0) quotientUnits += 1;
      const quotient = fromDecimal((sign * quotientUnits) / 10, 1);
      b = rat(int(rng, 2, 12) * (rng() < 0.5 ? 1 : -1));
      a = mul(quotient, b);
      decimalForm = true;
      break;
    }
    case "fraction-pair": {
      const d1 = int(rng, 2, 9);
      const d2 = int(rng, 2, 9);
      a = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d1, 1), d1);
      b = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d2, 1), d2);
      break;
    }
    case "complex-fraction": {
      const d1 = int(rng, 2, 9);
      const d2 = int(rng, 2, 9);
      a = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d1, 4), d1);
      b = rat(properNumerator(rng, d2, 4), d2);
      break;
    }
    case "rate-context": {
      const d = int(rng, 2, 8);
      b = rat(properNumerator(rng, d, 1), d);      // a fraction of a tank per leg
      a = rat(int(rng, 2, 9));                     // whole tanks of margin
      break;
    }
  }

  // Division is multiplication by the reciprocal; that is the whole method.
  const reciprocal = rat(b.d * Math.sign(b.n), Math.abs(b.n));
  const correct = mul(a, reciprocal);

  // --- 2. prompt --------------------------------------------------------
  const show = (r: Rational): string =>
    r.d === 1 ? fmtFraction(r) : decimalForm && isTerminating(r) ? fmtDecimal(r) : fmtFraction(r);

  const template = variant === "complex-fraction" ? skin.complex
    : variant === "rate-context" ? skin.rate : skin.plain;

  const prompt = {
    text: bind(template, {
      a: show(a),
      b: show(b),
      complex: `(${fmtImproper(a)}) / (${fmtImproper(b)})`,
    }),
    ...(skin.unit ? { units: skin.unit } : {}),
    figure: {
      kind: "tape-diagram" as const,
      labels: [show(a), show(b), show(correct)],
      rows: [[show(a), "÷", show(b)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Decide the sign first. Same signs give a positive answer, different signs a negative one.", math: `${a.n < 0 ? "−" : "+"} ÷ ${b.n < 0 ? "−" : "+"} → ${correct.n < 0 ? "negative" : "positive"}` },
    { text: "Write both numbers as improper fractions. A complex fraction is just a division problem.", math: `${fmtImproper(a)} ÷ ${fmtImproper(b)}` },
    { text: "Keep the first, change the division to multiplication, and flip the second.", math: `${fmtImproper(a)} × ${fmtImproper(reciprocal)}` },
    { text: "Multiply straight across and simplify.", math: `${show(correct)}${skin.unit ? ` ${skin.unit}` : ""}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const flipFirst = mul(rat(a.d * Math.sign(a.n), Math.abs(a.n)), b);
  const flipBoth = mul(rat(a.d * Math.sign(a.n), Math.abs(a.n)), reciprocal);
  const candidates: Candidate[] = [
    // flip-dividend: flips the first fraction instead of the second
    { tag: "flip-dividend", value: flipFirst, when: Math.abs(a.n) > 0 },
    // flip-both: flips both
    { tag: "flip-both", value: flipBoth, when: Math.abs(a.n) > 0 },
    // sign-rule: right size, wrong sign
    { tag: "sign-rule", value: neg(correct), when: correct.n !== 0 },
  ];

  const fmtAnswer = (x: Answer): string => show(x as Rational);
  const choice = buildChoice(rng, correct, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a.n}/${a.d}|${b.n}/${b.d}`),
    format: decimalForm ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}` },
  };
}
