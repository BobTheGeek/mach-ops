// g.9.4 — Constructing polygons and the triangle inequality
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { isTriangle, thirdSideRange } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.9.4";

type Variant =
  | "can-form"  // do these three lengths close into a triangle  (tier 1)
  | "how-many"  // one triangle, many, or none                   (tier 2)
  | "range"     // the smallest or largest the third side can be (tier 3)
  | "angles";   // three angles fix a shape, or only a family    (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["can-form"],
  2: ["how-many", "can-form"],
  3: ["range", "how-many"],
  4: ["angles", "range"],
};

const SKINS = {
  intercept: { noun: "intercept legs", unit: "km" },
  patrol: { noun: "patrol legs", unit: "km" },
  struts: { noun: "bracing struts", unit: "cm" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "angles" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. three lengths -------------------------------------------------
  // The registry's range, with the exact-equality foil (2, 3, 5) reachable:
  // a third side equal to the sum of the other two is a straight line, and
  // accepting it is this skill's own named mistake.
  const a = int(rng, 2, 18);
  const b = int(rng, 2, 18);
  // Weighted, not uniform: three kinds drawn evenly would make "no" the right
  // answer two times in three and reward not checking.
  const kindRoll = rng();
  const kind = kindRoll < 0.5 ? "works" : kindRoll < 0.75 ? "equal" : "short";
  const c = kind === "works" ? int(rng, Math.abs(a - b) + 1, a + b - 1)
    : kind === "equal" ? a + b
      : a + b + int(rng, 1, 6);
  const sides = shuffle(rng, [a, b, c]);
  const works = isTriangle(a, b, c);

  const { low, high } = thirdSideRange(a, b);
  const wantsLargest = rng() < 0.5;
  // The open range means the third side must be strictly between the two, so
  // the largest and smallest WHOLE values are one step inside each end.
  const bound = rat(wantsLargest ? high - 1 : low + 1);

  // Tier 4: three side lengths fix one triangle, three angles fix a family.
  // Half of the angle triples do not add to 180, so "three angles give you a
  // family of triangles" is a finding rather than a phrase to memorise.
  const anglesClose = rng() < 0.5;
  const angles = ((): number[] => {
    const x = int(rng, 30, 80);
    const y = int(rng, 30, Math.max(30, 150 - x));
    const z = 180 - x - y;
    return anglesClose ? [x, y, z] : [x, y, z + int(rng, 1, 3) * (rng() < 0.5 ? 10 : -10)];
  })();
  const givenAngles = rng() < 0.5;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "can-form"
      ? bind("Three {{noun}} measure {{a}}, {{b}} and {{c}} {{unit}}. Can they close into a triangle?", {
          noun: skin.noun, a: String(sides[0]), b: String(sides[1]), c: String(sides[2]), unit: skin.unit,
        })
      : variant === "how-many"
        ? (givenAngles
            ? bind("A triangle has angles of {{x}}°, {{y}}° and {{z}}°. How many DIFFERENT triangles fit that?", {
                x: String(angles[0]), y: String(angles[1]), z: String(angles[2]),
              })
            : bind("A triangle has sides of {{a}}, {{b}} and {{c}} {{unit}}. How many DIFFERENT triangles fit that?", {
                a: String(sides[0]), b: String(sides[1]), c: String(sides[2]), unit: skin.unit,
              }))
        : variant === "range"
          ? bind("Two {{noun}} are {{a}} and {{b}} {{unit}}. What is the {{which}} WHOLE number the third leg can be?", {
              noun: skin.noun, a: String(a), b: String(b), unit: skin.unit,
              which: wantsLargest ? "LARGEST" : "SMALLEST",
            })
          : bind("You are given three ANGLES: {{x}}°, {{y}}° and {{z}}°. How many triangles fit that?", {
              x: String(angles[0]), y: String(angles[1]), z: String(angles[2]),
            });

  const prompt = {
    text,
    units: skin.unit,
    figure: variant === "angles" || (variant === "how-many" && givenAngles)
      ? { kind: "straws" as const, rows: [["ANGLES", ...angles.map((v) => `${v}°`)], ["TOTAL", `${angles.reduce((x, y) => x + y, 0)}°`]] }
      : { kind: "straws" as const, rows: [["LEGS", ...sides.map((v) => `${v} ${skin.unit}`)]] },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const sorted = [...sides].sort((p, q) => p - q);
  const worked: WorkedStep[] = [
    { text: "Put the three lengths in order, smallest to largest. The longest one is the one everything is measured against.", math: sorted.join(", ") },
    { text: "Add the two SHORTER ones. They must come to MORE than the longest, not the same as it.", math: `${sorted[0]} + ${sorted[1]} = ${sorted[0]! + sorted[1]!} vs ${sorted[2]}` },
    { text: "Equal is a straight line, not a triangle. 2, 3 and 5 lie flat on top of each other.", math: works ? "closes" : "does not close" },
    { text: "Three SIDES fix exactly one triangle. Three ANGLES that add to 180 fix the shape but not the size, so there are infinitely many.", math: `${low} < third side < ${high}` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${sorted.join(",")}|${angles.join(",")}|${givenAngles}|${wantsLargest}`);
  const anglesTotal = angles.reduce((x, y) => x + y, 0);
  void anglesTotal;

  // --- 4. can it close: yes or no ---------------------------------------
  if (variant === "can-form") {
    const right = works ? "YES" : "NO";
    const foil = works ? "NO" : "YES";
    const options = ["YES", "NO"];
    return {
      skill: SKILL, tier, seed, hash,
      format: "yes-no",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: [{ tag: "equality-passes", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: "equality-passes" },
      params: { variant, skin: skinKey, sides: sorted.join(","), kind },
    };
  }

  // --- 5. how many, and what three angles fix ---------------------------
  if (variant === "how-many" || variant === "angles") {
    const fromAngles = variant === "angles" || givenAngles;
    const right = fromAngles
      ? (anglesClose ? "INFINITELY MANY — THE SHAPE BUT NOT THE SIZE" : "NONE — THOSE ANGLES DO NOT ADD TO 180")
      : works ? "EXACTLY ONE" : "NONE — THOSE SIDES DO NOT CLOSE";
    const candidates: Candidate[] = [
      // angles-unique: three angles taken to fix one triangle
      { tag: "angles-unique", value: "EXACTLY ONE" },
      { tag: "angles-unique", value: "INFINITELY MANY — THE SHAPE BUT NOT THE SIZE" },
      { tag: "equality-passes", value: fromAngles ? "NONE — THOSE ANGLES DO NOT ADD TO 180" : "NONE — THOSE SIDES DO NOT CLOSE" },
      { tag: "equality-passes", value: "EXACTLY TWO" },
    ];
    const choice = buildChoice(rng, right, candidates, (v: Answer) => String(v), 3);
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input) === right,
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, sides: sorted.join(","), kind },
    };
  }

  // --- 6. the range for the third side ----------------------------------
  const candidates: Candidate[] = [
    // equality-passes: the boundary itself offered as if it worked
    { tag: "equality-passes", value: rat(wantsLargest ? high : low) },
    { tag: "angles-unique", value: rat(wantsLargest ? low + 1 : high - 1) },
    { tag: "equality-passes", value: rat(wantsLargest ? high + 1 : Math.max(1, low)) },
    { tag: "angles-unique", value: rat(a + b) },
  ];
  const choice = buildChoice(rng, bound, candidates, (v: Answer) => fmtInt((v as { n: number }).n));

  return {
    skill: SKILL, tier, seed, hash,
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: bound,
    answerText: fmtInt(bound.n),
    accept: acceptRational(bound),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, sides: sorted.join(","), kind },
  };
}
