// g.10.5 — Volumes of pyramids
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0 } from "../../engine/rational";
import { showNumber, pyramidVolume, prismVolume } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.10.5";

type Variant =
  | "square"      // a square pyramid                          (tier 1)
  | "triangular"  // a pyramid on a triangular base             (tier 2)
  | "compare"     // pyramid against the prism it sits inside   (tier 3)
  | "missing";    // the height back out of a volume            (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["square"],
  2: ["triangular", "square"],
  3: ["compare", "triangular"],
  4: ["missing", "compare"],
};

const SKINS = {
  nose: { thing: "the nose cone", unit: "cm" },
  crate: { thing: "the ordnance crate", unit: "cm" },
  marker: { thing: "the marker cone", unit: "cm" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "missing" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the pyramid ----------------------------------------------------
  // The registry's ranges. The one third has to come out whole, so either the
  // base or the height carries the factor of three; forcing the height to be a
  // multiple of three on its own cost this skill two thirds of its cards.
  const triangular = variant === "triangular";
  const edge = rat(int(rng, 2, 20));
  const baseHeight = rat(int(rng, 1, 9) * 2);
  const rawHeight = int(rng, 2, 30);
  const baseDivisibleBy3 = triangular
    ? (edge.n * (int(rng, 1, 1))) % 3 === 0 || edge.n % 3 === 0
    : (edge.n * edge.n) % 3 === 0;
  const height = rat(baseDivisibleBy3 ? rawHeight : Math.min(30, Math.ceil(rawHeight / 3) * 3));
  // The slant is longer than the height: it is the distance up the sloping face,
  // and using it in a volume is the registry's own `slant-not-height` mistake.
  const slant = rat(height.n + int(rng, 2, 8));

  const baseArea = triangular ? mul(rat(1, 2), mul(edge, baseHeight)) : mul(edge, edge);
  const volume = pyramidVolume(baseArea, height);
  const prism = prismVolume(baseArea, height);

  const correct: Rational = variant === "missing" ? height : volume;

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const text =
    triangular
      ? bind("{{thing}} is a pyramid {{h}} {{unit}} tall on a TRIANGULAR base of width {{e}} {{unit}} and depth {{bh}} {{unit}}. What is its VOLUME?", {
          thing: cap(skin.thing), h: showNumber(height), unit: skin.unit, e: showNumber(edge), bh: showNumber(baseHeight),
        })
      : variant === "compare"
        ? bind("{{thing}} is a square pyramid of base edge {{e}} {{unit}} and height {{h}} {{unit}}. A box with the SAME base and height holds {{p}} cubic {{unit}}. What does the pyramid hold?", {
            thing: cap(skin.thing), e: showNumber(edge), h: showNumber(height), unit: skin.unit, p: showNumber(prism),
          })
        : variant === "missing"
          ? bind("{{thing}} is a square pyramid of base edge {{e}} {{unit}} holding {{v}} cubic {{unit}}. How TALL is it?", {
              thing: cap(skin.thing), e: showNumber(edge), unit: skin.unit, v: showNumber(volume),
            })
          : bind("{{thing}} is a square pyramid of base edge {{e}} {{unit}} and height {{h}} {{unit}}. What is its VOLUME?", {
              thing: cap(skin.thing), e: showNumber(edge), h: showNumber(height), unit: skin.unit,
            });

  const prompt = {
    text,
    units: `${skin.unit}³`,
    figure: {
      kind: "pour-demo" as const,
      solid: "SQUARE PYRAMID",
      marks: [
        { at: "width", label: showNumber(edge) },
        { at: "height", label: variant === "missing" ? "?" : showNumber(height) },
      ],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the base area first, the same way as for a prism.", math: `B = ${showNumber(baseArea)}` },
    { text: "Multiply by the HEIGHT — how tall the pyramid stands, straight up. Not the slant, which runs up the sloping face.", math: `${showNumber(baseArea)} × ${showNumber(height)} = ${showNumber(prism)}` },
    { text: "Now take a THIRD of it. A pyramid holds exactly one third of the box with the same base and height.", math: `${showNumber(prism)} ÷ 3 = ${showNumber(volume)}` },
    { text: "Going backwards, multiply the volume by 3 and then divide by the base area.", math: `${showNumber(volume)} × 3 ÷ ${showNumber(baseArea)} = ${showNumber(height)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // drop-third: Bh reported, the one third forgotten
    { tag: "drop-third", value: prism, when: variant !== "missing" },
    { tag: "drop-third", value: div0(height, rat(3)), when: variant === "missing" },
    // slant-not-height: the sloping measurement used for the vertical one
    { tag: "slant-not-height", value: pyramidVolume(baseArea, slant), when: variant !== "missing" },
    { tag: "slant-not-height", value: slant, when: variant === "missing" },
    { tag: "drop-third", value: mul(correct, rat(3)) },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${edge.n}|${height.n}|${triangular ? baseHeight.n : 0}`),
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
    params: { variant, skin: skinKey, edge: edge.n, height: height.n },
  };
}
