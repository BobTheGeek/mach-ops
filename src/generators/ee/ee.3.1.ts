// ee.3.1 — Algebraic expressions: evaluate and combine like terms
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, fmtFraction, fmtImproper } from "../../engine/rational";
import { lin, fmtLinear, fmtSum, parseLinear, eqLinear, evaluate, type Linear } from "../../engine/linear";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ee.3.1";

type Variant =
  | "evaluate"    // work out ax + b for a given x                 (tier 1)
  | "combine"     // combine two or three like terms               (tier 2)
  | "rational"    // rational coefficients, both signs             (tier 3)
  | "write";      // write the expression from a description       (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["evaluate"],
  2: ["combine", "evaluate"],
  3: ["rational", "combine"],
  4: ["write", "rational"],
};

const SKINS = {
  loadout: {
    unit: "LB",
    evaluate: "Each missile weighs {{x}} lb. The loadout expression is {{expr}}. What is the total?",
    combine: "Loadout sheet: simplify {{expr}}.",
    write: "Each missile weighs m lb and you carry {{count}}, plus {{fixed}} lb of fuel. Write the total as an expression.",
  },
  thrust: {
    unit: "%",
    evaluate: "Each engine runs at {{x}}%. The thrust expression is {{expr}}. What is the total?",
    combine: "Engine map: simplify {{expr}}.",
    write: "Each engine gives t% and you have {{count}}, plus {{fixed}}% from the ram effect. Write the total as an expression.",
  },
  fuel: {
    unit: "L",
    evaluate: "Each tank holds {{x}} L. The fuel expression is {{expr}}. What is the total?",
    combine: "Fuel computer: simplify {{expr}}.",
    write: "Each tank holds f L and you carry {{count}}, plus {{fixed}} L in the fuselage. Write the total as an expression.",
  },
} as const;

type SkinKey = keyof typeof SKINS;

