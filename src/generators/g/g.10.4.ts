// g.10.4 — Volumes of prisms
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul, div0 } from "../../engine/rational";
import { showNumber, boxSurface, boxVolume, prismVolume } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.10.4";

type Variant =
  | "box"       // V = Bh on a rectangular prism        (tier 1)
  | "shaped"    // a triangular or trapezoidal prism     (tier 2)
  | "missing"   // one dimension back out of a volume    (tier 3)
  | "compare";  // two tanks, or volume against area     (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["box"],
  2: ["shaped", "box"],
  3: ["missing", "shaped"],
  4: ["compare", "missing"],
};

const SKINS = {
  tank: { thing: "the fuel tank", unit: "m", holds: "litres of fuel" },
  bay: { thing: "the cargo bay", unit: "m", holds: "cubic metres" },
  hangar: { thing: "the hangar", unit: "m", holds: "cubic metres" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "compare" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the prism ------------------------------------------------------
  // The registry's range, with halves at tier 3 as it asks for.
  const half = variant === "missing" && rng() < 0.35;
  const box = {
    l: half ? rat(int(rng, 3, 40), 2) : rat(int(rng, 2, 30)),
    w: rat(int(rng, 2, 30)),
    h: rat(int(rng, 2, 30)),
  };

  // A triangular or trapezoidal cross-section, given its own measurements.
  const triangular = variant === "shaped" && rng() < 0.5;
  const baseA = rat(int(rng, 1, 12) * 2);
  const baseB = rat(int(rng, 1, 12) * 2);
  const baseH = rat(int(rng, 2, 16));
  const shapedBase = triangular
    ? mul(rat(1, 2), mul(baseA, baseH))
    : mul(rat(1, 2), mul(add(baseA, baseB), baseH));
  const length = rat(int(rng, 2, 25));

  const volume = variant === "shaped" ? prismVolume(shapedBase, length) : boxVolume(box);
  const surface = boxSurface(box);

  // Tier 4 compares two tanks.
  const other = { l: rat(int(rng, 2, 30)), w: rat(int(rng, 2, 30)), h: rat(int(rng, 2, 30)) };
  const otherVolume = boxVolume(other);
  const wantsArea = variant === "compare" && rng() < 0.5;

  const correct: Rational =
    variant === "missing" ? box.h
      : variant === "compare" ? (wantsArea ? surface : volume)
        : volume;

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const text =
    variant === "box"
      ? bind("{{thing}} measures {{l}} by {{w}} by {{h}} {{unit}}. What is its VOLUME?", {
          thing: cap(skin.thing), l: showNumber(box.l), w: showNumber(box.w), h: showNumber(box.h), unit: skin.unit,
        })
      : variant === "shaped"
        ? (triangular
            ? bind("{{thing}} is a prism {{len}} {{unit}} long. Its cross-section is a triangle of base {{a}} {{unit}} and height {{bh}} {{unit}}. What is its VOLUME?", {
                thing: cap(skin.thing), len: showNumber(length), unit: skin.unit, a: showNumber(baseA), bh: showNumber(baseH),
              })
            : bind("{{thing}} is a prism {{len}} {{unit}} long. Its cross-section is a trapezium with parallel sides {{a}} and {{b}} {{unit}}, {{bh}} {{unit}} apart. What is its VOLUME?", {
                thing: cap(skin.thing), len: showNumber(length), unit: skin.unit,
                a: showNumber(baseA), b: showNumber(baseB), bh: showNumber(baseH),
              }))
        : variant === "missing"
          ? bind("{{thing}} holds {{v}} cubic {{unit}} and its floor is {{l}} by {{w}} {{unit}}. How TALL is it?", {
              thing: cap(skin.thing), v: showNumber(volume), unit: skin.unit, l: showNumber(box.l), w: showNumber(box.w),
            })
          : (wantsArea
              ? bind("{{thing}} measures {{l}} by {{w}} by {{h}} {{unit}}. How much sheet metal does its OUTSIDE take?", {
                  thing: cap(skin.thing), l: showNumber(box.l), w: showNumber(box.w), h: showNumber(box.h), unit: skin.unit,
                })
              : bind("{{thing}} measures {{l}} by {{w}} by {{h}} {{unit}}. How much will it HOLD?", {
                  thing: cap(skin.thing), l: showNumber(box.l), w: showNumber(box.w), h: showNumber(box.h), unit: skin.unit,
                }));

  const prompt = {
    text,
    units: wantsArea ? `${skin.unit}²` : `${skin.unit}³`,
    figure: {
      kind: "layers-of-cubes" as const,
      solid: variant === "shaped" ? "TRIANGULAR PRISM" : "RECTANGULAR PRISM",
      marks: [
        { at: "width", label: showNumber(variant === "shaped" ? baseA : box.l) },
        { at: "height", label: variant === "missing" ? "?" : showNumber(variant === "shaped" ? baseH : box.h) },
        { at: "depth", label: showNumber(variant === "shaped" ? length : box.w) },
      ],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the BASE: the face that repeats all the way along the solid. For a box it is the floor; for a triangular prism it is the triangle on the end.", math: `B = ${showNumber(variant === "shaped" ? shapedBase : mul(box.l, box.w))}` },
    { text: "Work out the base's area on its own. A triangle is half base times height; a trapezium is half the two parallel sides added, times the gap.", math: variant === "shaped" ? `½ × ${showNumber(baseA)} × ${showNumber(baseH)}` : `${showNumber(box.l)} × ${showNumber(box.w)}` },
    { text: "Volume is B × h: MULTIPLY the base area by how far the solid runs. Adding the dimensions is not a volume.", math: `${showNumber(variant === "shaped" ? shapedBase : mul(box.l, box.w))} × ${showNumber(variant === "shaped" ? length : box.h)} = ${showNumber(volume)}` },
    { text: "Going backwards, divide the volume by the base area to get the missing length.", math: `${showNumber(volume)} ÷ ${showNumber(mul(box.l, box.w))} = ${showNumber(box.h)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const wrongFace = mul(box.l, box.h);
  const candidates: Candidate[] = [
    // wrong-base: a face that is not the repeating one used as B
    { tag: "wrong-base", value: mul(wrongFace, box.w), when: false },
    { tag: "wrong-base", value: variant === "shaped" ? mul(mul(baseA, baseH), length) : div0(volume, rat(2)), when: variant === "shaped" },
    { tag: "wrong-base", value: div0(volume, box.w), when: variant !== "shaped" && box.w.n !== 0 },
    // add-not-multiply: the dimensions added together
    { tag: "add-not-multiply", value: add(add(box.l, box.w), box.h) },
    // v-vs-sa: the surface area computed where the volume was asked for
    { tag: "v-vs-sa", value: wantsArea ? volume : surface },
    { tag: "v-vs-sa", value: otherVolume, when: variant === "compare" },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${box.l.n}/${box.l.d}x${box.w.n}x${box.h.n}|${triangular}|${baseA.n},${baseB.n},${baseH.n},${length.n}|${wantsArea}`),
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
    params: { variant, skin: skinKey, box: `${box.l.n}/${box.l.d}x${box.w.n}x${box.h.n}` },
  };
}
