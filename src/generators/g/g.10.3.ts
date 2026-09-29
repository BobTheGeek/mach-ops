// g.10.3 — Surface areas of pyramids
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul } from "../../engine/rational";
import { showNumber, pyramidSurface, pyramidLateral } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.10.3";

type Variant =
  | "square"      // a square pyramid from its net           (tier 1)
  | "triangular"  // a pyramid on a triangular base           (tier 2)
  | "lateral"     // the sloping faces only                   (tier 3)
  | "which";      // slant height or height: which is which   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["square"],
  2: ["triangular", "square"],
  3: ["lateral", "triangular"],
  4: ["which", "lateral"],
};

const SKINS = {
  radome: { thing: "the radar cone housing", unit: "m" },
  tent: { thing: "the tent hangar", unit: "m" },
  marker: { thing: "the target marker", unit: "m" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "which" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the pyramid ----------------------------------------------------
  // The registry's ranges. The triangular base's own height is the even one, so
  // half base times height stays whole without halving the edge choices.
  const triangular = variant === "triangular";
  const edge = rat(int(rng, 2, 20));
  const slant = rat(int(rng, 3, 25));
  // The height is always shorter than the slant, which is the whole point of the
  // distinction the registry asks the player to make.
  const height = rat(Math.max(2, slant.n - int(rng, 1, Math.max(1, slant.n - 2))));

  // A square base, or an equilateral-looking triangle with a stated base height.
  const baseHeight = rat(int(rng, 1, 9) * 2);
  const baseArea = triangular ? mul(rat(1, 2), mul(edge, baseHeight)) : mul(edge, edge);
  const basePerimeter = triangular ? mul(edge, rat(3)) : mul(edge, rat(4));

  const surface = pyramidSurface(baseArea, basePerimeter, slant);
  const lateral = pyramidLateral(basePerimeter, slant);

  const correct: Rational = variant === "lateral" ? lateral : surface;

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const text =
    triangular
      ? bind("{{thing}} is a pyramid on a TRIANGULAR base of side {{e}} {{unit}} and base height {{bh}} {{unit}}. Its slant height is {{s}} {{unit}}. What is its SURFACE AREA?", {
          thing: cap(skin.thing), e: showNumber(edge), bh: showNumber(baseHeight), s: showNumber(slant), unit: skin.unit,
        })
      : variant === "lateral"
        ? bind("{{thing}} is a square pyramid of base edge {{e}} {{unit}} and slant height {{s}} {{unit}}. What is the area of its SLOPING FACES alone?", {
            thing: cap(skin.thing), e: showNumber(edge), s: showNumber(slant), unit: skin.unit,
          })
        : variant === "which"
          ? bind("{{thing}} is a square pyramid of base edge {{e}} {{unit}}. It stands {{h}} {{unit}} tall and its sloping face measures {{s}} {{unit}} from base to tip. What is its SURFACE AREA?", {
              thing: cap(skin.thing), e: showNumber(edge), h: showNumber(height), s: showNumber(slant), unit: skin.unit,
            })
          : bind("{{thing}} is a square pyramid of base edge {{e}} {{unit}} and slant height {{s}} {{unit}}. What is its SURFACE AREA?", {
              thing: cap(skin.thing), e: showNumber(edge), s: showNumber(slant), unit: skin.unit,
            });

  const prompt = {
    text,
    units: `${skin.unit}²`,
    figure: {
      kind: "net" as const,
      faces: triangular
        ? [{ x: 1, y: 1, w: 2, h: 2, label: "base" },
           { x: 1, y: 0, w: 2, h: 1 }, { x: 0, y: 1, w: 1, h: 2 }, { x: 3, y: 1, w: 1, h: 2 }]
        : [{ x: 1, y: 1, w: 2, h: 2, label: "base" },
           { x: 1, y: 0, w: 2, h: 1 }, { x: 1, y: 3, w: 2, h: 1 },
           { x: 0, y: 1, w: 1, h: 2 }, { x: 3, y: 1, w: 1, h: 2 }],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "A pyramid's net is one base plus a ring of triangles. Count the triangles: a square base has four, a triangular base has three.", math: triangular ? "1 base + 3 triangles" : "1 base + 4 triangles" },
    { text: "Work out the base area on its own first.", math: `B = ${showNumber(baseArea)}` },
    { text: "Each sloping triangle uses the SLANT height, the distance up the face — not the pyramid's vertical height.", math: `slant ${showNumber(slant)}${variant === "which" ? `, not height ${showNumber(height)}` : ""}` },
    { text: "The sloping faces come to half the base perimeter times the slant. Add the base back on for the total.", math: `${showNumber(baseArea)} + ½ × ${showNumber(basePerimeter)} × ${showNumber(slant)} = ${showNumber(surface)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // height-not-slant: the vertical height used on the sloping faces
    { tag: "height-not-slant", value: add(baseArea, pyramidLateral(basePerimeter, height)), when: variant !== "lateral" },
    { tag: "height-not-slant", value: pyramidLateral(basePerimeter, height), when: variant === "lateral" },
    // missing-base: the base left off the total
    { tag: "missing-base", value: lateral, when: variant !== "lateral" },
    { tag: "missing-base", value: surface, when: variant === "lateral" },
    { tag: "height-not-slant", value: add(correct, baseArea) },
    { tag: "missing-base", value: sub(correct, baseArea), when: correct.n > baseArea.n },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${edge.n}|${slant.n}|${triangular ? baseHeight.n : 0}|${variant === "which" ? height.n : 0}`),
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
    params: { variant, skin: skinKey, edge: edge.n, slant: slant.n },
  };
}