function nonZero(rng: () => number, lo: number, hi: number): number {
  let n = int(rng, lo, hi);
  while (n === 0) n = int(rng, lo, hi);
  return n;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "write" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the pieces ---------------------------------------------
  const variable = skinKey === "loadout" ? "m" : skinKey === "thrust" ? "t" : "f";

  let terms: Linear[] = [];
  let x = rat(0);
  let count = 0;
  let fixed = 0;

  switch (variant) {
    case "evaluate":
      terms = [lin(rat(nonZero(rng, -9, 9)), rat(int(rng, -20, 20)))];
      x = rat(int(rng, -5, 5));
      break;
    case "combine": {
      const n = int(rng, 2, 3);
      terms = Array.from({ length: n }, () => lin(rat(nonZero(rng, -9, 9)), rat(int(rng, -20, 20))));
      break;
    }
    case "rational": {
      const denominators = [2, 3, 4] as const;
      terms = Array.from({ length: 2 }, () =>
        lin(rat(nonZero(rng, -9, 9), pick(rng, denominators)), rat(int(rng, -20, 20))));
      break;
    }
    case "write":
      count = int(rng, 2, 8);
      fixed = int(rng, 100, 900);
      terms = [lin(rat(count), rat(fixed))];
      break;
  }

  const combined = terms.reduce((acc, t) => lin(add(acc.a, t.a), add(acc.b, t.b)), lin(rat(0), rat(0)));
  const written = fmtSum(terms, variable);
  const isEvaluate = variant === "evaluate";
  const value = isEvaluate ? evaluate(terms[0]!, x) : rat(0);

  // --- 2. prompt --------------------------------------------------------
  const template = isEvaluate ? skin.evaluate : variant === "write" ? skin.write : skin.combine;
  const prompt = {
    text: bind(template, {
      x: fmtFraction(x),
      expr: written,
      count: String(count),
      fixed: String(fixed),
    }),
    units: skin.unit,
    math: [written],
    figure: {
      kind: (variant === "write" ? "tape-diagram" : "tiles") as "tape-diagram" | "tiles",
      labels: terms.map((t) => fmtLinear(t, variable)),
      rows: [[fmtLinear(combined, variable)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = isEvaluate
    ? [
        { text: `Put the value in wherever the letter appears. Write it in brackets so the sign travels with it.`, math: `${fmtImproper(terms[0]!.a)}(${fmtFraction(x)}) + ${fmtImproper(terms[0]!.b)}` },
        { text: "Multiply first. The letter is gone, so this is now ordinary arithmetic.", math: `${fmtFraction(evaluate(lin(terms[0]!.a, rat(0)), x))}` },
        { text: "Then add the plain number.", math: `${fmtFraction(evaluate(lin(terms[0]!.a, rat(0)), x))} + ${fmtImproper(terms[0]!.b)}` },
        { text: "Work it out.", math: `${fmtFraction(value)} ${skin.unit}` },
      ]
    : [
        { text: `Find the like terms. Like terms have the same letter part; ${variable} terms go with ${variable} terms, plain numbers with plain numbers.`, math: written },
        { text: `Add the coefficients of the ${variable} terms. The letter itself does not change.`, math: `${fmtImproper(combined.a)}${variable}` },
        { text: "Add the plain numbers separately. They never join the letter.", math: fmtImproper(combined.b) },
        { text: "Write the two parts together.", math: fmtLinear(combined, variable) },
      ];

  // --- 4. distractors from registry error tags --------------------------
  if (isEvaluate) {
    const candidates: Candidate[] = [
      // constant-into-x: folds the constant into the coefficient before substituting
      { tag: "constant-into-x", value: evaluate(lin(add(terms[0]!.a, terms[0]!.b), rat(0)), x) },
      // lost-negative: the sign on the constant falls off
      { tag: "lost-negative", value: evaluate(lin(terms[0]!.a, rat(Math.abs(terms[0]!.b.n), terms[0]!.b.d)), x), when: terms[0]!.b.n < 0 },
      { tag: "lost-negative", value: evaluate(lin(rat(-terms[0]!.a.n, terms[0]!.a.d), terms[0]!.b), x) },
      // x-as-zero: treats the variable term as nothing
      { tag: "x-as-zero", value: terms[0]!.b },
    ];
    const fmt = (a: Answer): string => fmtFraction(a as Rational);
    const choice = buildChoice(rng, value, candidates, fmt);

    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${terms[0]!.a.n}/${terms[0]!.a.d}|${terms[0]!.b.n}/${terms[0]!.b.d}|${x.n}/${x.d}`),
      format: rng() < 0.5 ? "numeric" : "multiple-choice",
      prompt,
      answer: value,
      answerText: fmtFraction(value),
      accept: acceptRational(value),
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, a: `${terms[0]!.a.n}/${terms[0]!.a.d}`, b: `${terms[0]!.b.n}/${terms[0]!.b.d}`, x: `${x.n}/${x.d}` },
    };
  }

  const answerText = fmtLinear(combined, variable);
  const candidates: Candidate[] = [
    // constant-into-x: 3x + 2 collapsed to 5x
    { tag: "constant-into-x", value: fmtLinear(lin(add(combined.a, combined.b), rat(0)), variable) },
    // lost-negative: one coefficient's sign dropped
    { tag: "lost-negative", value: fmtLinear(lin(rat(Math.abs(combined.a.n), combined.a.d), combined.b), variable), when: combined.a.n < 0 },
    { tag: "lost-negative", value: fmtLinear(lin(combined.a, rat(Math.abs(combined.b.n), combined.b.d)), variable), when: combined.b.n < 0 },
    { tag: "lost-negative", value: fmtLinear(lin(rat(-combined.a.n, combined.a.d), combined.b), variable) },
    // x-as-zero: a bare x counted as nothing
    { tag: "x-as-zero", value: fmtLinear(lin(add(combined.a, rat(-1)), combined.b), variable) },
  ];
  const choice = buildChoice(rng, answerText, candidates, (a) => String(a));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${terms.map((t) => `${t.a.n}/${t.a.d},${t.b.n}/${t.b.d}`).join("|")}`),
    format: rng() < 0.5 ? "expression" : "multiple-choice",
    prompt,
    answer: answerText,
    answerText,
    accept: (input: Answer) => {
      const parsed = parseLinear(String(input), variable);
      return parsed !== null && eqLinear(parsed, combined);
    },
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, terms: terms.map((t) => `${t.a.n}/${t.a.d},${t.b.n}/${t.b.d}`).join(" ") },
  };
}
