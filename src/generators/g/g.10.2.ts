// g.10.2 — Surface areas of cylinders
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul } from "../../engine/rational";
import {
  PI_314, piLabel, acceptPi, showNumber, diameterOf,
  cylinderSurfaceCoefficient, cylinderLateralCoefficient, circleAreaCoefficient,
} from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.10.2";

type Variant =
  | "surface"  // S from r and h                          (tier 1)
  | "from-d"   // S from the diameter                      (tier 2)
  | "lateral"  // the curved part alone                    (tier 3)
  | "label";   // the label that wraps round a drum        (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["surface"],
  2: ["from-d", "surface"],
  3: ["lateral", "from-d"],
  4: ["label", "lateral"],
};

const SKINS = {
  tank: { thing: "the external fuel tank", unit: "cm" },
  nacelle: { thing: "the engine nacelle", unit: "cm" },
  drum: { thing: "the fuel drum", unit: "cm" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "label" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the cylinder ---------------------------------------------------
  // The registry's ranges.
  const radius = rat(int(rng, 1, 15));
  const diameter = diameterOf(radius);
  const height = rat(int(rng, 1, 30));

  const exact = rng() < 0.5;
  const wholeSurface = cylinderSurfaceCoefficient(radius, height);
  const lateral = cylinderLateralCoefficient(radius, height);
  const coefficient = variant === "lateral" || variant === "label" ? lateral : wholeSurface;

  const correct: Rational = exact ? coefficient : mul(coefficient, PI_314);
  const show = (r: Rational): string => (exact ? piLabel(r) : showNumber(r));
  const scaleOut = (c: Rational): Rational => (exact ? c : mul(c, PI_314));
  const note = exact ? " Leave your answer in terms of π." : " Use π = 3.14.";

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const text =
    variant === "surface"
      ? bind("{{thing}} is a cylinder of radius {{r}} {{unit}} and height {{h}} {{unit}}. What is its TOTAL surface area?{{note}}", {
          thing: cap(skin.thing), r: showNumber(radius), h: showNumber(height), unit: skin.unit, note,
        })
      : variant === "from-d"
        ? bind("{{thing}} is a cylinder of DIAMETER {{d}} {{unit}} and height {{h}} {{unit}}. What is its TOTAL surface area?{{note}}", {
            thing: cap(skin.thing), d: showNumber(diameter), h: showNumber(height), unit: skin.unit, note,
          })
        : variant === "lateral"
          ? bind("{{thing}} is a cylinder of radius {{r}} {{unit}} and height {{h}} {{unit}}. What is the area of its CURVED side alone?{{note}}", {
              thing: cap(skin.thing), r: showNumber(radius), h: showNumber(height), unit: skin.unit, note,
            })
          : bind("A label wraps all the way round {{thing}}, which is {{r}} {{unit}} in radius and {{h}} {{unit}} tall. It covers no ends. How much label is that?{{note}}", {
              thing: skin.thing, r: showNumber(radius), h: showNumber(height), unit: skin.unit, note,
            });

  const prompt = {
    text,
    units: `${skin.unit}²`,
    figure: {
      kind: "can-label-net" as const,
      faces: [
        { x: 0, y: 0, w: 4, h: 1.2, label: "curved side" },
        { x: 0.6, y: 1.2, w: 1.2, h: 1.2, label: "base" },
        { x: 2.2, y: 1.2, w: 1.2, h: 1.2, label: "top" },
      ],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Unroll it. A cylinder flattens into TWO circles and one rectangle.", math: "2 circles + 1 rectangle" },
    { text: "The rectangle's width is the CIRCUMFERENCE of the circle, 2πr — not the diameter.", math: `2π × ${showNumber(radius)} = ${piLabel(mul(radius, rat(2)))}` },
    { text: "So the curved part is 2πrh, and the two ends are 2πr² between them.", math: `${piLabel(lateral)} + ${piLabel(mul(rat(2), circleAreaCoefficient(radius)))}` },
    { text: "Add them for the total, or stop at the curved part if that is all that was asked for.", math: `${piLabel(wholeSurface)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // diameter-as-width: the rectangle built on d rather than on 2 pi r
    { tag: "diameter-as-width", value: scaleOut(add(mul(rat(2), circleAreaCoefficient(radius)), mul(diameter, height))) },
    // one-circle: only one end counted
    { tag: "one-circle", value: scaleOut(add(circleAreaCoefficient(radius), lateral)), when: variant !== "lateral" && variant !== "label" },
    { tag: "one-circle", value: scaleOut(wholeSurface), when: variant === "lateral" || variant === "label" },
    { tag: "diameter-as-width", value: scaleOut(mul(lateral, rat(2))) },
    { tag: "one-circle", value: scaleOut(circleAreaCoefficient(radius)) },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => show(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${radius.n}|${height.n}|${exact}`),
    format: exact ? "multiple-choice" : (rng() < 0.5 ? "numeric" : "multiple-choice"),
    prompt,
    answer: correct,
    answerText: show(correct),
    accept: exact ? acceptPi(correct) : acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, radius: radius.n, height: height.n, exact: String(exact) },
  };
}
