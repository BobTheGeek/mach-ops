// rp.5.3 — Identifying proportional relationships
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, add, div0, fmtFraction } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.5.3";

type Variant =
  | "yes-no"     // is this table proportional?           (tier 1)
  | "find-k"     // find k from a proportional table      (tier 2)
  | "equation"   // is y = 3x + 2 proportional?           (tier 3)
  | "which";     // which of three is proportional        (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["yes-no"],
  2: ["find-k", "yes-no"],
  3: ["equation", "find-k"],
  4: ["which", "equation"],
};

const SKINS = {
  fuel: { x: "LEGS", y: "FUEL (L)", noun: "fuel used" },
  credits: { x: "MISSILES", y: "CREDITS", noun: "cost" },
  thrust: { x: "THROTTLE", y: "THRUST", noun: "thrust" },
} as const;

type SkinKey = keyof typeof SKINS;

/** The registry's k values: "k in {2..12, 1/2, 1/4, 1.5, 2.5}". */
const K_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const K_FRACTIONS = [[1, 2], [1, 4], [3, 2], [5, 2]] as const;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "which" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  const k: Rational = rng() < 0.6
    ? rat(pick(rng, K_VALUES))
    : ((): Rational => { const f = pick(rng, K_FRACTIONS); return rat(f[0], f[1]); })();

  // A fresh multiplier per column put the same x in two columns (1, 6, 6, 8),
  // which reads as a broken table before the player has done any thinking.
  // One start and one step keeps the four values distinct and increasing.
  const xStart = int(rng, 1, 6);
  const xStep = int(rng, 1, 6);
  const xs = [0, 1, 2, 3].map((n) => rat(xStart + n * xStep));

  /** A table that breaks proportionality, and how it breaks. */
  type Break = "none" | "constant" | "one-row";
  // A yes/no question has to be a coin flip. Drawing uniformly from the three
  // kinds would make "not proportional" right two thirds of the time, and a
  // student who always answers no would score 67% without reading the table.
  // A yes/no question has to be a coin flip. Drawing uniformly from the three
  // kinds would make "not proportional" right two thirds of the time, and a
  // student who always answers no would score 67% without reading the table.
  // "equation" states y = kx + b in words, so a single broken row would not
  // match what it says; it flips between none and a constant only. "find-k"
  // tells the player the table is proportional, so it never breaks.
  const breakKind: Break = variant === "yes-no" || variant === "which"
    ? ((): Break => { const r = rng(); return r < 0.5 ? "none" : r < 0.75 ? "constant" : "one-row"; })()
    : variant === "equation"
      ? (rng() < 0.5 ? "none" : "constant")
      : "none";
  const offset = rat(int(rng, 1, 9));

  const ys = xs.map((x, i) => {
    const base = mul(k, x);
    if (breakKind === "constant") return add(base, offset);
    // "two-rows-only" is the mistake this catches: only the third row is wrong.
    if (breakKind === "one-row" && i === 2) return add(base, offset);
    return base;
  });

  const proportional = breakKind === "none";

  // --- prompt -----------------------------------------------------------
  const rows = [[skin.x, ...xs.map((v) => fmtFraction(v))], [skin.y, ...ys.map((v) => fmtFraction(v))]];
  const equationText = proportional ? `y = ${fmtFraction(k)}x` : `y = ${fmtFraction(k)}x + ${fmtFraction(offset)}`;

  const text = variant === "equation"
    ? bind("The {{noun}} follows {{eq}}. Is that a proportional relationship?", { noun: skin.noun, eq: equationText })
    : variant === "find-k"
      ? bind("This {{noun}} table is proportional. What is the constant of proportionality k?", { noun: skin.noun })
      : variant === "which"
        ? bind("Which of these {{noun}} descriptions is proportional?", { noun: skin.noun })
        : bind("Is this {{noun}} table proportional?", { noun: skin.noun });

  const prompt = {
    text,
    figure: {
      kind: (variant === "equation" ? "arrow-table" : "ratio-table") as "arrow-table" | "ratio-table",
      rows,
    },
  };

  // --- worked steps: MUST match the manual's "How to solve it" ----------
  const ratios = xs.map((x, i) => `${fmtFraction(ys[i]!)}/${fmtFraction(x)}`);
  const worked: WorkedStep[] = [
    { text: "Divide y by x for EVERY row, not just the first two. One bad row breaks it.", math: ratios.join("   ") },
    { text: "If every row gives the same number, that number is k, the constant of proportionality.", math: proportional ? `k = ${fmtFraction(k)}` : "the rows disagree" },
    { text: "Check that (0, 0) fits. Adding a constant, like y = kx + 2, makes a straight line but not a proportional one.", math: proportional ? "(0, 0) fits" : `(0, ${fmtFraction(offset)}) — not the origin` },
    { text: "Say yes only if both are true.", math: proportional ? "PROPORTIONAL" : "NOT PROPORTIONAL" },
  ];

  // --- find k: the answer is a number ------------------------------------
  if (variant === "find-k") {
    const candidates: Candidate[] = [
      // k-inverted: reads k as x/y
      { tag: "k-inverted", value: () => div0(rat(1), k), when: k.n !== 0 },
      // linear-not-proportional: reads a difference rather than a ratio
      { tag: "linear-not-proportional", value: add(k, offset) },
      // two-rows-only: takes k from a single row's y value
      { tag: "two-rows-only", value: ys[0]! },
    ];
    const fmt = (v: Answer): string => fmtFraction(v as Rational);
    const choice = buildChoice(rng, k, candidates, fmt);

    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${xs.map((x) => x.n).join(",")}`),
      format: rng() < 0.5 ? "numeric" : "multiple-choice",
      prompt,
      answer: k,
      answerText: fmtFraction(k),
      accept: acceptRational(k),
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, k: `${k.n}/${k.d}` },
    };
  }

  // --- which: pick the proportional description out of four -------------
  if (variant === "which") {
    const right = `y = ${fmtFraction(k)}x`;
    const wrong = [
      `y = ${fmtFraction(k)}x + ${fmtFraction(offset)}`,
      `y = x + ${fmtFraction(offset)}`,
      `y = ${fmtFraction(add(k, rat(1)))}x − ${fmtFraction(offset)}`,
    ];
    const laid = shuffle(rng, [right, ...wrong]);
    const correctIndex = laid.indexOf(right);
    const distractors = laid.filter((_, i) => i !== correctIndex).map((value) => ({ tag: "linear-not-proportional", value }));

    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${laid.join("|")}`),
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => input === right,
      distractors,
      options: laid,
      optionText: laid,
      correctIndex,
      worked,
      errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [d.value, d.tag])),
      params: { variant, skin: skinKey, k: `${k.n}/${k.d}`, set: laid.join(" | ") },
    };
  }

  // --- yes-no and equation -----------------------------------------------
  const options = ["PROPORTIONAL", "NOT PROPORTIONAL"];
  const correctIndex = proportional ? 0 : 1;
  const wrongTag = breakKind === "one-row" ? "two-rows-only" : "linear-not-proportional";

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${breakKind}|${breakKind === "none" ? 0 : offset.n}|${xs.map((x) => x.n).join(",")}`),
    format: "yes-no",
    prompt,
    answer: options[correctIndex]!,
    answerText: options[correctIndex]!,
    accept: (input: Answer) => input === options[correctIndex],
    distractors: [{ tag: wrongTag, value: options[1 - correctIndex]! }],
    options,
    optionText: options,
    correctIndex,
    worked,
    errorTagsByAnswer: { [options[1 - correctIndex]!]: wrongTag },
    params: { variant, skin: skinKey, k: `${k.n}/${k.d}`, breakKind },
  };
}
