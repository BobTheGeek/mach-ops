// ns.1.3 — Adding rational numbers
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fromDecimal, add, neg, abs, toNumber, fmtFraction, fmtDecimal, fmtImproper, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, numberLineSpan, type Candidate } from "../shared";

const SKILL = "ns.1.3";

type Variant =
  | "decimals"        // two decimals, 1 place, mixed signs               (tier 1)
  | "like-den"        // two fractions, like denominators, mixed signs    (tier 2)
  | "unlike-den"      // unlike denominators, may include mixed numbers  (tier 3)
  | "mixed-forms";    // three rationals mixing fractions and decimals   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["decimals"],
  2: ["like-den", "decimals"],
  3: ["unlike-den", "like-den"],
  4: ["mixed-forms", "unlike-den"],
};

const SKINS = {
  fuel: {
    unit: "L",
    plain: "Fuel computer: {{a}} + ({{b}}) = ?",
    three: "Fuel computer: {{list}} = ?",
    noun: "fuel",
  },
  altitude: {
    unit: "KFT",
    plain: "Altitude tape: {{a}} + ({{b}}) = ?",
    three: "Altitude tape: {{list}} = ?",
    noun: "altitude in thousands of feet",
  },
  flow: {
    unit: "L/min",
    plain: "Fuel-flow trim: {{a}} + ({{b}}) = ?",
    three: "Fuel-flow trim: {{list}} = ?",
    noun: "fuel flow",
  },
} as const;

type SkinKey = keyof typeof SKINS;

const LCM_LIMIT = 60;
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; }

/** A numerator that is never a whole multiple of d, so the value stays a fraction. */
function properNumerator(rng: () => number, d: number, maxWhole: number): number {
  let n = int(rng, 1, d * maxWhole);
  if (n % d === 0) n += 1;
  return n;
}

/** A decimal to `places` places that is not a whole number. */
function decimalUnits(rng: () => number, maxWhole: number, places: number): number {
  const scale = 10 ** places;
  let u = int(rng, 1, maxWhole * scale);
  if (u % scale === 0) u += 1;
  return u;
}

/** A pair of denominators in 2..12 whose lcm stays inside the registry's limit. */
function drawDenominators(rng: () => number): [number, number] {
  for (let i = 0; i < 40; i++) {
    const d1 = int(rng, 2, 12);
    const d2 = int(rng, 2, 12);
    if (d1 !== d2 && lcm(d1, d2) <= LCM_LIMIT) return [d1, d2];
  }
  return [2, 3];
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "mixed-forms" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose numbers so the answer is clean -------------------------
  let terms: Rational[];
  let decimalForm: boolean[];
  let denominators: number[] = [];

  switch (variant) {
    case "decimals": {
      // registry: two decimals, 1 place, mixed signs, |x| < 20
      const signA: 1 | -1 = rng() < 0.5 ? 1 : -1;
      terms = [
        fromDecimal((signA * decimalUnits(rng, 19, 1)) / 10, 1),
        fromDecimal((-signA * decimalUnits(rng, 19, 1)) / 10, 1),
      ];
      decimalForm = [true, true];
      break;
    }
    case "like-den": {
      const d = int(rng, 3, 12);
      const n1 = properNumerator(rng, d, 3);
      const n2 = properNumerator(rng, d, 3);
      const sign = rng() < 0.5 ? 1 : -1;
      terms = [rat(sign * n1, d), rat(-sign * n2, d)]; // registry: mixed signs
      decimalForm = [false, false];
      denominators = [d, d];
      break;
    }
    case "unlike-den": {
      const [d1, d2] = drawDenominators(rng);
      const n1 = properNumerator(rng, d1, 5); // mixed numbers up to 5
      const n2 = properNumerator(rng, d2, 5);
      terms = [rat((rng() < 0.5 ? 1 : -1) * n1, d1), rat((rng() < 0.5 ? 1 : -1) * n2, d2)];
      decimalForm = [false, false];
      denominators = [d1, d2];
      break;
    }
    case "mixed-forms": {
      const [d1, d2] = drawDenominators(rng);
      terms = [
        rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d1, 4), d1),
        fromDecimal(((rng() < 0.5 ? 1 : -1) * decimalUnits(rng, 19, 1)) / 10, 1),
        rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d2, 4), d2),
      ];
      decimalForm = [false, true, false];
      denominators = [d1, d2];
      break;
    }
  }

  const correct = terms.reduce((s, t) => add(s, t), rat(0));

  // --- 2. prompt --------------------------------------------------------
  // The answer takes the form of the givens: an all-decimal draw answers in decimals.
  const allDecimal = decimalForm.every(Boolean);
  const show = (r: Rational, asDecimal: boolean): string =>
    r.d === 1 ? fmtFraction(r) : asDecimal && isTerminating(r) ? fmtDecimal(r) : fmtFraction(r);
  const showAnswer = (r: Rational): string => show(r, allDecimal);

  const isThree = terms.length > 2;
  const prompt = {
    text: bind(isThree ? skin.three : skin.plain, {
      a: show(terms[0]!, decimalForm[0]!),
      b: show(terms[1]!, decimalForm[1]!),
      list: terms.map((t, i) => `(${show(t, decimalForm[i]!)})`).join(" + "),
    }),
    units: skin.unit,
    figure: {
      kind: (variant === "decimals" ? "number-line" : "debt-table") as "number-line" | "debt-table",
      // Plot the terms, never the total: the figure is the workspace, not the key.
      ...numberLineSpan(terms.map(toNumber).concat(toNumber(correct)), 2),
      points: terms.map(toNumber),
      rows: terms.map((t, i) => [show(t, decimalForm[i]!)]),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const common = denominators.length ? denominators.reduce((a, b) => lcm(a, b)) : 1;
  const worked: WorkedStep[] = [
    { text: "Write the addition with every sign shown.", math: terms.map((t, i) => `(${show(t, decimalForm[i]!)})`).join(" + ") },
    allDecimal
      ? { text: "Line up the decimal points. Give every number the same number of places.", math: terms.map((t) => fmtDecimal(t)).join("   ") }
      : { text: "Rewrite the fractions over a common denominator.", math: `common denominator ${common}` },
    { text: "Apply the sign rules: same signs add and keep the sign; different signs subtract and keep the sign of the bigger size.", math: terms.map((t) => fmtImproper(t)).join(" + ") },
    { text: "Add, then simplify.", math: `${showAnswer(correct)} ${skin.unit}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const a0 = terms[0]!;
  const a1 = terms[1]!;
  const candidates: Candidate[] = [
    // add-denominators: adds numerators and denominators
    { tag: "add-denominators", value: rat(a0.n + a1.n, a0.d + a1.d), when: a0.d + a1.d !== 0 && !allDecimal },
    // mixed-sign-split: reads -2 1/4 as -2 + 1/4, i.e. off by twice the fraction part
    { tag: "mixed-sign-split", value: add(correct, rat(2 * (Math.abs(a0.n) % a0.d), a0.d)), when: a0.d !== 1 },
    // sign-rule: integer sign-rule error carried into rationals
    { tag: "sign-rule", value: neg(correct), when: toNumber(correct) !== 0 },
    { tag: "sign-rule", value: add(abs(a0), abs(a1)) },
  ];

  const fmtAnswer = (x: Answer): string => showAnswer(x as Rational);
  const choice = buildChoice(rng, correct, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${terms.map((t) => `${t.n}/${t.d}`).join(",")}`),
    format: allDecimal ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: fmtAnswer(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, terms: terms.map((t) => `${t.n}/${t.d}`).join(" ") },
  };
}
