// ee.3.2 — Adding and subtracting linear expressions
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat } from "../../engine/rational";
import {
  lin, fmtLinear, fmtBracketed, parseLinear, eqLinear, addLinear, subLinear, negLinear, type Linear,
} from "../../engine/linear";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "ee.3.2";

type Variant =
  | "add"              // add two expressions                          (tier 1)
  | "subtract-plain"   // subtract, positive terms inside              (tier 2)
  | "subtract-negative"// subtract, a negative inside the second       (tier 3)
  | "rational";        // rational coefficients, in a context          (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["add"],
  2: ["subtract-plain", "add"],
  3: ["subtract-negative", "subtract-plain"],
  4: ["rational", "subtract-negative"],
};

const SKINS = {
  loadout: {
    unit: "LB",
    plain: "Loadout sheet: simplify {{expr}}.",
    context: "Loadout A weighs {{first}} lb and loadout B weighs {{second}} lb. How much heavier is A?",
  },
  fuel: {
    unit: "L",
    plain: "Fuel computer: simplify {{expr}}.",
    context: "Tank A holds {{first}} L and the reserve is {{second}} L. What is left above reserve?",
  },
  thrust: {
    unit: "%",
    plain: "Engine map: simplify {{expr}}.",
    context: "Engine A gives {{first}}% and engine B gives {{second}}%. What is the difference?",
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
  const variant = opts.transfer && tier === 4 ? "rational" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];
  const variable = "x";

  // --- 1. choose the two expressions ------------------------------------
  const subtracting = variant !== "add";
  const denominators = variant === "rational" ? ([2, 3, 4] as const) : ([1] as const);

  const first: Linear = lin(
    rat(nonZero(rng, -9, 9), pick(rng, denominators)),
    rat(int(rng, -20, 20)),
  );
  // Tier 3 must put a negative inside the expression being subtracted, because
  // that is the whole point: -(2x - 4) is -2x + 4.
  const secondConstant = variant === "subtract-negative"
    ? -int(rng, 1, 20)
    : variant === "subtract-plain"
      ? int(rng, 1, 20)
      : int(rng, -20, 20);
  const second: Linear = lin(
    rat(nonZero(rng, -9, 9), pick(rng, denominators)),
    rat(secondConstant),
  );

  const correct = subtracting ? subLinear(first, second) : addLinear(first, second);
  const expr = `${fmtBracketed(first, variable)} ${subtracting ? "−" : "+"} ${fmtBracketed(second, variable)}`;

  // --- 2. prompt --------------------------------------------------------
  const isContext = variant === "rational";
  const prompt = {
    text: bind(isContext ? skin.context : skin.plain, {
      expr,
      first: fmtLinear(first, variable),
      second: fmtLinear(second, variable),
    }),
    units: skin.unit,
    math: [expr],
    figure: {
      kind: (subtracting ? "add-the-opposite" : "vertical-format") as "add-the-opposite" | "vertical-format",
      rows: [[fmtLinear(first, variable)], [fmtLinear(second, variable)], [fmtLinear(correct, variable)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const flipped = negLinear(second);
  const worked: WorkedStep[] = [
    { text: "Write both expressions out, each in its own brackets.", math: expr },
    {
      text: subtracting
        ? "To subtract an expression, add the opposite of EVERY term inside it. Both signs flip, not just the first."
        : "Adding needs no change inside the brackets, so drop them.",
      math: subtracting
        ? `${fmtBracketed(first, variable)} + ${fmtBracketed(flipped, variable)}`
        : `${fmtLinear(first, variable)} + ${fmtLinear(second, variable)}`,
    },
    { text: "Group the like terms: letters with letters, plain numbers with plain numbers.", math: `${variable} terms and numbers` },
    { text: "Add each group and write the result.", math: fmtLinear(correct, variable) },
  ];

  // --- 4. distractors from registry error tags --------------------------
  // distribute-minus-once: only the first term of the second expression is negated
  const onceOnly = subLinear(first, lin(second.a, rat(-second.b.n, second.b.d)));
  // no-distribute: the brackets are simply dropped, so nothing is negated
  const notAtAll = addLinear(first, second);

  // Adding has no minus to distribute, so the same two tags describe the
  // adjacent slip: only part of the second expression made it into the answer.
  const xOnly = lin(addLinear(first, second).a, first.b);
  const constantOnly = lin(first.a, addLinear(first, second).b);

  const candidates: Candidate[] = [
    { tag: "distribute-minus-once", value: fmtLinear(onceOnly, variable), when: subtracting },
    { tag: "no-distribute", value: fmtLinear(notAtAll, variable), when: subtracting },
    { tag: "distribute-minus-once", value: fmtLinear(subLinear(second, first), variable), when: subtracting },
    { tag: "no-distribute", value: fmtLinear(xOnly, variable), when: !subtracting },
    { tag: "distribute-minus-once", value: fmtLinear(constantOnly, variable), when: !subtracting },
    { tag: "no-distribute", value: fmtLinear(subLinear(first, second), variable), when: !subtracting },
  ];
  const choice = buildChoice(rng, fmtLinear(correct, variable), candidates, (a) => String(a));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${first.a.n}/${first.a.d},${first.b.n}|${second.a.n}/${second.a.d},${second.b.n}`),
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
    params: {
      variant, skin: skinKey,
      first: `${first.a.n}/${first.a.d},${first.b.n}`,
      second: `${second.a.n}/${second.a.d},${second.b.n}`,
    },
  };
}
