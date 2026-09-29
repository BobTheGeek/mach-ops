// rp.5.1 — Ratios and ratio tables
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, add, fmtFraction, toNumber } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.5.1";

type Variant =
  | "adjacent"    // complete the next row of a ratio table      (tier 1)
  | "far-row"     // a row whose multiplier is not obvious       (tier 2)
  | "fractional"  // ratios with fractions                       (tier 3)
  | "compare";    // which of two ratios is bigger               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["adjacent"],
  2: ["far-row", "adjacent"],
  3: ["fractional", "far-row"],
  4: ["compare", "fractional"],
};

const SKINS = {
  fuel: { left: "FUEL (L)", right: "DISTANCE (NM)", unit: "NM", noun: "fuel to distance" },
  missiles: { left: "MISSILES", right: "SORTIES", unit: "", noun: "missiles per sortie" },
  crew: { left: "PILOTS", right: "AIRCRAFT", unit: "", noun: "pilots to aircraft" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "compare" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the base ratio, then the rows --------------------------
  const fractional = variant === "fractional";
  const a: Rational = fractional ? rat(int(rng, 1, 11), pick(rng, [2, 4] as const)) : rat(int(rng, 1, 12));
  const b: Rational = rat(int(rng, 1, 12));

  const multipliers = variant === "adjacent"
    ? [rat(1), rat(2), rat(3)]
    : [rat(1), rat(int(rng, 2, 4)), rat(int(rng, 5, 9))];
  const askRow = variant === "adjacent" ? 2 : 2;

  const rowsA = multipliers.map((m) => mul(a, m));
  const rowsB = multipliers.map((m) => mul(b, m));
  const correct = rowsB[askRow]!;

  // --- 2. prompt --------------------------------------------------------
  const shownA = rowsA.map((r) => fmtFraction(r));
  const shownB = rowsB.map((r, i) => (i === askRow ? "?" : fmtFraction(r)));

  // The compare variant asks which of two ratios is larger.
  const otherA = rat(int(rng, 1, 12));
  const otherB = rat(int(rng, 1, 12));
  const mineIsBigger = toNumber(a) / toNumber(b) > toNumber(otherA) / toNumber(otherB);

  const prompt = {
    text: variant === "compare"
      ? bind("Table A runs {{a1}} to {{b1}}. Table B runs {{a2}} to {{b2}}. Which table has the higher {{noun}} ratio?", {
          a1: fmtFraction(a), b1: fmtFraction(b),
          a2: fmtFraction(otherA), b2: fmtFraction(otherB),
          noun: skin.noun,
        })
      : bind("The {{noun}} table is missing a value. What goes in the gap?", { noun: skin.noun }),
    ...(skin.unit ? { units: skin.unit } : {}),
    figure: {
      kind: "ratio-table" as const,
      rows: [[skin.left, ...shownA], [skin.right, ...shownB]],
      labels: shownA,
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const multiplier = multipliers[askRow]!;
  const worked: WorkedStep[] = [
    { text: "Find a row where both values are known. That pair is your base ratio.", math: `${fmtFraction(a)} : ${fmtFraction(b)}` },
    { text: "Work out what the known value was multiplied by to reach the row you want.", math: `${fmtFraction(a)} × ${fmtFraction(multiplier)} = ${fmtFraction(rowsA[askRow]!)}` },
    { text: "Multiply the OTHER value by the same number. Both parts scale together, or the ratio changes.", math: `${fmtFraction(b)} × ${fmtFraction(multiplier)}` },
    { text: "Write the missing value.", math: `${fmtFraction(correct)}${skin.unit ? ` ${skin.unit}` : ""}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const added = add(b, rat(rowsA[askRow]!.n * a.d - a.n * rowsA[askRow]!.d, a.d * rowsA[askRow]!.d));
  const candidates: Candidate[] = [
    // additive-scaling: adds the same amount to both parts instead of multiplying
    { tag: "additive-scaling", value: added },
    // inverted-ratio: swaps the two quantities
    { tag: "inverted-ratio", value: mul(a, multiplier) },
    { tag: "inverted-ratio", value: rowsA[askRow]! },
  ];

  const fmt = (v: Answer): string => fmtFraction(v as Rational);

  if (variant === "compare") {
    const options = ["TABLE A", "TABLE B"];
    const correctIndex = mineIsBigger ? 0 : 1;
    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${a.n}/${a.d}:${b.n}/${b.d}|${otherA.n}:${otherB.n}`),
      format: "pick-one:table",
      prompt,
      answer: options[correctIndex]!,
      answerText: options[correctIndex]!,
      accept: (input: Answer) => input === options[correctIndex],
      distractors: [{ tag: "inverted-ratio", value: options[1 - correctIndex]! }],
      options,
      optionText: options,
      correctIndex,
      worked,
      errorTagsByAnswer: { [options[1 - correctIndex]!]: "inverted-ratio" },
      params: { variant, skin: skinKey, a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}`, oa: otherA.n, ob: otherB.n },
    };
  }

  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a.n}/${a.d}|${b.n}/${b.d}|${multipliers.map((m) => m.n).join(",")}`),
    format: rng() < 0.4 ? "table-fill" : rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: fmtFraction(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}`, multiplier: `${multiplier.n}/${multiplier.d}` },
  };
}
