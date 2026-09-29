// h8.g.c6 — Volume of cones, cylinders, and spheres
// (Grade 8 honors, attached to Chapter 10)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul } from "../../engine/rational";
import {
  PI_314, piLabel, acceptPi, showNumber, diameterOf,
  cylinderVolumeCoefficient, coneVolumeCoefficient, sphereVolumeCoefficient,
} from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.g.c6";

type Variant =
  | "cylinder"   // V = pi r squared h                       (tier 1)
  | "cone"       // a third of the cylinder                   (tier 2)
  | "sphere"     // 4/3 pi r cubed, and the hemisphere         (tier 3)
  | "composite"; // a cylinder with a cone on the nose         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["cylinder"],
  2: ["cone", "cylinder"],
  3: ["sphere", "cone"],
  4: ["composite", "sphere"],
};

const SKINS = {
  tank: { thing: "the external fuel tank", unit: "cm" },
  nose: { thing: "the nose cone", unit: "cm" },
  radome: { thing: "the radome", unit: "cm" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "composite" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the solid ------------------------------------------------------
  // The registry's ranges. A cone's height is a multiple of three so the one
  // third comes out whole.
  const radius = rat(int(rng, 1, 15));
  const diameter = diameterOf(radius);
  const height = rat(int(rng, 1, 10) * 3);
  const givenDiameter = rng() < 0.35;
  const halfSphere = variant === "sphere" && rng() < 0.4;

  const exact = rng() < 0.5;
  const cylinder = cylinderVolumeCoefficient(radius, height);
  const cone = coneVolumeCoefficient(radius, height);
  const sphere = sphereVolumeCoefficient(radius);

  const coefficient: Rational =
    variant === "cylinder" ? cylinder
      : variant === "cone" ? cone
        : variant === "sphere" ? (halfSphere ? mul(sphere, rat(1, 2)) : sphere)
          : add(cylinder, cone);

  const correct: Rational = exact ? coefficient : mul(coefficient, PI_314);
  const show = (r: Rational): string => (exact ? piLabel(r) : showNumber(r));
  const scaleOut = (c: Rational): Rational => (exact ? c : mul(c, PI_314));
  const note = exact ? " Leave your answer in terms of π." : " Use π = 3.14.";
  const size = givenDiameter
    ? `DIAMETER ${showNumber(diameter)} ${skin.unit}`
    : `radius ${showNumber(radius)} ${skin.unit}`;

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const text =
    variant === "cylinder"
      ? bind("{{thing}} is a cylinder of {{size}} and height {{h}} {{unit}}. What is its VOLUME?{{note}}", {
          thing: cap(skin.thing), size, h: showNumber(height), unit: skin.unit, note,
        })
      : variant === "cone"
        ? bind("{{thing}} is a cone of {{size}} and height {{h}} {{unit}}. What is its VOLUME?{{note}}", {
            thing: cap(skin.thing), size, h: showNumber(height), unit: skin.unit, note,
          })
        : variant === "sphere"
          ? bind("{{thing}} is {{what}} of {{size}}. What is its VOLUME?{{note}}", {
              thing: cap(skin.thing), what: halfSphere ? "a HALF sphere" : "a sphere", size, note,
            })
          : bind("{{thing}} is a cylinder of {{size}} and height {{h}} {{unit}} with a cone of the SAME base and height on the end. What do the two hold together?{{note}}", {
              thing: cap(skin.thing), size, h: showNumber(height), unit: skin.unit, note,
            });

  const prompt = {
    text,
    units: `${skin.unit}³`,
    figure: {
      kind: "solids-labelled" as const,
      solid: variant === "cone" ? "CONE" : "CYLINDER",
      marks: [
        { at: "radius", label: showNumber(radius) },
        ...(variant === "sphere" ? [] : [{ at: "height", label: showNumber(height) }]),
      ],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Get the RADIUS first. If you were given the diameter, halve it — using d for r makes the answer eight times too big for a sphere.", math: `r = ${showNumber(radius)}` },
    { text: "A cylinder is πr²h: the circle's area times how tall it stands.", math: `π × ${showNumber(radius)}² × ${showNumber(height)} = ${piLabel(cylinder)}` },
    { text: "A cone is a THIRD of the cylinder with the same base and height. Do not leave the third out.", math: `${piLabel(cylinder)} ÷ 3 = ${piLabel(cone)}` },
    { text: "A sphere is (4/3)πr³ — CUBED, not squared. A half sphere is half of that.", math: `(4/3)π × ${showNumber(radius)}³ = ${piLabel(sphere)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // drop-third: the cone's one third forgotten
    { tag: "drop-third", value: scaleOut(cylinder), when: variant === "cone" },
    { tag: "drop-third", value: scaleOut(mul(cylinder, rat(2))), when: variant === "composite" },
    { tag: "drop-third", value: scaleOut(mul(coefficient, rat(3))), when: variant !== "cone" && variant !== "composite" },
    // sphere-exponent: r squared where r cubed belongs
    { tag: "sphere-exponent", value: scaleOut(mul(rat(4, 3), mul(radius, radius))), when: variant === "sphere" },
    { tag: "sphere-exponent", value: scaleOut(mul(mul(radius, radius), radius)), when: variant !== "sphere" },
    // diameter-as-radius: d used as r, so eight times too big for a sphere
    { tag: "diameter-as-radius", value: scaleOut(mul(coefficient, rat(variant === "sphere" ? 8 : 4))) },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => show(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${radius.n}|${height.n}|${givenDiameter}|${halfSphere}|${exact}`),
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
