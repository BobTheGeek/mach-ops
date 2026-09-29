// ee.3.3 — The distributive property
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtImproper, MINUS } from "../../engine/rational";
import { lin, fmtLinear, fmtBracketed, parseLinear, eqLinear, scaleLinear, addLinear, type Linear } from "../../engine/linear";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "ee.3.3";

type Variant =
  | "positive"   // positive factor, positive terms                      (tier 1)
  | "negative"   // negative factor                                      (tier 2)
  | "then-add"   // negative factor over a subtraction, then combine     (tier 3)
  | "fraction";  // fractional factor                                    (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["positive"],
  2: ["negative", "positive"],
  3: ["then-add", "negative"],
  4: ["fraction", "then-add"],
};

const SKINS = {
  squadron: {
    unit: "",
    plain: "{{k}} squadrons each carry {{inner}}. Write the total as a single expression.",
    combine: "Engine map: expand and simplify {{expr}}.",
  },
  hangar: {
    unit: "",
    plain: "A hangar bay is {{k}} rows of {{inner}}. Write the total as a single expression.",
    combine: "Hangar sheet: expand and simplify {{expr}}.",
  },
  fuel: {
    unit: "L",
    plain: "{{k}} tanks each hold {{inner}} L. Write the total as a single expression.",
    combine: "Fuel computer: expand and simplify {{expr}}.",
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
  const variant = opts.transfer && tier === 4 ? "fraction" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];
  const variable = "x";

  // --- 1. choose the factor and what is inside --------------------------
  let k = rat(1);
  let inner: Linear;
  let outside: Linear | null = null;

  switch (variant) {
    case "positive":
      k = rat(int(rng, 2, 9));
      inner = lin(rat(int(rng, 1, 9)), rat(int(rng, 1, 15)));
      break;
    case "negative":
      k = rat(int(rng, -9, -2));
      inner = lin(rat(int(rng, 1, 9)), rat(int(rng, 1, 15)));
      break;
    case "then-add":
      k = rat(int(rng, -9, -2));
      inner = lin(rat(int(rng, 1, 9)), rat(-int(rng, 1, 15)));
      outside = lin(rat(0), rat(nonZero(rng, -20, 20)));
      break;
    case "fraction": {
      // A fractional factor with terms chosen so the result stays clean.
      const d = pick(rng, [2, 3, 4] as const);
      const sign = rng() < 0.5 ? 1 : -1;
      k = rat(sign * int(rng, 1, d - 1 || 1), d);
      // A zero constant leaves nothing to forget, so there is no problem left.
      inner = lin(rat(d * int(rng, 1, 5)), rat(d * nonZero(rng, -6, 6)));
      break;
    }
  }

  const distributed = scaleLinear(k, inner);
  const correct = outside ? addLinear(distributed, outside) : distributed;

  const factorText = fmtImproper(k);
  const bracketed = `${factorText === "1" ? "" : factorText === `${MINUS}1` ? MINUS : factorText}${fmtBracketed(inner, variable)}`;
  const expr = outside
    ? `${bracketed} ${outside.b.n < 0 ? MINUS : "+"} ${Math.abs(outside.b.n)}`
    : bracketed;

  // --- 2. prompt --------------------------------------------------------
  const isPlain = variant === "positive" || variant === "negative";
  const prompt = {
    text: bind(isPlain ? skin.plain : skin.combine, {
      k: factorText,
      inner: fmtBracketed(inner, variable),
      expr,
    }),
    ...(skin.unit ? { units: skin.unit } : {}),
    math: [expr],
    figure: {
      kind: "area-model" as const,
      labels: [factorText, fmtLinear(inner, variable)],
      rows: [[fmtLinear(distributed, variable)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "The number outside multiplies EVERY term inside, not just the first.", math: expr },
    {
      text: "Multiply the outside number by the variable term. Take its sign with it.",
      math: `${factorText} × ${fmtImproper(inner.a)}${variable} = ${fmtImproper(distributed.a)}${variable}`,
    },
    {
      text: "Multiply the outside number by the constant. A negative times a negative is positive.",
      math: `${factorText} × ${fmtImproper(inner.b)} = ${fmtImproper(distributed.b)}`,
    },
    {
      text: outside ? "Now combine with the term left outside the brackets." : "Write the two results together.",
      math: fmtLinear(correct, variable),
    },
  ];

  // --- 4. distractors from registry error tags --------------------------
  // forgot-second-term: the constant inside never got multiplied
  const forgotSecond = addLinear(lin(distributed.a, inner.b), outside ?? lin(rat(0), rat(0)));
  // multiply-constant-only: the variable term never got multiplied
  const constantOnly = addLinear(lin(inner.a, distributed.b), outside ?? lin(rat(0), rat(0)));
  // sign-inside: the sign was not carried into the brackets
  const signInside = addLinear(
    lin(distributed.a, rat(-distributed.b.n, distributed.b.d)),
    outside ?? lin(rat(0), rat(0)),
  );

  const candidates: Candidate[] = [
    { tag: "forgot-second-term", value: fmtLinear(forgotSecond, variable) },
    { tag: "multiply-constant-only", value: fmtLinear(constantOnly, variable) },
    { tag: "sign-inside", value: fmtLinear(signInside, variable) },
  ];
  const choice = buildChoice(rng, fmtLinear(correct, variable), candidates, (a) => String(a));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${inner.a.n},${inner.b.n}|${outside?.b.n ?? ""}`),
    format: rng() < 0.5 ? "expression" : "multiple-choice",
    prompt,
    answer: fmtLinear(correct, variable),
    answerText: fmtLinear(correct, variable),
    accept: (input: Answer) => {
      const parsed = parseLinear(String(input), variable);
      return parsed !== null && eqLinear(parsed, correct);
    },
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, k: `${k.n}/${k.d}`, inner: `${inner.a.n},${inner.b.n}`, outside: outside?.b.n ?? 0 },
  };
}
