// h8.ee.c8a — Systems of two linear equations: how many solutions
// (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.c8a";

type Variant =
  | "graph"     // two lines drawn                           (tier 1)
  | "slope-int" // two equations already in y = mx + b        (tier 2)
  | "rearrange" // equations that need rearranging first      (tier 3)
  | "context";  // will two headings ever cross               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["graph"],
  2: ["slope-int", "graph"],
  3: ["rearrange", "slope-int"],
  4: ["context", "rearrange"],
};

const ANSWERS = ["ONE SOLUTION", "NO SOLUTION", "INFINITELY MANY SOLUTIONS"] as const;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);

  // --- 1. the two lines --------------------------------------------------
  // The registry asks for the three cases equally often, so the CASE is drawn
  // first and the lines built to fit it.
  const kase = pick(rng, [...ANSWERS]);
  const m1 = rat(int(rng, -3, 3));
  const b1 = rat(int(rng, -8, 8));
  const m2 = kase === "ONE SOLUTION"
    ? rat(int(rng, -3, 3) === m1.n ? m1.n + 1 : int(rng, -3, 3))
    : m1;
  const b2 = kase === "INFINITELY MANY SOLUTIONS" ? b1 : rat(b1.n + (kase === "NO SOLUTION" ? int(rng, 1, 6) : 0));
  // A "one solution" pair must really have different slopes.
  const slope2 = kase === "ONE SOLUTION" && m2.n === m1.n ? rat(m1.n + 1) : m2;

  // A flat line is "y = 3", not "y = 0x + 3".
  const eq = (m: typeof m1, b: typeof b1): string =>
    (m.n === 0
      ? `y = ${fmtInt(b.n)}`
      : `y = ${m.n === 1 ? "x" : m.n === -1 ? "−x" : `${fmtInt(m.n)}x`}${b.n === 0 ? "" : ` ${b.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(b.n))}`}`);
  // The rearrange tier states the second one as ax + by = c.
  const standard = `${fmtInt(-slope2.n)}x + y = ${fmtInt(b2.n)}`;

  const answer = kase;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "graph"
      ? bind("Two lines are drawn: {{a}} and {{b}}. How many solutions does the pair have?", {
          a: eq(m1, b1), b: eq(slope2, b2),
        })
      : variant === "slope-int"
        ? bind("{{a}} and {{b}}. How many solutions?", { a: eq(m1, b1), b: eq(slope2, b2) })
        : variant === "rearrange"
          ? bind("{{a}} and {{b}}. Rearrange the second one, then say how many solutions there are.", {
              a: eq(m1, b1), b: standard,
            })
          : bind("One aircraft holds {{a}} and another holds {{b}}, with x in minutes. How many points do their tracks SHARE?", {
              a: eq(m1, b1), b: eq(slope2, b2),
            });

  const prompt = {
    text,
    figure: {
      kind: "coordinate-plane-two-lines" as const,
      series: [
        [[-8, m1.n * -8 + b1.n], [8, m1.n * 8 + b1.n]],
        [[-8, slope2.n * -8 + b2.n], [8, slope2.n * 8 + b2.n]],
      ],
      max: 9, maxY: 20,
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Get both equations into y = mx + b. Until they are, you cannot compare them.", math: `${eq(m1, b1)}   ${eq(slope2, b2)}` },
    { text: "Compare the SLOPES. Different slopes means the lines lean differently, so they must cross exactly once.", math: `${showNumber(m1)} against ${showNumber(slope2)}` },
    { text: "Same slope, different b: parallel. They never meet, so there is NO solution — not one.", math: `b: ${showNumber(b1)} and ${showNumber(b2)}` },
    { text: "Same slope AND same b: it is the same line twice, so every point on it is a solution.", math: answer },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // parallel-one-solution: parallel lines taken to cross somewhere
    { tag: "parallel-one-solution", value: "ONE SOLUTION" },
    // same-slope-same-line: a shared slope taken to mean a shared line
    { tag: "same-slope-same-line", value: "INFINITELY MANY SOLUTIONS" },
    { tag: "parallel-one-solution", value: "NO SOLUTION" },
  ];
  const choice = buildChoice(rng, answer, candidates, (v: Answer) => String(v), 3);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${m1.n},${b1.n}|${slope2.n},${b2.n}`),
    format: "pick-one:one|none|infinite",
    prompt,
    answer,
    answerText: answer,
    accept: (input: Answer) => String(input).toUpperCase() === answer,
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, case: kase },
  };
}
