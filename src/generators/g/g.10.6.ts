// g.10.6 — Cross sections of three-dimensional figures
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { crossSection, type Solid, type SliceDirection } from "../../engine/geometry";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "g.10.6";

type Variant =
  | "parallel"      // a slice across, parallel to the base    (tier 1)
  | "perpendicular" // a slice straight down through it         (tier 2)
  | "pointed"       // pyramids and cones, both ways            (tier 3)
  | "identify";     // name the solid from two of its slices    (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["parallel"],
  2: ["perpendicular", "parallel"],
  3: ["pointed", "perpendicular"],
  4: ["identify", "pointed"],
};

const PRISMS: Solid[] = ["RECTANGULAR PRISM", "TRIANGULAR PRISM", "CYLINDER", "CUBE"];
const POINTED: Solid[] = ["SQUARE PYRAMID", "TRIANGULAR PYRAMID", "CONE"];
const ALL: Solid[] = [...PRISMS, ...POINTED];

const SKINS = {
  fuselage: { thing: "the fuselage section" },
  wing: { thing: "the wing box" },
  baffle: { thing: "the fuel tank baffle" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "identify" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the solid and the cut ------------------------------------------
  const solid: Solid = variant === "pointed" ? pick(rng, POINTED)
    : variant === "identify" ? pick(rng, ALL)
      : pick(rng, PRISMS);
  const direction: SliceDirection = variant === "parallel" ? "PARALLEL TO THE BASE"
    : variant === "perpendicular" ? "PERPENDICULAR TO THE BASE"
      : pick(rng, ["PARALLEL TO THE BASE", "PERPENDICULAR TO THE BASE"] as SliceDirection[]);

  const shape = crossSection(solid, direction);
  const acrossShape = crossSection(solid, "PARALLEL TO THE BASE");
  const downShape = crossSection(solid, "PERPENDICULAR TO THE BASE");

  const correct = variant === "identify" ? solid : shape;

  // --- 2. prompt --------------------------------------------------------
  const article = /^[AEIOU]/.test(solid) ? "an" : "a";
  const text =
    variant === "identify"
      ? bind("Slicing {{thing}} ACROSS gives a {{a}}, and slicing it straight DOWN gives a {{b}}. What shape is it?", {
          thing: skin.thing, a: acrossShape, b: downShape,
        })
      : bind("{{thing}} is {{art}} {{solid}}. You cut it {{dir}}. What shape is the cut face?", {
          thing: `${skin.thing.charAt(0).toUpperCase()}${skin.thing.slice(1)}`,
          art: article, solid: solid.toLowerCase(), dir: direction.toLowerCase(),
        });

  const prompt = {
    text,
    figure: {
      kind: "slice-visual" as const,
      solid,
      ...(variant === "identify" ? {} : { slice: direction }),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Picture the cut face on its own, as if you lifted the top half off and looked straight down at it.", math: `${solid} cut ${direction.toLowerCase()}` },
    { text: "A slice PARALLEL to the base is a copy of the base. A cylinder gives a circle; a triangular prism gives a triangle.", math: `across → ${acrossShape}` },
    { text: "A slice straight DOWN through a prism or a cylinder is a rectangle, whatever its base looks like.", math: `down → ${downShape}` },
    { text: "A pyramid or a cone narrows towards a point, so a slice straight down through the tip is a triangle. Parallel to the base it is still a smaller copy of the base.", math: `${solid} → ${shape}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = variant === "identify"
    ? [
        { tag: "pyramid-always-triangle", value: solid === "SQUARE PYRAMID" ? "CUBE" : "SQUARE PYRAMID" },
        { tag: "cylinder-circle-only", value: solid === "CYLINDER" ? "CONE" : "CYLINDER" },
        { tag: "pyramid-always-triangle", value: solid === "TRIANGULAR PRISM" ? "RECTANGULAR PRISM" : "TRIANGULAR PRISM" },
        { tag: "cylinder-circle-only", value: solid === "CONE" ? "TRIANGULAR PYRAMID" : "CONE" },
      ]
    : [
        // pyramid-always-triangle: every slice of a pyramid taken for a triangle
        { tag: "pyramid-always-triangle", value: "TRIANGLE" },
        // cylinder-circle-only: every slice of a cylinder taken for a circle
        { tag: "cylinder-circle-only", value: "CIRCLE" },
        { tag: "pyramid-always-triangle", value: "RECTANGLE" },
        { tag: "cylinder-circle-only", value: "SQUARE" },
      ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => String(v));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${solid}|${direction}`),
    format: variant === "identify" ? "multiple-choice" : "shape-select",
    prompt,
    answer: correct,
    answerText: correct,
    accept: (input: Answer) => String(input).toUpperCase() === correct,
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, solid, direction },
  };
}
