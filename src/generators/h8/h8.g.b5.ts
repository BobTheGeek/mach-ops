// h8.g.b5 — Distance between points on a coordinate plane
// (Grade 8 honors, attached to Chapter 9)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, fmtInt } from "../../engine/rational";
import { TRIPLES, hypotenuse, toTenth, showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.g.b5";

type Variant =
  | "straight"   // a horizontal or vertical gap             (tier 1)
  | "quadrant"   // two points, both positive                 (tier 2)
  | "negative"   // across the axes, with negative numbers    (tier 3)
  | "perimeter"; // three points, all the way round           (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["straight"],
  2: ["quadrant", "straight"],
  3: ["negative", "quadrant"],
  4: ["perimeter", "negative"],
};

const SKINS = {
  contacts: { noun: "two radar contacts" },
  waypoints: { noun: "two waypoints" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "perimeter" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the points -----------------------------------------------------
  // The registry's grid. A triple for the legs keeps the distance whole, which
  // is what the first three tiers want; the grid is only 20 across, so the
  // triple is used unscaled.
  const triple = pick(rng, TRIPLES.filter((t) => t[0] <= 12 && t[1] <= 12));
  // A straight gap needs no triple at all — any whole distance will do — and
  // forcing one there collapsed most of tier 1 onto a handful of cards.
  const dx = variant === "straight" ? int(rng, 2, 14) : triple[0];
  const dy = variant === "straight" ? int(rng, 2, 14) : triple[1];
  // Signed, so the second point can sit left of or below the first. Unsigned,
  // half the grid was unreachable and the negative tier never had to subtract
  // a negative.
  const signX = rng() < 0.5 ? 1 : -1;
  const signY = rng() < 0.5 ? 1 : -1;
  const horizontal = rng() < 0.5;

  const lo = variant === "negative" ? -10 : 0;
  const hi = 10;
  const clamp = (v: number): number => Math.max(lo, Math.min(hi, v));
  const x1 = int(rng, lo, hi);
  const y1 = int(rng, lo, hi);
  const p1: [number, number] = [x1, y1];
  const p2: [number, number] = variant === "straight"
    ? (horizontal ? [clamp(x1 + signX * dx), y1] : [x1, clamp(y1 + signY * dy)])
    : [clamp(x1 + signX * dx), clamp(y1 + signY * dy)];

  // Tier 4's third point closes a right triangle, so the perimeter is whole.
  const p3: [number, number] = [p2[0], p1[1]];

  const legX = Math.abs(p2[0] - p1[0]);
  const legY = Math.abs(p2[1] - p1[1]);
  const distance = hypotenuse(legX, legY);

  const correct: Rational =
    variant === "straight" ? rat(legX + legY)
      : variant === "perimeter" ? rat(legX + legY + Math.round(distance))
        : (Number.isInteger(distance) ? rat(distance) : toTenth(distance));

  const pt = (p: [number, number]): string => `(${fmtInt(p[0])}, ${fmtInt(p[1])})`;
  // Clamping the second point to the grid can knock the legs off a triple, and
  // then the distance is not whole. The card has to SAY so before it asks.
  const rounded = variant !== "straight" && variant !== "perimeter" && !Number.isInteger(distance);
  const note = rounded ? " Give your answer to the nearest tenth." : "";

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "straight"
      ? bind("{{noun}} sit at {{a}} and {{b}} on the tactical grid. How far apart are they?", {
          noun: `${skin.noun.charAt(0).toUpperCase()}${skin.noun.slice(1)}`, a: pt(p1), b: pt(p2),
        })
      : variant === "perimeter"
        ? bind("Three waypoints sit at {{a}}, {{b}} and {{c}}. How far is it all the way round the triangle?", {
            a: pt(p1), b: pt(p3), c: pt(p2),
          })
        : bind("{{noun}} sit at {{a}} and {{b}}. How far apart are they?{{note}}", {
            noun: `${skin.noun.charAt(0).toUpperCase()}${skin.noun.slice(1)}`, a: pt(p1), b: pt(p2), note,
          });

  const prompt = {
    text,
    figure: {
      kind: "coordinate-plane-right-triangle" as const,
      series: [[p1, p3, p2].map((p) => [p[0], p[1]])],
      max: Math.max(10, p1[0], p2[0]) + 1,
      maxY: Math.max(10, p1[1], p2[1]) + 1,
      labels: ["X", "Y"],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Draw the right triangle between the two points: across, then up. The two points are the ends of the sloping side.", math: `${pt(p1)} → ${pt(p2)}` },
    { text: "The legs are the DIFFERENCES: how far across in x, and how far up in y. Take them as distances, so never negative.", math: `|${p2[0]} − ${p1[0]}| = ${legX}   |${p2[1]} − ${p1[1]}| = ${legY}` },
    { text: "Watch the negatives. 3 − (−4) is 7, not −1: subtracting a negative moves you further, not less.", math: `legs ${legX} and ${legY}` },
    { text: "Now it is Pythagoras: square the legs, add, and take the square root. One leg on its own is not the distance.", math: `√(${legX}² + ${legY}²) = ${showNumber(rat(Math.round(distance)))}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // subtract-coordinates-only: one leg reported as the distance
    { tag: "subtract-coordinates-only", value: rat(Math.max(legX, legY)), when: variant !== "straight" },
    { tag: "subtract-coordinates-only", value: rat(Math.max(legX, legY) + 1), when: variant === "straight" },
    // sign-in-difference: the coordinates subtracted the wrong way round
    { tag: "sign-in-difference", value: rat(Math.abs(legX - legY)) },
    { tag: "subtract-coordinates-only", value: rat(legX + legY), when: variant !== "straight" },
    { tag: "sign-in-difference", value: add(correct, rat(legX)) },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${pt(p1)}|${pt(p2)}`),
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
    params: { variant, skin: skinKey, p1: pt(p1), p2: pt(p2) },
  };
}
