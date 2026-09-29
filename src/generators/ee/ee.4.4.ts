// ee.4.4 — Writing and graphing inequalities
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtFraction } from "../../engine/rational";
import {
  ineq, flip, GLYPH, isClosed, shadesRight, fmtInequality, parseInequality, eqInequality,
  PHRASES, type Relation,
} from "../../engine/inequality";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "ee.4.4";

type Variant =
  | "phrase"     // match a phrase to a symbol           (tier 1)
  | "graph"      // graph x < a on a number line         (tier 2)
  | "read"       // write the inequality from a graph    (tier 3)
  | "context";   // write it from a limit in a context   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["phrase"],
  2: ["graph", "phrase"],
  3: ["read", "graph"],
  4: ["context", "read"],
};

const SKINS = {
  altitude: {
    unit: "KFT",
    noun: "altitude",
    limit: (r: Relation, a: string): string =>
      r === "ge" ? `Minimum safe altitude is ${a} KFT. Write the rule for a safe altitude x.`
        : r === "le" ? `Your ceiling is ${a} KFT. Write the rule for an allowed altitude x.`
          : r === "gt" ? `You must stay above ${a} KFT, not at it. Write the rule for altitude x.`
            : `You must stay below ${a} KFT, not at it. Write the rule for altitude x.`,
  },
  payload: {
    unit: "LB",
    noun: "payload",
    limit: (r: Relation, a: string): string =>
      r === "ge" ? `You must carry at least ${a} lb. Write the rule for a payload x.`
        : r === "le" ? `Maximum takeoff payload is ${a} lb. Write the rule for a payload x.`
          : r === "gt" ? `You must carry more than ${a} lb. Write the rule for a payload x.`
            : `You must carry fewer than ${a} lb. Write the rule for a payload x.`,
  },
  fuel: {
    unit: "L",
    noun: "fuel",
    limit: (r: Relation, a: string): string =>
      r === "ge" ? `You must land with at least ${a} L. Write the rule for landing fuel x.`
        : r === "le" ? `You may load no more than ${a} L. Write the rule for loaded fuel x.`
          : r === "gt" ? `You must land with more than ${a} L. Write the rule for landing fuel x.`
            : `You must burn fewer than ${a} L. Write the rule for burnt fuel x.`,
  },
} as const;

type SkinKey = keyof typeof SKINS;
const ALL: Relation[] = ["lt", "le", "gt", "ge"];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  const relation = pick(rng, ALL);
  const boundary = rat(int(rng, -15, 15));
  const answer = ineq(relation, boundary);
  const answerText = fmtInequality(answer);

  // --- prompt -----------------------------------------------------------
  const phrase = pick(rng, PHRASES.filter((p) => p.relation === relation));
  const text =
    variant === "phrase"
      ? `"${phrase.phrase} ${fmtFraction(boundary)}" — which inequality says that about ${skin.noun} x?`
      : variant === "graph"
        ? `Which number line shows ${answerText}?`
        : variant === "read"
          ? `The number line shows ${isClosed(relation) ? "a closed" : "an open"} circle at ${fmtFraction(boundary)}, shaded to the ${shadesRight(relation) ? "right" : "left"}. Write the inequality.`
          : skin.limit(relation, fmtFraction(boundary));

  const prompt = {
    text: bind(text, {}),
    units: skin.unit,
    figure: {
      kind: "number-line" as const,
      min: Math.min(-2, boundary.n - 8),
      max: Math.max(2, boundary.n + 8),
      points: [boundary.n],
      labels: [GLYPH[relation], isClosed(relation) ? "closed" : "open", shadesRight(relation) ? "right" : "left"],
    },
  };

  // --- worked steps: MUST match the manual's "How to solve it" -----------
  const worked: WorkedStep[] = [
    { text: "Read the words carefully. 'At least' and 'no less than' mean the value is allowed; 'more than' means it is not.", math: `"${phrase.phrase}" → ${GLYPH[relation]}` },
    { text: "Pick the symbol. An 'or equal to' phrase gets the line under the arrow.", math: `${GLYPH[relation]}` },
    { text: "The circle shows whether the boundary itself counts: closed if it does, open if it does not.", math: isClosed(relation) ? "closed circle" : "open circle" },
    { text: "Shade toward every value that works.", math: `${answerText}, shaded ${shadesRight(relation) ? "right" : "left"}` },
  ];

  // --- distractors from registry error tags -----------------------------
  const flipped = ineq(flip(relation), boundary);
  const wrongCircle = ineq(
    relation === "lt" ? "le" : relation === "le" ? "lt" : relation === "gt" ? "ge" : "gt",
    boundary,
  );

  const candidates: Candidate[] = [
    // phrase-flip: 'at least' read as at most
    { tag: "phrase-flip", value: fmtInequality(flipped) },
    // circle-type: right direction, wrong circle
    { tag: "circle-type", value: fmtInequality(wrongCircle) },
    // one-solution: read as a single value rather than a range
    { tag: "one-solution", value: `x = ${fmtFraction(boundary)}` },
  ];
  const choice = buildChoice(rng, answerText, candidates, (a) => String(a));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${relation}|${boundary.n}|${phrase.phrase}`),
    format: variant === "graph" ? "number-line-select" : rng() < 0.5 ? "multiple-choice" : "expression",
    prompt,
    answer: answerText,
    answerText,
    accept: (input: Answer) => {
      const parsed = parseInequality(String(input));
      return parsed !== null && eqInequality(parsed, answer);
    },
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, relation, boundary: boundary.n, phrase: phrase.phrase },
  };
}
