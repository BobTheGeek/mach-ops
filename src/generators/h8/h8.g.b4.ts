// h8.g.b4 — Apply the Pythagorean theorem to find a length
// (Grade 8 honors, attached to Chapter 9)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fmtInt } from "../../engine/rational";
import { TRIPLES, hypotenuse, otherLeg, toTenth, showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.g.b4";

type Variant =
  | "hyp"      // the long side from the two legs         (tier 1)
  | "leg"      // a leg from the hypotenuse and a leg      (tier 2)
  | "tenth"    // a result that is not whole               (tier 3)
  | "context"; // a diagonal or a flight path              (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["hyp"],
  2: ["leg", "hyp"],
  3: ["tenth", "leg"],
  4: ["context", "tenth"],
};

const SKINS = {
  run: { a: "east", b: "north", unit: "km", thing: "direct distance to the target" },
  hangar: { a: "long", b: "wide", unit: "m", thing: "diagonal across the hangar floor" },
  ramp: { a: "along the ground", b: "up", unit: "m", thing: "length of the ramp" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the triangle ---------------------------------------------------
  // Triples for the tiers that want a whole answer; free legs for the tier that
  // asks for one decimal place.
  const base = pick(rng, [...TRIPLES]);
  const scale = int(rng, 1, 8);
  const freeA = int(rng, 2, 20);
  const freeB = int(rng, 2, 20);

  const usesTriple = variant !== "tenth";
  const a = usesTriple ? base[0] * scale : freeA;
  const b = usesTriple ? base[1] * scale : freeB;
  const c = usesTriple ? base[2] * scale : hypotenuse(freeA, freeB);

  const findsLeg = variant === "leg" || (variant === "context" && rng() < 0.4);

  const correct: Rational = findsLeg
    ? (usesTriple ? rat(Math.round(otherLeg(c, a))) : toTenth(otherLeg(c, a)))
    : (usesTriple ? rat(Math.round(c)) : toTenth(c));

  const rounded = !usesTriple;

  // --- 2. prompt --------------------------------------------------------
  const note = rounded ? " Give your answer to the nearest tenth." : "";
  // The context tier keeps its context whichever side is missing: a card that
  // opens "you fly 41 km" and then reverts to "a right triangle has" is two
  // questions stapled together.
  const text =
    variant === "context"
      ? (findsLeg
          ? bind("The target is {{c}} {{unit}} away in a straight line. You have gone {{a}} {{unit}} {{da}}. How far {{db}} is it from here?{{note}}", {
              c: showNumber(rat(Math.round(c))), a: fmtInt(a), unit: skin.unit, da: skin.a, db: skin.b, note,
            })
          : bind("You fly {{a}} {{unit}} {{da}}, then {{b}} {{unit}} {{db}}. What is the {{thing}}?{{note}}", {
              a: fmtInt(a), unit: skin.unit, da: skin.a, b: fmtInt(b), db: skin.b, thing: skin.thing, note,
            }))
      : findsLeg
        ? bind("A right triangle has a longest side of {{c}} {{unit}} and one leg of {{a}} {{unit}}. How long is the OTHER leg?{{note}}", {
            c: showNumber(rat(Math.round(c))), a: fmtInt(a), unit: skin.unit, note,
          })
        : bind("A right triangle has legs of {{a}} and {{b}} {{unit}}. How long is the HYPOTENUSE?{{note}}", {
            a: fmtInt(a), b: fmtInt(b), unit: skin.unit, note,
          });

  const prompt = {
    text,
    units: skin.unit,
    figure: {
      kind: "right-triangle-labelled" as const,
      a, b,
      labelA: fmtInt(a),
      labelB: findsLeg ? "?" : fmtInt(b),
      labelC: findsLeg ? showNumber(rat(Math.round(c))) : "?",
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Spot the hypotenuse: it is opposite the right angle and it is the longest side. Everything else is a leg.", math: `c = ${showNumber(rat(Math.round(c)))}` },
    { text: "For the hypotenuse, square both legs and ADD: c² = a² + b².", math: `${a}² + ${b}² = ${fmtInt(a * a + b * b)}` },
    { text: "For a leg, square the hypotenuse and SUBTRACT the leg you have: a² = c² − b². Adding there gives a leg longer than the hypotenuse, which cannot happen.", math: `${Math.round(c)}² − ${a}² = ${fmtInt(Math.round(c) ** 2 - a * a)}` },
    { text: "Take the square root at the END. c² is not c.", math: `√ → ${showNumber(correct)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const squareSum = rat(a * a + b * b);
  const candidates: Candidate[] = [
    // no-root: c squared reported as if it were c
    { tag: "no-root", value: findsLeg ? rat(Math.round(c) ** 2 - a * a) : squareSum },
    // add-for-leg: added when solving for a leg, so the answer is too big
    { tag: "add-for-leg", value: toTenth(hypotenuse(Math.round(c), a)), when: findsLeg },
    { tag: "add-for-leg", value: rat(a + b), when: !findsLeg },
    { tag: "no-root", value: rat(a + Math.round(c)), when: findsLeg },
    { tag: "add-for-leg", value: rat(Math.round(c) - a), when: findsLeg },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a},${b}|${findsLeg}`),
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
    params: { variant, skin: skinKey, a, b, findsLeg: String(findsLeg) },
  };
}
