// h8.ns.a2 — Estimate square roots; order irrationals (HONORS)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fromDecimal, fmtDecimal, fmtFraction } from "../../engine/rational";
import { qSqrt, qPi, qRational, qScaledSqrt, sortQuantities, isPerfectSquare, type Quantity } from "../../engine/quantity";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.ns.a2";

type Variant =
  | "bracket"      // which two whole numbers is √n between      (tier 1)
  | "tenth"        // estimate to the nearest tenth              (tier 2)
  | "order-set"    // order 4-5 values including pi and fractions (tier 3)
  | "expression";  // estimate 2√10 + 1                          (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["bracket"],
  2: ["tenth", "bracket"],
  3: ["order-set", "tenth"],
  4: ["expression", "order-set"],
};

const SKINS = {
  radar: {
    bracket: "The radar paints a square search box of {{n}} square miles. Its side is √{{n}} miles. Between which two whole miles does that fall?",
    tenth: "The search box is {{n}} square miles. Estimate its side, √{{n}} miles, to the nearest tenth.",
    order: "Sort these radar ranges from shortest to longest: {{list}}.",
    expression: "The pattern gives a range of {{expr}} miles. Estimate it to the nearest tenth.",
  },
  runway: {
    bracket: "A square apron covers {{n}} square units. Its side is √{{n}}. Between which two whole numbers does that fall?",
    tenth: "A square apron covers {{n}} square units. Estimate its side, √{{n}}, to the nearest tenth.",
    order: "Sort these apron measurements from smallest to largest: {{list}}.",
    expression: "The diagonal works out to {{expr}}. Estimate it to the nearest tenth.",
  },
  target: {
    bracket: "The target box is {{n}} square NM. Its side is √{{n}} NM. Between which two whole NM does that fall?",
    tenth: "The target box is {{n}} square NM. Estimate its side, √{{n}} NM, to the nearest tenth.",
    order: "Sort these target distances from nearest to farthest: {{list}}.",
    expression: "The offset is {{expr}} NM. Estimate it to the nearest tenth.",
  },
} as const;

type SkinKey = keyof typeof SKINS;

