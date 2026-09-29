// h8.f.a3 — Linear vs nonlinear; interpret y = mx + b
// (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "h8.f.a3";

type Variant =
  | "table"     // constant differences, or not              (tier 1)
  | "equation"  // x squared and friends                      (tier 2)
  | "graph"     // straight or curved                         (tier 3)
  | "meaning";  // what m and b mean in y = mx + b             (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["table"],
  2: ["equation", "table"],
  3: ["graph", "equation"],
  4: ["meaning", "graph"],
};

/** The registry's foils: squares, reciprocals and absolute values. */
const EQUATIONS: { text: string; linear: boolean }[] = [
  { text: "y = 3x + 2", linear: true },
  { text: "y = −5x", linear: true },
  { text: "y = x/4 − 1", linear: true },
  { text: "y = 7", linear: true },
  { text: "y = x²", linear: false },
  { text: "y = 2x² − 3", linear: false },
  { text: "y = 1/x", linear: false },
  { text: "y = |x|", linear: false },
  { text: "y = x³", linear: false },
];

const SKINS = {
  climb: { thing: "altitude", unit: "thousand ft", per: "minute" },
  fuel: { thing: "fuel", unit: "litres", per: "minute" },
  credits: { thing: "credits", unit: "CR", per: "mission" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "meaning" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the relationship ----------------------------------------------
  const linear = rng() < 0.5;
  const equation = pick(rng, EQUATIONS.filter((e) => e.linear === linear));

  const start = int(rng, 2, 40);
  const stepX = int(rng, 1, 4);
  const stepY = int(rng, 2, 12) * (rng() < 0.35 ? -1 : 1);
  const xs = [0, 1, 2, 3].map((i) => i * stepX);
  // A linear table steps by the same amount every time. A nonlinear one grows,
  // which is what "constant differences" is there to catch.
  const ys = xs.map((_, i) => (linear ? start + stepY * i : start + stepY * i * (i + 1) / 2));

  const m = rat(stepY, stepX);

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "table"
      ? bind("This table pairs x with y. Is the relationship LINEAR?", {})
      : variant === "equation"
        ? bind("Is {{eq}} a LINEAR relationship?", { eq: equation.text })
        : variant === "graph"
          ? bind("The plotted {{thing}} readings are {{list}}. Is the relationship LINEAR?", {
              thing: skin.thing, list: xs.map((x, i) => `(${x}, ${ys[i]})`).join(" "),
            })
          : bind("{{thing}} follows y = {{m}}x + {{b}}, with x in {{per}}s and y in {{unit}}. What does the {{m}} tell you?", {
              thing: `${skin.thing.charAt(0).toUpperCase()}${skin.thing.slice(1)}`,
              m: showNumber(m), b: fmtInt(start), per: skin.per, unit: skin.unit,
            });

  const prompt = {
    text,
    figure: variant === "meaning" || variant === "equation"
      ? undefined
      : {
          kind: (variant === "graph" ? "coordinate-plane" : "table") as "coordinate-plane" | "table",
          rows: [["x", ...xs.map(String)], ["y", ...ys.map(String)]],
          series: [xs.map((x, i) => [x, ys[i]!])],
          max: Math.max(...xs) + 1,
          maxY: Math.ceil(Math.max(...ys.map(Math.abs)) / 10) * 10,
        },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const diffs = ys.slice(1).map((y, i) => y - ys[i]!);
  const worked: WorkedStep[] = [
    { text: "Linear means a CONSTANT rate of change: equal steps in x give equal steps in y.", math: `steps in y: ${diffs.join(", ")}` },
    { text: "In a table, subtract each y from the next. All the same means linear; growing or shrinking means not.", math: linear ? "all equal — linear" : "not equal — not linear" },
    { text: "In an equation, x must be plain: no square, no cube, no x on the bottom, no absolute value.", math: equation.text },
    { text: "In y = mx + b, m is the rate — how much y changes for each 1 of x — and b is where it starts.", math: `m = ${showNumber(m)} per ${skin.per}, b = ${fmtInt(start)}` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${variant === "equation" ? equation.text : `${linear}|${start},${stepX},${stepY}`}`);

  // --- 4. the meaning variant answers in words --------------------------
  if (variant === "meaning") {
    const right = `${skin.thing.toUpperCase()} CHANGES BY ${showNumber(m)} ${skin.unit} EVERY ${skin.per.toUpperCase()}`;
    const candidates: Candidate[] = [
      // any-pattern-linear: reading m as a total rather than a rate
      { tag: "any-pattern-linear", value: `THE TOTAL ${skin.thing.toUpperCase()} IS ${showNumber(m)} ${skin.unit}` },
      // straight-segment: m and b read as each other
      { tag: "straight-segment", value: `${skin.thing.toUpperCase()} STARTS AT ${showNumber(m)} ${skin.unit}` },
      { tag: "any-pattern-linear", value: `${skin.thing.toUpperCase()} CHANGES BY ${fmtInt(start)} ${skin.unit} EVERY ${skin.per.toUpperCase()}` },
    ];
    const choice = buildChoice(rng, right, candidates, (v: Answer) => String(v));
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input) === right,
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, linear: String(linear) },
    };
  }

  // --- 5. linear or not -------------------------------------------------
  const isLinear = variant === "equation" ? equation.linear : linear;
  const answer = isLinear ? "YES" : "NO";
  const foil = isLinear ? "NO" : "YES";
  const options = ["YES", "NO"];
  const tag = isLinear ? "straight-segment" : "any-pattern-linear";

  return {
    skill: SKILL, tier, seed, hash,
    format: "yes-no",
    prompt,
    answer,
    answerText: answer,
    accept: (input: Answer) => String(input).toUpperCase() === answer,
    distractors: [{ tag, value: foil }],
    options,
    optionText: options,
    correctIndex: options.indexOf(answer),
    worked,
    errorTagsByAnswer: { [foil]: tag },
    params: { variant, skin: skinKey, linear: String(isLinear) },
  };
}
