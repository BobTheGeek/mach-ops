// ns.2.4 — Multiplying rational numbers
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fromDecimal, mul, neg, add, fmtFraction, fmtDecimal, fmtImproper, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ns.2.4";

type Variant =
  | "decimal-integer" // signed decimal x integer                      (tier 1)
  | "fraction-pair"   // signed fraction x fraction                    (tier 2)
  | "mixed-numbers"   // mixed numbers with signs                      (tier 3)
  | "three-factors";  // rate x fraction of time x count               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["decimal-integer"],
  2: ["fraction-pair", "decimal-integer"],
  3: ["mixed-numbers", "fraction-pair"],
  4: ["three-factors", "mixed-numbers"],
};

const SKINS = {
  fuel: {
    unit: "L",
    plain: "Fuel computer: {{a}} × {{b}} = ?",
    three: "Fuel computer: {{list}} = ?",
  },
  thrust: {
    unit: "%",
    plain: "Thrust trim: {{a}} × {{b}} = ?",
    three: "Thrust trim: {{list}} = ?",
  },
  load: {
    unit: "LB",
    plain: "Ordnance load: {{a}} × {{b}} = ?",
    three: "Ordnance load: {{list}} = ?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

/** A numerator that never lands on a whole multiple of d. */
function properNumerator(rng: () => number, d: number, maxWhole: number): number {
  let n = int(rng, 1, d * maxWhole);
  if (n % d === 0) n += 1;
  return n;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "three-factors" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the factors --------------------------------------------
  let factors: Rational[] = [];
  let decimalForm: boolean[] = [];

  switch (variant) {
    case "decimal-integer": {
      const sign = rng() < 0.5 ? 1 : -1;
      let units = int(rng, 1, 199);
      if (units % 10 === 0) units += 1;
      factors = [fromDecimal((sign * units) / 10, 1), rat(int(rng, 2, 12) * (rng() < 0.5 ? 1 : -1))];
      decimalForm = [true, false];
      break;
    }
    case "fraction-pair": {
      const d1 = int(rng, 2, 9);
      const d2 = int(rng, 2, 9);
      factors = [
        rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d1, 1), d1),
        rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d2, 1), d2),
      ];
      decimalForm = [false, false];
      break;
    }
    case "mixed-numbers": {
      const d1 = int(rng, 2, 9);
      const d2 = int(rng, 2, 9);
      const negFirst = rng() < 0.5;
      factors = [
        rat((negFirst ? -1 : 1) * properNumerator(rng, d1, 4), d1),
        rat((negFirst ? 1 : -1) * properNumerator(rng, d2, 4), d2),
      ];
      decimalForm = [false, false];
      break;
    }
    case "three-factors": {
      const d = int(rng, 2, 8);
      factors = [
        rat(-int(rng, 20, 200)),                               // a rate, always a loss
        rat(properNumerator(rng, d, 1), d),                    // a fraction of the time
        rat(int(rng, 2, 6)),                                   // a count of legs
      ];
      decimalForm = [false, false, false];
      break;
    }
  }

  const correct = factors.reduce((p, f) => mul(p, f), rat(1));

  // --- 2. prompt --------------------------------------------------------
  const anyDecimal = decimalForm.some(Boolean);
  const show = (r: Rational, asDecimal: boolean): string =>
    r.d === 1 ? fmtFraction(r) : asDecimal && isTerminating(r) ? fmtDecimal(r) : fmtFraction(r);
  const showAnswer = (r: Rational): string => show(r, anyDecimal);

  const prompt = {
    text: bind(factors.length > 2 ? skin.three : skin.plain, {
      a: show(factors[0]!, decimalForm[0]!),
      b: show(factors[1]!, decimalForm[1]!),
      list: factors.map((f, i) => `(${show(f, decimalForm[i]!)})`).join(" × "),
    }),
    units: skin.unit,
    figure: {
      kind: "area-model" as const,
      labels: factors.map((f, i) => show(f, decimalForm[i]!)),
      rows: [[showAnswer(correct)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const negatives = factors.filter((f) => f.n < 0).length;
  const worked: WorkedStep[] = [
    { text: "Decide the sign first. Count the negative factors: an even count is positive, an odd count is negative.", math: `${negatives} negative${negatives === 1 ? "" : "s"} → ${negatives % 2 === 0 ? "positive" : "negative"}` },
    { text: "Turn every mixed number and decimal into an improper fraction.", math: factors.map((f) => fmtImproper(f)).join(" × ") },
    { text: "Simplify across the multiplication before you multiply, so the numbers stay small.", math: `${factors.map((f) => Math.abs(f.n)).join(" × ")} over ${factors.map((f) => f.d).join(" × ")}` },
    { text: "Multiply straight across and write the answer with the sign from step 1.", math: `${showAnswer(correct)} ${skin.unit}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const a0 = factors[0]!;
  const a1 = factors[1]!;
  const wholeA = Math.trunc(a0.n / a0.d);
  const wholeB = Math.trunc(a1.n / a1.d);
  const fracA = rat(a0.n - wholeA * a0.d, a0.d);
  const fracB = rat(a1.n - wholeB * a1.d, a1.d);

  const candidates: Candidate[] = [
    // mixed-parts: multiplies whole parts and fraction parts separately
    { tag: "mixed-parts", value: add(rat(wholeA * wholeB), mul(fracA, fracB)), when: variant === "mixed-numbers" },
    // drop-sign: the sign fell off the product
    { tag: "drop-sign", value: rat(Math.abs(correct.n), correct.d), when: correct.n < 0 },
    { tag: "drop-sign", value: neg(correct), when: correct.n > 0 },
    // cross-cancel-wrong: cancels inside one fraction instead of across
    { tag: "cross-cancel-wrong", value: mul(rat(a0.n, a1.d), rat(a1.n, a0.d)), when: a0.d !== a1.d },
  ];

  const fmtAnswer = (x: Answer): string => showAnswer(x as Rational);
  const choice = buildChoice(rng, correct, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${factors.map((f) => `${f.n}/${f.d}`).join(",")}`),
    format: anyDecimal ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: showAnswer(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, factors: factors.map((f) => `${f.n}/${f.d}`).join(" ") },
  };
}
