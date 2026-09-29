// g.10.1 — Surface areas of prisms
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul } from "../../engine/rational";
import { showNumber, boxSurface, boxVolume, prismSurface, prismVolume } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.10.1";

type Variant =
  | "box"        // a rectangular prism, read off its net     (tier 1)
  | "triangular" // a cube, or a triangular prism             (tier 2)
  | "lateral"    // the sides only, without the two bases     (tier 3)
  | "context";   // paint to cover it, or surface vs volume   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["box"],
  2: ["triangular", "box"],
  3: ["lateral", "triangular"],
  4: ["context", "lateral"],
};

const SKINS = {
  crate: { thing: "the fuel crate", unit: "m" },
  panel: { thing: "the hangar panel crate", unit: "m" },
  case: { thing: "the ordnance case", unit: "m" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the solid ------------------------------------------------------
  // The registry's range. A triangular prism uses a 3-4-5 base so its slant
  // edges are whole and the perimeter is not a surd.
  const cube = variant === "triangular" && rng() < 0.4;
  const edge = int(rng, 2, 14);
  const box = cube
    ? { l: rat(edge), w: rat(edge), h: rat(edge) }
    : { l: rat(int(rng, 2, 20)), w: rat(int(rng, 2, 20)), h: rat(int(rng, 2, 20)) };

  const scale = int(rng, 1, 4);
  const tri = { a: 3 * scale, b: 4 * scale, c: 5 * scale };
  const triBase = rat((tri.a * tri.b) / 2);
  const triPerimeter = rat(tri.a + tri.b + tri.c);
  const triHeight = rat(int(rng, 2, 20));

  const isTriangular = variant === "triangular" && !cube;

  const surface = isTriangular ? prismSurface(triBase, triPerimeter, triHeight) : boxSurface(box);
  const volume = isTriangular ? prismVolume(triBase, triHeight) : boxVolume(box);
  const lateralArea = isTriangular
    ? mul(triPerimeter, triHeight)
    : mul(mul(rat(2), add(box.l, box.w)), box.h);

  const wantsVolume = variant === "context" && rng() < 0.5;

  const correct: Rational =
    variant === "lateral" ? lateralArea
      : variant === "context" ? (wantsVolume ? volume : surface)
        : surface;

  // --- 2. prompt --------------------------------------------------------
  const cap = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const dims = `${showNumber(box.l)} by ${showNumber(box.w)} by ${showNumber(box.h)}`;
  const text =
    isTriangular
      ? bind("{{thing}} is a prism {{h}} {{unit}} long. Its ends are right triangles with legs {{a}} and {{b}} {{unit}} and a long side of {{c}} {{unit}}. What is its SURFACE AREA?", {
          thing: cap(skin.thing), h: showNumber(triHeight), unit: skin.unit,
          a: String(tri.a), b: String(tri.b), c: String(tri.c),
        })
      : variant === "lateral"
        ? bind("{{thing}} measures {{dims}} {{unit}}. What is the area of its four SIDES, without the top and bottom?", {
            thing: cap(skin.thing), dims, unit: skin.unit,
          })
        : variant === "context"
          ? (wantsVolume
              ? bind("{{thing}} measures {{dims}} {{unit}}. How much will it HOLD?", { thing: cap(skin.thing), dims, unit: skin.unit })
              : bind("{{thing}} measures {{dims}} {{unit}}. How much paint area is there to COVER?", { thing: cap(skin.thing), dims, unit: skin.unit }))
          : (cube
              ? bind("{{thing}} is a CUBE of edge {{e}} {{unit}}. What is its SURFACE AREA?", {
                  thing: cap(skin.thing), e: showNumber(box.l), unit: skin.unit,
                })
              : bind("{{thing}} measures {{dims}} {{unit}}. What is its SURFACE AREA?", {
                  thing: cap(skin.thing), dims, unit: skin.unit,
                }));

  const prompt = {
    text,
    units: wantsVolume ? `${skin.unit}³` : `${skin.unit}²`,
    figure: isTriangular
      ? { kind: "solids-labelled" as const, solid: "TRIANGULAR PRISM",
          marks: [{ at: "width", label: `${tri.a} × ${tri.b}` }, { at: "height", label: showNumber(triHeight) }] }
      : { kind: "net" as const, faces: netFaces(box) },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Surface area is the total of ALL the faces. Unfold the solid in your head, or count them off the net.", math: isTriangular ? "2 triangles + 3 rectangles" : "6 faces" },
    { text: "For any prism it is 2B + Ph: two bases plus the sides. B is the face that repeats, P is the distance round it.", math: isTriangular ? `2 × ${showNumber(triBase)} + ${showNumber(triPerimeter)} × ${showNumber(triHeight)}` : `2(${showNumber(box.l)}×${showNumber(box.w)} + ${showNumber(box.l)}×${showNumber(box.h)} + ${showNumber(box.w)}×${showNumber(box.h)})` },
    { text: "Count both bases. Forgetting one, or forgetting a side face, is the most common way to get this wrong.", math: showNumber(surface) },
    { text: "Surface area is not volume. Area covers the outside; volume fills the inside.", math: `S = ${showNumber(surface)}   V = ${showNumber(volume)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const oneFace = isTriangular ? triBase : mul(box.l, box.w);
  const candidates: Candidate[] = [
    // missing-face: one face left out of the total
    { tag: "missing-face", value: sub(correct, oneFace), when: correct.n > oneFace.n },
    // sa-vs-volume: the volume computed where the surface was asked for
    { tag: "sa-vs-volume", value: wantsVolume ? surface : volume },
    // one-base: B + Ph, only one of the two bases counted
    { tag: "one-base", value: add(oneFace, lateralArea), when: variant !== "lateral" },
    { tag: "one-base", value: surface, when: variant === "lateral" },
    { tag: "missing-face", value: add(correct, oneFace) },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${isTriangular ? `T${tri.a},${triHeight.n}` : `${box.l.n}x${box.w.n}x${box.h.n}`}|${wantsVolume}`),
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
    params: { variant, skin: skinKey, cube: String(cube), triangular: String(isTriangular) },
  };
}

/**
 * The classic cross net: the four side faces in a row, with the top and the
 * base folded up and down off the first of them.
 *
 * The row sits at y = W so the top face has room ABOVE it; putting the row at
 * y = H and the top at y = 0 let a tall top face overlap the row, and the net
 * drew two faces on top of each other.
 */
function netFaces(box: { l: Rational; w: Rational; h: Rational }): { x: number; y: number; w: number; h: number; label?: string }[] {
  const L = box.l.n / box.l.d;
  const W = box.w.n / box.w.d;
  const H = box.h.n / box.h.d;
  return [
    { x: 0, y: W, w: L, h: H },
    { x: L, y: W, w: W, h: H },
    { x: L + W, y: W, w: L, h: H },
    { x: L + W + L, y: W, w: W, h: H },
    { x: 0, y: 0, w: L, h: W, label: "top" },
    { x: 0, y: W + H, w: L, h: W, label: "base" },
  ];
}
