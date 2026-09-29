// rp.5.6 — Scale drawings
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, add, fromDecimal, fmtFraction, isTerminating, fmtDecimal } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.5.6";

type Variant =
  | "to-actual"   // drawing length to real length          (tier 1)
  | "to-drawing"  // real length to drawing length          (tier 2)
  | "area"        // area scales by the factor SQUARED      (tier 3)
  | "compare";    // two scales compared                    (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["to-actual"],
  2: ["to-drawing", "to-actual"],
  3: ["area", "to-drawing"],
  4: ["compare", "area"],
};

/** The registry's scales. */
const MAP_SCALES = [5, 10, 20, 25, 40, 50] as const;      // 1 cm : n km
// The registry names 1:48, 1:72 and 1:144; the rest are the other scales model
// kits are actually sold at, and they widen a comparison space of nine to one
// the no-repeat guard can work with.
const MODEL_SCALES = [32, 35, 48, 72, 100, 144, 200, 350] as const;   // 1 : n

const SKINS = {
  tactical: {
    drawing: "cm", actual: "km", unit: "KM",
    q: "The tactical map is {{scale}}. A leg measures {{len}} cm on the map. How far is it really?",
    back: "The tactical map is {{scale}}. A leg is really {{len}} km. How long is it on the map?",
    area: "The tactical map is {{scale}}. A search box measures {{len}} cm² on the map. What is its real area?",
  },
  blueprint: {
    drawing: "cm", actual: "km", unit: "KM",
    q: "The hangar blueprint is {{scale}}. A bay measures {{len}} cm on the plan. How long is it really?",
    back: "The hangar blueprint is {{scale}}. A bay is really {{len}} km. How long is it on the plan?",
    area: "The hangar blueprint is {{scale}}. A bay measures {{len}} cm² on the plan. What is its real area?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "compare" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the scale and the measurement --------------------------
  const unitless = variant === "compare" || rng() < 0.25;
  const factorValue = unitless ? pick(rng, MODEL_SCALES) : pick(rng, MAP_SCALES);
  const factor = rat(factorValue);
  const scaleText = unitless ? `1 : ${factorValue}` : `1 cm : ${factorValue} km`;

  const drawingLength: Rational = variant === "area"
    ? rat(int(rng, 2, 9))
    : fromDecimal(int(rng, 5, 120) / 10, 1);

  const actualLength = mul(drawingLength, factor);
  const actualArea = mul(drawingLength, mul(factor, factor));

  const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

  // The compare variant asks which scale gives the bigger real object.
  const otherValue = pick(rng, MODEL_SCALES.filter((v) => v !== factorValue));
  const mineIsBigger = factorValue > otherValue;

  const correct = variant === "to-drawing" ? div0(drawingLength, factor)
    : variant === "area" ? actualArea
      : actualLength;

  // --- 2. prompt --------------------------------------------------------
  const template = variant === "to-drawing" ? skin.back : variant === "area" ? skin.area : skin.q;
  const prompt = {
    text: variant === "compare"
      ? bind("Model A is built at 1 : {{a}} and model B at 1 : {{b}}. From the same drawing, which model is the larger real object?", {
          a: String(factorValue), b: String(otherValue),
        })
      : bind(template, { scale: scaleText, len: show(drawingLength) }),
    units: variant === "area" ? `${skin.actual}²` : variant === "to-drawing" ? skin.drawing.toUpperCase() : skin.unit,
    figure: {
      kind: "scale-bar" as const,
      labels: [scaleText, show(drawingLength), show(correct)],
      rows: [["SCALE", scaleText], ["DRAWING", show(drawingLength)], ["ACTUAL", show(correct)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Read the scale as a ratio: drawing to actual. That number is the scale factor.", math: scaleText },
    { text: "Going from the drawing to the real thing, multiply. Going the other way, divide.", math: `${show(drawingLength)} × ${factorValue}` },
    {
      text: variant === "area"
        ? "Area scales by the factor SQUARED, because both sides grow. Multiply by the factor twice."
        : "Lengths scale by the factor once.",
      math: variant === "area" ? `× ${factorValue} × ${factorValue}` : `× ${factorValue}`,
    },
    { text: "Write the answer with its units.", math: `${show(correct)} ${variant === "area" ? `${skin.actual}²` : skin.actual}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // area-linear: scales area by k instead of k squared
    { tag: "area-linear", value: mul(drawingLength, factor), when: variant === "area" },
    // inverted-scale: divides when it should multiply, or the reverse
    { tag: "inverted-scale", value: () => div0(drawingLength, factor), when: variant !== "to-drawing" },
    { tag: "inverted-scale", value: mul(drawingLength, factor), when: variant === "to-drawing" },
    // additive: adds the scale instead of multiplying
    { tag: "additive", value: add(drawingLength, factor) },
  ];

  const fmt = (v: Answer): string => show(v as Rational);

  if (variant === "compare") {
    const options = [`1 : ${factorValue}`, `1 : ${otherValue}`];
    const correctIndex = mineIsBigger ? 0 : 1;
    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${factorValue}|${otherValue}`),
      format: "pick-one:scale",
      prompt,
      answer: options[correctIndex]!,
      answerText: options[correctIndex]!,
      accept: (input: Answer) => input === options[correctIndex],
      distractors: [{ tag: "inverted-scale", value: options[1 - correctIndex]! }],
      options,
      optionText: options,
      correctIndex,
      worked,
      errorTagsByAnswer: { [options[1 - correctIndex]!]: "inverted-scale" },
      params: { variant, skin: skinKey, factor: factorValue, other: otherValue },
    };
  }

  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${factorValue}|${drawingLength.n}/${drawingLength.d}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, factor: factorValue, len: `${drawingLength.n}/${drawingLength.d}` },
  };
}
