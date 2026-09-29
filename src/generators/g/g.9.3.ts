// g.9.3 — Perimeters and areas of composite figures
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul } from "../../engine/rational";
import { PI_314, showNumber, circleAreaCoefficient, circumferenceCoefficient } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.9.3";

type Variant =
  | "l-shape"   // two rectangles                              (tier 1)
  | "apron"     // a rectangle with a semicircular end          (tier 2)
  | "cutout"    // a rectangle with a piece taken out           (tier 3)
  | "between";  // the area left between two shapes             (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["l-shape"],
  2: ["apron", "l-shape"],
  3: ["cutout", "apron"],
  4: ["between", "cutout"],
};

const SKINS = {
  apron: { thing: "the apron", unit: "m" },
  hangar: { thing: "the hangar floor", unit: "m" },
  zone: { thing: "the target zone", unit: "m" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "between" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the figure ----------------------------------------------------
  // The registry's range. The semicircle's diameter is even so its radius is
  // whole, which keeps the curved part readable.
  const big = { w: int(rng, 6, 20), h: int(rng, 5, 16) };
  const cut = { w: int(rng, 2, Math.max(2, big.w - 3)), h: int(rng, 2, Math.max(2, big.h - 3)) };
  // Big enough to matter: a radius-1 circle inside a 16 by 13 apron is not a
  // question about the area between two shapes.
  const capD = int(rng, 2, Math.max(2, Math.floor(Math.min(big.w, big.h) / 2))) * 2;
  const capR = capD / 2;

  const wantsArea = variant === "between" ? true : rng() < 0.6;

  const rectArea = rat(big.w * big.h);
  const rectPerimeter = rat(2 * (big.w + big.h));
  const cutArea = rat(cut.w * cut.h);

  // Areas that involve a semicircle are worked with 3.14, because a mixed
  // "48 + 12.5π" answer is not a number a player can type or compare.
  const semiArea = mul(mul(circleAreaCoefficient(rat(capR)), rat(1, 2)), PI_314);
  const semiArc = mul(mul(circumferenceCoefficient(rat(capR)), rat(1, 2)), PI_314);

  const correct: Rational = ((): Rational => {
    if (variant === "l-shape") {
      // An L is the big rectangle with a corner rectangle removed. Its outside
      // edge is the same length as the big rectangle's: the two cut edges
      // replace exactly the two they removed.
      return wantsArea ? sub(rectArea, cutArea) : rectPerimeter;
    }
    if (variant === "apron") {
      // Rectangle plus a half-disc on one end. The perimeter loses that end.
      return wantsArea
        ? add(rectArea, semiArea)
        : add(add(rat(2 * big.w), rat(big.h - capD)), add(semiArc, rat(capD === big.h ? 0 : big.h)));
    }
    if (variant === "cutout") {
      return wantsArea ? sub(rectArea, cutArea) : add(rectPerimeter, rat(2 * (cut.w + cut.h)));
    }
    // between: the big rectangle with a full circle taken out of the middle
    return sub(rectArea, mul(circleAreaCoefficient(rat(capR)), PI_314));
  })();

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const ask = wantsArea ? "AREA" : "PERIMETER";
  const text =
    variant === "l-shape"
      ? bind("{{thing}} is an L: a {{w}} by {{h}} {{unit}} rectangle with a {{cw}} by {{ch}} {{unit}} corner missing. What is its {{ask}}?", {
          thing: cap(skin.thing), w: String(big.w), h: String(big.h), unit: skin.unit,
          cw: String(cut.w), ch: String(cut.h), ask,
        })
      : variant === "apron"
        ? bind("{{thing}} is a {{w}} by {{h}} {{unit}} rectangle with a half circle of diameter {{d}} {{unit}} on one end. What is its {{ask}}? Use π = 3.14.", {
            thing: cap(skin.thing), w: String(big.w), h: String(big.h), unit: skin.unit, d: String(capD), ask,
          })
        : variant === "cutout"
          ? bind("{{thing}} is {{w}} by {{h}} {{unit}} with a {{cw}} by {{ch}} {{unit}} hole cut out of the middle. What is its {{ask}}?", {
              thing: cap(skin.thing), w: String(big.w), h: String(big.h), unit: skin.unit,
              cw: String(cut.w), ch: String(cut.h), ask,
            })
          : bind("A circle of radius {{r}} {{unit}} sits inside a {{w}} by {{h}} {{unit}} rectangle. How much of the rectangle is LEFT over? Use π = 3.14.", {
              r: String(capR), unit: skin.unit, w: String(big.w), h: String(big.h),
            });

  const prompt = {
    text,
    units: wantsArea ? `${skin.unit}²` : skin.unit,
    figure: {
      kind: "grid-decomposition" as const,
      parts: variant === "l-shape"
        ? [{ x: 0, y: 0, w: big.w, h: big.h - cut.h }, { x: 0, y: big.h - cut.h, w: big.w - cut.w, h: cut.h }]
        // The grid renderer draws rectangles. A circular cutout drawn as a
        // rectangle would be a figure that disagrees with its own prompt, so
        // "between" shows the outer shape only.
        : [{ x: 0, y: 0, w: big.w, h: big.h },
           ...(variant === "cutout"
             ? [{ x: 1, y: 1, w: Math.min(cut.w, big.w - 2), h: Math.min(cut.h, big.h - 2) }]
             : [])],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Cut the figure into shapes you know: rectangles, triangles and half circles. Draw the cut lines in.", math: `${big.w} × ${big.h} and ${cut.w} × ${cut.h}` },
    { text: "Work out each piece on its own, then ADD them — or SUBTRACT the piece that has been taken away.", math: `${showNumber(rectArea)} − ${showNumber(cutArea)} = ${showNumber(sub(rectArea, cutArea))}` },
    { text: "A half circle is half a circle. Halve the area, and halve the circumference for the curved edge.", math: `半 → ${showNumber(semiArea)} and ${showNumber(semiArc)}`.replace("半", "half") },
    { text: "Perimeter counts only the OUTSIDE edges. The lines you drew to cut the figure up are not part of it.", math: `${showNumber(rectPerimeter)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // interior-edges: the cut lines counted as part of the outside
    { tag: "interior-edges", value: add(correct, rat(2 * cut.w)), when: !wantsArea },
    { tag: "interior-edges", value: rectArea, when: wantsArea },
    // full-circle: a whole circle used where a half was drawn
    { tag: "full-circle", value: add(rectArea, mul(circleAreaCoefficient(rat(capR)), PI_314)), when: variant === "apron" && wantsArea },
    { tag: "full-circle", value: add(correct, semiArc), when: variant === "apron" && !wantsArea },
    { tag: "full-circle", value: sub(rectArea, mul(mul(circleAreaCoefficient(rat(capR)), rat(1, 2)), PI_314)), when: variant === "between" },
    // add-cutout: the removed piece added back instead of taken away
    { tag: "add-cutout", value: add(rectArea, cutArea), when: wantsArea },
    { tag: "add-cutout", value: sub(correct, rat(2 * cut.h)), when: !wantsArea },
    { tag: "interior-edges", value: add(correct, rat(cut.w + cut.h)) },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${big.w}x${big.h}|${cut.w}x${cut.h}|${capD}|${wantsArea}`),
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
    params: { variant, skin: skinKey, big: `${big.w}x${big.h}`, cut: `${cut.w}x${cut.h}`, wantsArea: String(wantsArea) },
  };
}
