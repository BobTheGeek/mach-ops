// h8.ee.b5 — Slope as unit rate; compare proportional relationships
// (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.b5";

type Variant =
  | "slope"    // the slope of a line through the origin     (tier 1)
  | "vs-eq"    // a graph against an equation                 (tier 2)
  | "vs-table" // a graph against a table or a sentence        (tier 3)
  | "meaning"; // what (1, r) and (0, 0) mean in context       (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["slope"],
  2: ["vs-eq", "slope"],
  3: ["vs-table", "vs-eq"],
  4: ["meaning", "vs-table"],
};

const SKINS = {
  burn: { y: "fuel burn", unit: "L", x: "minute", a: "TANKER A", b: "TANKER B" },
  speed: { y: "distance", unit: "km", x: "minute", a: "LEAD", b: "WINGMAN" },
} as const;

type SkinKey = keyof typeof SKINS;

/** The registry's rate list. */
const RATES: [number, number][] = [
  [1, 2], [1, 1], [3, 2], [2, 1], [5, 2], [3, 1], [7, 2], [4, 1], [9, 2], [5, 1], [6, 1],
];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "meaning" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. two proportional relationships ---------------------------------
  const r1 = pick(rng, RATES);
  const r2 = pick(rng, RATES.filter((r) => r[0] * 1 !== r1[0] || r[1] !== r1[1]));
  const m1 = rat(r1[0], r1[1]);
  const m2 = rat(r2[0], r2[1]);

  // Two points on the first line, both on the grid, neither the origin.
  const x1 = r1[1] * int(rng, 1, 3);
  const x2 = x1 + r1[1] * int(rng, 1, 3);
  const y1 = mul(m1, rat(x1));
  const y2 = mul(m1, rat(x2));

  const correct: Rational = variant === "slope" ? m1 : m2;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "slope"
      ? bind("A line through the origin passes through ({{x1}}, {{y1}}) and ({{x2}}, {{y2}}). What is its SLOPE?", {
          x1: fmtInt(x1), y1: showNumber(y1), x2: fmtInt(x2), y2: showNumber(y2),
        })
      : variant === "vs-eq"
        ? bind("{{a}}'s graph goes through ({{x1}}, {{y1}}). {{b}} follows y = {{m2}}x. What is {{b}}'s rate, in {{unit}} per {{x}}?", {
            a: skin.a, x1: fmtInt(x1), y1: showNumber(y1), b: skin.b, m2: showNumber(m2),
            unit: skin.unit, x: skin.x,
          })
        : variant === "vs-table"
          ? bind("{{b}} logs {{list}}. What is its rate, in {{unit}} per {{x}}?", {
              b: skin.b, unit: skin.unit, x: skin.x,
              list: [1, 2, 3].map((k) => `(${k * r2[1]}, ${showNumber(mul(m2, rat(k * r2[1])))})`).join(" "),
            })
          : bind("{{b}}'s graph is a straight line through (0, 0) and (1, {{m2}}). What is its rate, in {{unit}} per {{x}}?", {
              b: skin.b, m2: showNumber(m2), unit: skin.unit, x: skin.x,
            });

  const prompt = {
    text,
    units: `${skin.unit} per ${skin.x}`,
    figure: {
      kind: "coordinate-plane" as const,
      series: [[[0, 0], [x2, y2.n / y2.d]]],
      max: Math.max(6, x2) + 1,
      maxY: Math.ceil((y2.n / y2.d) / 5) * 5 + 5,
      labels: [skin.x.toUpperCase(), skin.y.toUpperCase()],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "On a proportional graph the line goes through (0, 0), and its SLOPE is the unit rate.", math: "through (0, 0)" },
    { text: "Slope is RISE over RUN: the change in y divided by the change in x. Upside down gives the wrong rate entirely.", math: `(${showNumber(y2)} − ${showNumber(y1)}) ÷ (${fmtInt(x2)} − ${fmtInt(x1)}) = ${showNumber(m1)}` },
    { text: "To compare two of them, work out both rates as numbers. Do not judge by which line LOOKS steeper: the two graphs may not share a scale.", math: `${showNumber(m1)} against ${showNumber(m2)}` },
    { text: "The point (1, r) says what happens in one unit, and (0, 0) says nothing has happened yet.", math: `(1, ${showNumber(m2)})` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // run-over-rise: the slope taken upside down
    { tag: "run-over-rise", value: () => div0(rat(1), correct), when: correct.n !== 0 },
    // steeper-by-look: the other line's rate, chosen on appearance
    { tag: "steeper-by-look", value: variant === "slope" ? m2 : m1 },
    { tag: "run-over-rise", value: mul(correct, rat(2)) },
    { tag: "steeper-by-look", value: y1 },
  ];
  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${m1.n}/${m1.d}|${m2.n}/${m2.d}|${x1},${x2}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: showNumber(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, m1: `${m1.n}/${m1.d}`, m2: `${m2.n}/${m2.d}` },
  };
}
