// h8.ee.a2 — Square and cube roots (Grade 8 honors, attached to Chapter 9)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul, div0 } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.a2";

type Variant =
  | "square"    // the square root of a perfect square    (tier 1)
  | "cube"      // the cube root of a perfect cube         (tier 2)
  | "solve"     // x² = p, x³ = p                          (tier 3)
  | "fraction"; // roots of fractions and decimals         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["square"],
  2: ["cube", "square"],
  3: ["solve", "cube"],
  4: ["fraction", "solve"],
};

const SKINS = {
  pad: { thing: "a square landing pad", measure: "area", unit: "m²", answer: "side" },
  cell: { thing: "a cubic fuel cell", measure: "volume", unit: "m³", answer: "edge" },
} as const;

type SkinKey = keyof typeof SKINS;

/** The registry's ranges: squares to 225 and cubes to 1,000. */
const ROOTS = Array.from({ length: 15 }, (_, i) => i + 1);
const CUBE_ROOTS = Array.from({ length: 10 }, (_, i) => i + 1);
/** Fractions and decimals whose roots are exact, which is what tier 4 asks for. */
const FRACTION_ROOTS: [number, number][] = [
  [1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10],
];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "fraction" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);

  // --- 1. the number and its root ----------------------------------------
  const isCube = variant === "cube" || (variant === "solve" && rng() < 0.5);
  const whole = isCube ? pick(rng, CUBE_ROOTS) : pick(rng, ROOTS);
  const power = isCube ? whole ** 3 : whole ** 2;

  // Asked bare or dressed in a landing pad. Both are the same arithmetic but
  // different cards, and this skill's fact set is small enough to need both.
  const bare = rng() < 0.45;
  const frac = pick(rng, FRACTION_ROOTS);
  const root: Rational = variant === "fraction" ? rat(frac[0], frac[1]) : rat(whole);
  const square = variant === "fraction" ? mul(root, root) : rat(power);

  const skin = SKINS[isCube ? "cell" : "pad"];
  void skinKey;

  const correct = root;

  // --- 2. prompt --------------------------------------------------------
  const symbol = isCube ? "∛" : "√";
  const text =
    variant === "solve"
      ? bind("Solve x{{p}} = {{v}} for a positive x.", { p: isCube ? "³" : "²", v: showNumber(square) })
      : variant === "fraction"
        ? bind("What is √{{v}}?", { v: showNumber(square) })
        : bare
          ? bind("What is {{sym}}{{v}}?", { sym: symbol, v: showNumber(square) })
          : bind("{{thing}} has {{measure}} {{v}} {{unit}}. What is its {{answer}}?", {
              thing: `${skin.thing.charAt(0).toUpperCase()}${skin.thing.slice(1)}`,
              measure: skin.measure, v: showNumber(square), unit: skin.unit, answer: skin.answer.toUpperCase(),
            });

  const prompt = {
    text,
    figure: {
      kind: "square-and-cube-models" as const,
      solid: isCube ? "CUBE" : "RECTANGULAR PRISM",
      marks: [{ at: "width", label: "?" }],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "√p asks: what number times ITSELF gives p? ∛p asks: what number times itself THREE times gives p?", math: `${symbol}${showNumber(square)}` },
    { text: "It is not halving or thirding. √16 is 4, because 4 × 4 = 16 — not 8.", math: "√16 = 4, not 8" },
    { text: "Work up through the ones you know: 1, 4, 9, 16, 25 ... and 1, 8, 27, 64, 125 ...", math: `${showNumber(root)} × ${showNumber(root)}${isCube ? ` × ${showNumber(root)}` : ""} = ${showNumber(square)}` },
    { text: "For a fraction, root the top and the bottom separately. √(1/4) is 1/2, because 1/2 × 1/2 = 1/4.", math: `√${showNumber(square)} = ${showNumber(root)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // halve-not-root: sqrt taken as "divide by two"
    { tag: "halve-not-root", value: div0(square, rat(2)), when: !isCube },
    // cube-third: cube root taken as "divide by three"
    { tag: "cube-third", value: div0(square, rat(3)), when: isCube },
    // root-of-sum: roots added rather than the sum rooted
    { tag: "root-of-sum", value: add(root, rat(1)) },
    { tag: "halve-not-root", value: mul(root, rat(2)) },
    { tag: "cube-third", value: square },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${isCube}|${square.n}/${square.d}|${variant === "square" || variant === "cube" ? bare : ""}`),
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
    params: { variant, isCube: String(isCube), value: `${square.n}/${square.d}` },
  };
}
