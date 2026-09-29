// g.9.1 — Circles and circumference
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, fmtInt } from "../../engine/rational";
import {
  PI_314, piLabel, acceptPi, showNumber,
  diameterOf, circumferenceCoefficient, circleAreaCoefficient,
} from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.9.1";

type Variant =
  | "convert"       // radius to diameter and back                  (tier 1)
  | "circumference" // C from r or d                                (tier 2)
  | "reverse"       // r or d from C                                (tier 3)
  | "context";      // a full circle flown, or wheel rotations      (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["convert"],
  2: ["circumference", "convert"],
  3: ["reverse", "circumference"],
  4: ["context", "reverse"],
};

const SKINS = {
  holding: { thing: "the holding pattern", unit: "km", noun: "circle" },
  turn: { thing: "the turn", unit: "km", noun: "circle" },
  dish: { thing: "the radar dish", unit: "cm", noun: "rim" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the circle ----------------------------------------------------
  // The registry's range, in halves. Whole radii alone give this skill only a
  // hundred tier-1 cards — "halve it" and "double it" is a small question — and
  // a half-kilometre turn radius is a perfectly ordinary thing to write down.
  const radius = rat(int(rng, 1, 100), 2);
  const diameter = diameterOf(radius);
  const givenDiameter = rng() < 0.5;

  // "In terms of pi" or "use 3.14". An exact-pi answer is always a choice from
  // options: a keypad cannot type a Greek letter.
  const exact = rng() < 0.5;
  const coefficient = circumferenceCoefficient(radius);

  // Tier 4 flies the circle: one full lap is its circumference.
  const laps = int(rng, 2, 6);

  const correctCoefficient: Rational =
    variant === "convert" ? (givenDiameter ? radius : diameter)
      : variant === "reverse" ? (givenDiameter ? diameter : radius)
        : variant === "context" ? mul(coefficient, rat(laps))
          : coefficient;

  // A conversion and a reverse answer are plain lengths, not pi multiples.
  const isPiAnswer = variant === "circumference" || variant === "context";
  const correct: Rational = isPiAnswer && !exact ? mul(correctCoefficient, PI_314) : correctCoefficient;

  const show = (r: Rational): string =>
    (isPiAnswer && exact ? piLabel(r) : showNumber(r));
  const scaleOut = (c: Rational): Rational => (isPiAnswer && !exact ? mul(c, PI_314) : c);

  const note = !isPiAnswer ? "" : exact ? " Leave your answer in terms of π." : " Use π = 3.14.";

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "convert"
      ? (givenDiameter
          ? bind("{{thing}} has a diameter of {{d}} {{unit}}. What is its RADIUS?", { thing: `${skin.thing.charAt(0).toUpperCase()}${skin.thing.slice(1)}`, d: showNumber(diameter), unit: skin.unit })
          : bind("{{thing}} has a radius of {{r}} {{unit}}. What is its DIAMETER?", { thing: `${skin.thing.charAt(0).toUpperCase()}${skin.thing.slice(1)}`, r: showNumber(radius), unit: skin.unit }))
      : variant === "circumference"
        ? bind("{{thing}} has a {{which}} of {{v}} {{unit}}. What is its CIRCUMFERENCE?{{note}}", {
            thing: `${skin.thing.charAt(0).toUpperCase()}${skin.thing.slice(1)}`,
            which: givenDiameter ? "diameter" : "radius",
            v: showNumber(givenDiameter ? diameter : radius), unit: skin.unit, note,
          })
        : variant === "reverse"
          ? bind("{{thing}} measures {{c}} {{unit}} all the way round. What is its {{which}}?", {
              thing: `${skin.thing.charAt(0).toUpperCase()}${skin.thing.slice(1)}`,
              c: piLabel(coefficient), unit: skin.unit, which: givenDiameter ? "DIAMETER" : "RADIUS",
            })
          : bind("You fly {{n}} full laps of a circle of radius {{r}} {{unit}}. How far is that?{{note}}", {
              n: fmtInt(laps), r: showNumber(radius), unit: skin.unit, note,
            });

  const prompt = {
    text,
    units: skin.unit,
    figure: {
      kind: "circle-labelled" as const,
      which: givenDiameter && variant !== "reverse" ? "diameter" : "radius",
      label: variant === "reverse" ? "?" : showNumber(givenDiameter ? diameter : radius),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Sort out the radius and the diameter first. The diameter is twice the radius, so halve it if that is what you were given.", math: `r = ${showNumber(radius)}   d = ${showNumber(diameter)}` },
    { text: "Circumference is π × diameter, which is the same as 2 × π × radius. It is NOT π × radius.", math: `2 × π × ${showNumber(radius)} = ${piLabel(coefficient)}` },
    { text: "Decide which form is wanted. In terms of π, stop there. With π = 3.14, multiply it out.", math: exact ? piLabel(coefficient) : `${piLabel(coefficient)} = ${showNumber(mul(coefficient, PI_314))}` },
    { text: "Going backwards from a circumference, divide by π first, then that gives the diameter — halve it again for the radius.", math: `${piLabel(coefficient)} ÷ π = ${showNumber(diameter)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // c-equals-pi-r: C taken as pi r, which is half the answer
    { tag: "c-equals-pi-r", value: scaleOut(radius), when: variant === "circumference" },
    { tag: "c-equals-pi-r", value: scaleOut(mul(radius, rat(laps))), when: variant === "context" },
    { tag: "c-equals-pi-r", value: mul(correctCoefficient, rat(2)), when: variant === "convert" || variant === "reverse" },
    // c-vs-a: the area formula where the circumference was asked for
    { tag: "c-vs-a", value: scaleOut(circleAreaCoefficient(radius)), when: isPiAnswer },
    { tag: "c-vs-a", value: div0(correctCoefficient, rat(2)), when: !isPiAnswer },
    // r-d-swap: radius used where the diameter belongs, or the other way round
    { tag: "r-d-swap", value: scaleOut(mul(diameter, rat(2))), when: variant === "circumference" },
    { tag: "r-d-swap", value: scaleOut(mul(mul(diameter, rat(2)), rat(laps))), when: variant === "context" },
    { tag: "r-d-swap", value: mul(correctCoefficient, rat(4)), when: !isPiAnswer },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => show(v as Rational));

  return {
    skill: SKILL, tier, seed,
    // `exact` only changes the card when the answer is a pi multiple; folding it
    // in regardless would count one card as two and flatter the coverage test.
    hash: sha1(`${SKILL}|${tier}|${variant}|${radius.n}/${radius.d}|${givenDiameter}|${isPiAnswer ? exact : ""}|${variant === "context" ? laps : 0}`),
    format: isPiAnswer && exact ? "multiple-choice" : (rng() < 0.5 ? "numeric" : "multiple-choice"),
    prompt,
    answer: correct,
    answerText: show(correct),
    accept: isPiAnswer && exact ? acceptPi(correct) : acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, radius: radius.n, exact: String(exact) },
  };
}