/** A non-square radicand in the registry's range. */
function drawRadicand(rng: () => number): number {
  let n = int(rng, 2, 150);
  while (isPerfectSquare(n)) n = int(rng, 2, 150);
  return n;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "expression" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  /* -------- order a mixed set -------------------------------------- */
  if (variant === "order-set") {
    const size = int(rng, 4, 5);
    const pool: Quantity[] = [
      qSqrt(drawRadicand(rng)),
      qSqrt(drawRadicand(rng)),
      qPi(),
      qRational(rat(int(rng, 5, 25), int(rng, 2, 4))),
      qRational(rat(int(rng, 2, 12))),
    ];
    const set = shuffle(rng, pool).slice(0, size);
    const sorted = sortQuantities(set);

    // The reorder input compares numbers, so the answer carries exact-enough
    // rationals; orderLabels keep "√40" on screen instead of 6.32.
    const answer = sorted.map((q) => fromDecimal(Math.round(q.value * 10000) / 10000, 4));
    const labels = sorted.map((q) => q.label);

    const worked: WorkedStep[] = [
      { text: "Estimate each value. A root sits between the two perfect squares it falls between.", math: set.map((q) => q.label).join("   ") },
      { text: "Pi is a little over 3, and a fraction is whatever the division gives.", math: "π ≈ 3.14" },
      { text: "Write each estimate as a decimal so they can be compared on one line.", math: sorted.map((q) => q.value.toFixed(2)).join(" < ") },
      { text: "Read them smallest to largest.", math: labels.join(" < ") },
    ];

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${set.map((q) => q.label).join(",")}`),
      format: "order",
      prompt: {
        text: bind(skin.order, { list: set.map((q) => q.label).join(", ") }),
        figure: { kind: "number-line" as const, min: 0, max: Math.ceil(Math.max(...set.map((q) => q.value))) + 1, points: set.map((q) => q.value), labels: set.map((q) => q.label) },
      },
      answer,
      answerText: labels.join(" < "),
      orderLabels: labels,
      accept: (input: Answer) => {
        if (!Array.isArray(input) || input.length !== answer.length) return false;
        return input.every((x, i) => {
          const r = x as { n: number; d: number };
          const want = answer[i]!;
          return Math.abs(r.n / r.d - want.n / want.d) < 1e-6;
        });
      },
      worked,
      errorTagsByAnswer: {},
      params: { variant, skin: skinKey, set: set.map((q) => q.label).join(" ") },
    };
  }

  /* -------- bracket, estimate, or an expression --------------------- */
  const n = drawRadicand(rng);
  const low = Math.floor(Math.sqrt(n));
  const high = low + 1;

  let a = 1;
  let b = 0;
  if (variant === "expression") {
    a = int(rng, 2, 4);
    b = int(rng, -6, 6);
  }
  const q = variant === "expression" ? qScaledSqrt(a, n, b) : qSqrt(n);
  const toTenth = fromDecimal(Math.round(q.value * 10) / 10, 1);

  const correct = variant === "bracket" ? rat(low) : toTenth;

  const worked: WorkedStep[] = variant === "bracket"
    ? [
        { text: "Find the perfect squares either side of the number under the root.", math: `${low}² = ${low * low} and ${high}² = ${high * high}` },
        { text: `Because ${low * low} < ${n} < ${high * high}, the root sits between those two whole numbers.`, math: `${low} < √${n} < ${high}` },
        { text: "Say which square it is closer to, so the estimate has a direction.", math: `√${n} ≈ ${q.value.toFixed(2)}, closer to ${Math.abs(q.value - low) < Math.abs(q.value - high) ? low : high}` },
        { text: "Name the lower whole number.", math: `${low}` },
      ]
    : [
        { text: "Bracket the root between the two perfect squares either side of it.", math: `${low} < √${n} < ${high}` },
        { text: "Square a few tenths between them until you close in on the number.", math: `${(low + 0.5).toFixed(1)}² = ${((low + 0.5) ** 2).toFixed(2)}` },
        {
          text: variant === "expression" ? "Put the estimate back into the expression." : "Round to the nearest tenth.",
          math: variant === "expression" ? `${a} × ${Math.sqrt(n).toFixed(2)}${b >= 0 ? " + " : " − "}${Math.abs(b)}` : `√${n} ≈ ${Math.sqrt(n).toFixed(2)}`,
        },
        { text: "Round to the nearest tenth.", math: fmtDecimal(toTenth) },
      ];

  // halve-not-root: sqrt(16) = 8, i.e. halving instead of rooting
  // wrong-bracket: brackets between the wrong pair of squares
  const candidates: Candidate[] = [
    { tag: "halve-not-root", value: variant === "bracket" ? rat(Math.floor(n / 2)) : fromDecimal(n / 2, 1) },
    { tag: "wrong-bracket", value: variant === "bracket" ? rat(high) : fromDecimal(Math.round((q.value + 1) * 10) / 10, 1) },
  ];

  const fmtAnswer = (x: Answer): string => {
    const r = x as { n: number; d: number };
    return variant === "bracket" ? fmtFraction(rat(r.n, r.d)) : fmtDecimal(rat(r.n, r.d));
  };
  const choice = buildChoice(rng, correct, candidates, fmtAnswer);

  const template = variant === "bracket" ? skin.bracket : variant === "expression" ? skin.expression : skin.tenth;

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${n}|${a}|${b}`),
    format: variant === "bracket" ? "multiple-choice" : rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt: {
      text: bind(template, { n: String(n), expr: q.label }),
      figure: { kind: "bracketing" as const, min: Math.max(0, low - 2), max: high + 2, points: [low, q.value, high], labels: [`${low}`, q.label, `${high}`] },
    },
    answer: correct,
    answerText: fmtAnswer(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, n, a, b },
  };
}
