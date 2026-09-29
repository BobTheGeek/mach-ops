// g.9.2 — Areas of circles
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0 } from "../../engine/rational";
import {
  PI_314, piLabel, acceptPi, showNumber,
  diameterOf, circleAreaCoefficient, circumferenceCoefficient,
} from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.9.2";

type Variant =
  | "area"      // A from the radius                      (tier 1)
  | "from-d"    // A from the diameter, or a semicircle    (tier 2)
  | "reverse"   // the radius back out of an area          (tier 3)
  | "which";    // area or circumference, in context       (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["area"],
  2: ["from-d", "area"],
  3: ["reverse", "from-d"],
  4: ["which", "reverse"],
};

const SKINS = {
  sweep: { thing: "the radar sweep", unit: "km", area: "km²", covers: "ground covered" },
  flare: { thing: "the flare", unit: "m", area: "m²", covers: "ground lit" },
  pad: { thing: "the landing pad", unit: "m", area: "m²", covers: "pad surface" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "which" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the circle ----------------------------------------------------
  // The registry's range. Tier 3 works backwards from an area, so there the
  // radius has to be whole for the square root to come out; everywhere else it
  // runs in halves, because "area of a circle of whole radius up to 40" is only
  // forty cards and this skill is asked four ways.
  const radius = variant === "reverse" ? rat(int(rng, 2, 40)) : rat(int(rng, 1, 80), 2);
  const diameter = diameterOf(radius);
  const half = variant === "from-d" && rng() < 0.4;

  const exact = rng() < 0.5;
  const full = circleAreaCoefficient(radius);
  const coefficient = half ? mul(full, rat(1, 2)) : full;

  // Tier 4 asks which measurement the context actually needs.
  const wantsArea = rng() < 0.5;

  const correctCoefficient: Rational =
    variant === "reverse" ? radius
      : variant === "which" ? (wantsArea ? full : circumferenceCoefficient(radius))
        : coefficient;

  const isPiAnswer = variant !== "reverse";
  const correct: Rational = isPiAnswer && !exact ? mul(correctCoefficient, PI_314) : correctCoefficient;

  const show = (r: Rational): string => (isPiAnswer && exact ? piLabel(r) : showNumber(r));
  const scaleOut = (c: Rational): Rational => (isPiAnswer && !exact ? mul(c, PI_314) : c);
  const note = !isPiAnswer ? "" : exact ? " Leave your answer in terms of π." : " Use π = 3.14.";

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const text =
    variant === "area"
      ? bind("{{thing}} has a radius of {{r}} {{unit}}. What AREA does it cover?{{note}}", {
          thing: cap(skin.thing), r: showNumber(radius), unit: skin.unit, note,
        })
      : variant === "from-d"
        ? (half
            ? bind("{{thing}} covers a HALF circle of diameter {{d}} {{unit}}. What is its area?{{note}}", {
                thing: cap(skin.thing), d: showNumber(diameter), unit: skin.unit, note,
              })
            : bind("{{thing}} has a DIAMETER of {{d}} {{unit}}. What area does it cover?{{note}}", {
                thing: cap(skin.thing), d: showNumber(diameter), unit: skin.unit, note,
              }))
        : variant === "reverse"
          ? bind("{{thing}} covers {{a}} {{area}}. What is its RADIUS?", {
              thing: cap(skin.thing), a: piLabel(full), area: skin.area,
            })
          : (wantsArea
              ? bind("You need to know how much {{covers}} a radius of {{r}} {{unit}} gives you. Which is it?{{note}}", {
                  covers: skin.covers, r: showNumber(radius), unit: skin.unit, note,
                })
              : bind("You need to know how far it is AROUND the edge of a circle of radius {{r}} {{unit}}. Which is it?{{note}}", {
                  r: showNumber(radius), unit: skin.unit, note,
                }));

  const prompt = {
    text,
    units: wantsArea || variant !== "which" ? skin.area : skin.unit,
    figure: {
      kind: "circle-labelled" as const,
      which: variant === "from-d" && !half ? "diameter" : "radius",
      label: variant === "reverse" ? "?" : showNumber(variant === "from-d" && !half ? diameter : radius),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Get the RADIUS. If you were given the diameter, halve it before you do anything else.", math: `r = ${showNumber(radius)}` },
    { text: "Square the radius FIRST, then multiply by π. Squaring the whole of πr is a different number.", math: `${showNumber(radius)}² = ${showNumber(full)} → ${piLabel(full)}` },
    { text: "A half circle is half of that. Halve at the end, not the radius at the start.", math: `${piLabel(full)} ÷ 2 = ${piLabel(mul(full, rat(1, 2)))}` },
    { text: "Going backwards from an area, divide by π and then take the square root.", math: `${piLabel(full)} ÷ π = ${showNumber(full)} → r = ${showNumber(radius)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // Tier 4 is ABOUT telling area from circumference, so that foil goes first
    // or the option list fills up before it and the tier tests nothing.
    { tag: "a-equals-pi-d-squared", value: scaleOut(wantsArea ? circumferenceCoefficient(radius) : full), when: variant === "which" },
    // a-equals-pi-d-squared: the diameter squared, four times too big
    { tag: "a-equals-pi-d-squared", value: scaleOut(mul(diameter, diameter)), when: isPiAnswer },
    { tag: "a-equals-pi-d-squared", value: mul(radius, rat(2)), when: !isPiAnswer },
    // pi-r-squared-whole: (πr)², so the coefficient carries an extra pi
    { tag: "pi-r-squared-whole", value: scaleOut(mul(full, rat(3))), when: isPiAnswer },
    { tag: "pi-r-squared-whole", value: mul(radius, radius), when: !isPiAnswer },
    // forgot-square: pi times r, not r squared
    { tag: "forgot-square", value: scaleOut(radius), when: isPiAnswer },
    { tag: "forgot-square", value: div0(radius, rat(2)), when: !isPiAnswer },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => show(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${radius.n}/${radius.d}|${half}|${isPiAnswer ? exact : ""}|${variant === "which" ? wantsArea : ""}`),
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
