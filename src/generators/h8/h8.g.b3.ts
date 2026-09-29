// h8.g.b3 — Model of the Pythagorean theorem (Grade 8 honors, attached to Chapter 9)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { TRIPLES, isRightTriangle } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.g.b3";

type Variant =
  | "name"     // which side is the hypotenuse             (tier 1)
  | "check"    // do the two squares add to the third       (tier 2)
  | "converse" // is this triangle right-angled at all      (tier 3)
  | "model";   // what the squares on the sides mean        (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["name"],
  2: ["check", "name"],
  3: ["converse", "check"],
  4: ["model", "converse"],
};

const SKINS = {
  climb: { a: "ground distance", b: "altitude gained", c: "flight path" },
  intercept: { a: "east leg", b: "north leg", c: "direct run" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "model" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the triangle ---------------------------------------------------
  // A real triple, or one nudged off it. Half and half, so "is it right-angled"
  // is a question rather than a habit.
  const base = pick(rng, [...TRIPLES]);
  const scale = int(rng, 1, 6);
  const right = rng() < 0.5;
  const nudge = pick(rng, [-2, -1, 1, 2]);
  const a = base[0] * scale;
  const b = base[1] * scale;
  const c = base[2] * scale + (right ? 0 : nudge);
  const isRight = isRightTriangle(a, b, c);

  const squares = { a: a * a, b: b * b, c: c * c };

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "name"
      ? bind("A right triangle has legs of {{a}} and {{b}} and a longest side of {{c}}. Which one is the HYPOTENUSE?", {
          a: fmtInt(a), b: fmtInt(b), c: fmtInt(base[2] * scale),
        })
      : variant === "check"
        ? bind("Squares are drawn on all three sides of a right triangle with legs {{a}} and {{b}}. The two leg squares are {{sa}} and {{sb}}. What is the square on the LONGEST side?", {
            a: fmtInt(a), b: fmtInt(b), sa: fmtInt(squares.a), sb: fmtInt(squares.b),
          })
        : variant === "converse"
          ? bind("A triangle has sides {{a}}, {{b}} and {{c}}. Is it a RIGHT triangle?", {
              a: fmtInt(a), b: fmtInt(b), c: fmtInt(c),
            })
          : bind("On a right triangle with legs {{a}} and {{b}}, squares are drawn on every side. What does the picture SHOW?", {
              a: fmtInt(a), b: fmtInt(b),
            });

  const prompt = {
    text,
    figure: {
      kind: "squares-on-sides" as const,
      a, b,
      labelA: fmtInt(a), labelB: fmtInt(b),
      labelC: variant === "check" ? "?" : fmtInt(variant === "converse" ? c : base[2] * scale),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the right angle. The side OPPOSITE it is the hypotenuse, and it is always the longest of the three.", math: `hypotenuse = ${fmtInt(base[2] * scale)}` },
    { text: "The other two sides are the legs. Square each of them: that is the area of the square drawn on that side.", math: `${a}² = ${fmtInt(squares.a)}   ${b}² = ${fmtInt(squares.b)}` },
    { text: "The two leg squares ADD UP to the square on the hypotenuse. That is what the picture is showing you.", math: `${fmtInt(squares.a)} + ${fmtInt(squares.b)} = ${fmtInt(squares.a + squares.b)}` },
    { text: "Read it backwards too: if a² + b² comes to c², the triangle IS right-angled. If it does not, it is not.", math: isRight ? `= ${fmtInt(c * c)} → right` : `≠ ${fmtInt(c * c)} → not right` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${a},${b},${c}`);

  // --- 4. the check is a number -----------------------------------------
  if (variant === "check") {
    const correct = rat(squares.a + squares.b);
    const candidates: Candidate[] = [
      // add-sides-unsquared: sides added without squaring first
      { tag: "add-sides-unsquared", value: rat(a + b) },
      // leg-as-c: the hypotenuse square taken for one of the legs
      { tag: "leg-as-c", value: rat(Math.abs(squares.b - squares.a)) },
      { tag: "add-sides-unsquared", value: rat((a + b) * (a + b)) },
    ];
    const choice = buildChoice(rng, correct, candidates, (v: Answer) => fmtInt((v as { n: number }).n));
    return {
      skill: SKILL, tier, seed, hash,
      format: rng() < 0.5 ? "numeric" : "multiple-choice",
      prompt,
      answer: correct,
      answerText: fmtInt(correct.n),
      accept: acceptRational(correct),
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, sides: `${a},${b},${c}` },
    };
  }

  // --- 5. the converse is yes or no -------------------------------------
  if (variant === "converse") {
    const answer = isRight ? "YES" : "NO";
    const foil = isRight ? "NO" : "YES";
    const options = ["YES", "NO"];
    return {
      skill: SKILL, tier, seed, hash,
      format: "yes-no",
      prompt,
      answer,
      answerText: answer,
      accept: (input: Answer) => String(input).toUpperCase() === answer,
      distractors: [{ tag: "add-sides-unsquared", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(answer),
      worked,
      errorTagsByAnswer: { [foil]: "add-sides-unsquared" },
      params: { variant, skin: skinKey, sides: `${a},${b},${c}` },
    };
  }

  // --- 6. naming and reading the model ----------------------------------
  const longest = fmtInt(base[2] * scale);
  const right1 = variant === "name"
    ? `THE ${longest} SIDE — THE ${skin.c.toUpperCase()}`
    : `THE TWO SMALL SQUARES TOGETHER COVER THE BIG ONE`;
  const candidates: Candidate[] = variant === "name"
    ? [
        // leg-as-c: a leg named as the hypotenuse
        { tag: "leg-as-c", value: `THE ${fmtInt(a)} SIDE — THE ${skin.a.toUpperCase()}` },
        { tag: "leg-as-c", value: `THE ${fmtInt(b)} SIDE — THE ${skin.b.toUpperCase()}` },
        { tag: "add-sides-unsquared", value: `THE SHORTEST SIDE, WHICHEVER IT IS` },
      ]
    : [
        { tag: "add-sides-unsquared", value: "THE THREE SIDES ADD UP TO THE LONGEST ONE" },
        { tag: "leg-as-c", value: "THE BIG SQUARE IS TWICE EITHER SMALL ONE" },
        { tag: "add-sides-unsquared", value: "ALL THREE SQUARES ARE THE SAME SIZE" },
      ];

  const choice = buildChoice(rng, right1, candidates, (v: Answer) => String(v));

  return {
    skill: SKILL, tier, seed, hash,
    format: "multiple-choice",
    prompt,
    answer: right1,
    answerText: right1,
    accept: (input: Answer) => String(input) === right1,
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, sides: `${a},${b},${c}` },
  };
}
