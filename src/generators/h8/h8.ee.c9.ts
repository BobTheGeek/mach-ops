// h8.ee.c9 — Graph a linear inequality (Grade 8 honors, on Chapters 4 and 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { GLYPH, type Relation } from "../../engine/inequality";
import { showNumber } from "../../engine/geometry";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.c9";

type Variant =
  | "line"    // one variable on a number line (review)     (tier 1)
  | "pick"    // which graph shows y > mx + b                (tier 2)
  | "shade"   // shade the region yourself                   (tier 3)
  | "test";   // is this point a solution                    (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["line"],
  2: ["pick", "line"],
  3: ["shade", "pick"],
  4: ["test", "shade"],
};

const RELATIONS: Relation[] = ["lt", "le", "gt", "ge"];

const SKINS = {
  altitude: { y: "safe altitude", x: "distance from the field" },
  nofly: { y: "ceiling", x: "range" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "test" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the inequality -------------------------------------------------
  // The registry's ranges.
  const m = rat(int(rng, -3, 3));
  const b = rat(int(rng, -6, 6));
  const relation = pick(rng, RELATIONS);
  const above = relation === "gt" || relation === "ge";
  const strict = relation === "gt" || relation === "lt";

  const glyph = GLYPH[relation];
  // A flat boundary is "y < 5", not "y < 0x + 5".
  const written = m.n === 0
    ? `y ${glyph} ${fmtInt(b.n)}`
    : `y ${glyph} ${m.n === 1 ? "x" : m.n === -1 ? "−x" : `${fmtInt(m.n)}x`}${b.n === 0 ? "" : ` ${b.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(b.n))}`}`;

  // A test point that is clearly on one side.
  const tx = int(rng, -6, 6);
  const lineY = (m.n * tx) / m.d + b.n / b.d;
  const offset = int(rng, 2, 5) * (rng() < 0.5 ? 1 : -1);
  const ty = Math.round(lineY) + offset;
  const testAbove = ty > lineY;
  const satisfies = above ? testAbove : !testAbove;

  // Tier 1 reviews the one-variable case on a number line.
  const bound = int(rng, -9, 9);

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "line"
      ? bind("On a number line, which picture shows x {{g}} {{v}}?", { g: glyph, v: fmtInt(bound) })
      : variant === "pick"
        ? bind("Which graph shows {{ineq}}?", { ineq: written })
        : variant === "shade"
          ? bind("The boundary for {{ineq}} is drawn. TAP the side that makes it true.", { ineq: written })
          : bind("Is ({{x}}, {{y}}) a solution of {{ineq}}?", { x: fmtInt(tx), y: fmtInt(ty), ineq: written });

  const prompt = {
    text,
    figure: variant === "shade"
      ? { kind: "coordinate-plane-shaded" as const, max: 10, boundary: { m, b, strict }, labels: [skin.x.toUpperCase(), skin.y.toUpperCase()] }
      : { kind: "coordinate-plane-shaded" as const, max: 10, series: [[[-9, m.n * -9 + b.n], [9, m.n * 9 + b.n]]] },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Draw the boundary line first, as if the inequality were an equals sign.", math: `y = ${showNumber(m)}x + ${showNumber(b)}` },
    { text: "Pick the line style. DASHED for < and >, because those points are not included. SOLID for ≤ and ≥, because they are.", math: strict ? `${glyph} → dashed` : `${glyph} → solid` },
    { text: "Test a point that is not on the line — (0, 0) if the line misses it — and see whether it makes the inequality true.", math: `(${fmtInt(tx)}, ${fmtInt(ty)}) → ${satisfies ? "true" : "false"}` },
    { text: "Shade the side the true point is on. With y on its own, > shades ABOVE and < shades BELOW.", math: above ? "shade above" : "shade below" },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${m.n},${b.n}|${relation}|${variant === "test" ? `${tx},${ty}` : ""}|${variant === "line" ? bound : ""}`);

  // --- 4. the shade tier is a tap on the grid ---------------------------
  if (variant === "shade") {
    const answer = above ? "ABOVE" : "BELOW";
    const foil = above ? "BELOW" : "ABOVE";
    return {
      skill: SKILL, tier, seed, hash,
      format: "shade-region",
      prompt,
      answer,
      answerText: answer,
      accept: (input: Answer) => String(input).toUpperCase() === answer,
      distractors: [{ tag: "wrong-side", value: foil }],
      errorTagsByAnswer: { [foil]: "wrong-side" },
      worked,
      params: { variant, skin: skinKey, relation, above: String(above) },
    };
  }

  // --- 5. is this point a solution --------------------------------------
  if (variant === "test") {
    const answer = satisfies ? "YES" : "NO";
    const foil = satisfies ? "NO" : "YES";
    const options = ["YES", "NO"];
    return {
      skill: SKILL, tier, seed, hash,
      format: "yes-no",
      prompt,
      answer,
      answerText: answer,
      accept: (input: Answer) => String(input).toUpperCase() === answer,
      distractors: [{ tag: "wrong-side", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(answer),
      worked,
      errorTagsByAnswer: { [foil]: "wrong-side" },
      params: { variant, skin: skinKey, relation, above: String(above) },
    };
  }

  // --- 6. pick the picture ----------------------------------------------
  const describe = (up: boolean, dashed: boolean): string =>
    variant === "line"
      ? `${dashed ? "AN OPEN" : "A CLOSED"} CIRCLE AT ${fmtInt(bound)}, SHADED TO THE ${up ? "RIGHT" : "LEFT"}`
      : `A ${dashed ? "DASHED" : "SOLID"} LINE, SHADED ${up ? "ABOVE" : "BELOW"}`;

  const right = describe(above, strict);
  const candidates: Candidate[] = [
    // wrong-side: the right line, the wrong half shaded
    { tag: "wrong-side", value: describe(!above, strict) },
    // line-type: solid where it should be dashed, or the other way round
    { tag: "line-type", value: describe(above, !strict) },
    { tag: "wrong-side", value: describe(!above, !strict) },
  ];
  const choice = buildChoice(rng, right, candidates, (v: Answer) => String(v));

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
    params: { variant, skin: skinKey, relation, above: String(above) },
  };
}
