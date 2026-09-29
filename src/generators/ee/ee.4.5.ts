// ee.4.5 — Solving inequalities using addition or subtraction
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fromDecimal, add, sub, fmtImproper, isTerminating, fmtDecimal, MINUS } from "../../engine/rational";
import {
  ineq, flip, GLYPH, isClosed, shadesRight, parseInequality, eqInequality, type Relation,
} from "../../engine/inequality";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "ee.4.5";

type Variant =
  | "positive"  // x + a < b, positive integers      (tier 1)
  | "negatives" // negatives on either side          (tier 2)
  | "rational"  // rational constants                (tier 3)
  | "context";  // a limit, then graph the solution  (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["positive"],
  2: ["negatives", "positive"],
  3: ["rational", "negatives"],
  4: ["context", "rational"],
};

const SKINS = {
  fuel: {
    unit: "L",
    plain: "Fuel computer: solve {{ineq}} for x.",
    context: "Your fuel x plus a {{a}} L reserve must stay {{word}} {{b}} L. Write the rule for x.",
  },
  terrain: {
    unit: "FT",
    plain: "Terrain computer: solve {{ineq}} for x.",
    context: "Your altitude x plus a {{a}} ft margin must stay {{word}} {{b}} ft. Write the rule for x.",
  },
  payload: {
    unit: "LB",
    plain: "Loadout computer: solve {{ineq}} for x.",
    context: "Your payload x plus {{a}} lb of fuel must stay {{word}} {{b}} lb. Write the rule for x.",
  },
} as const;

type SkinKey = keyof typeof SKINS;
const ALL: Relation[] = ["lt", "le", "gt", "ge"];
const WORD: Record<Relation, string> = { lt: "below", le: "at or below", gt: "above", ge: "at or above" };

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  const relation = pick(rng, ALL);
  const rational = variant === "rational";
  const asDecimal = rational && rng() < 0.5;
  const draw = (): Rational =>
    !rational
      ? rat(variant === "positive" ? int(rng, 1, 30) : int(rng, -30, 30))
      : asDecimal
        ? fromDecimal(int(rng, -300, 300) / 10, 1)
        : rat(int(rng, -30, 30), pick(rng, [2, 4, 5] as const));

  const a = variant === "context" ? rat(int(rng, 100, 900)) : draw();
  const b = variant === "context" ? rat(int(rng, 1000, 3000)) : draw();

  // x + a <relation> b solves to x <relation> b - a. Adding never flips.
  const solved = ineq(relation, sub(b, a));
  // Improper, not mixed: an inequality answer is parsed back, and "2 1/4" loses
  // its space in an input box and reads as 21/4.
  const show = (r: Rational): string =>
    asDecimal && isTerminating(r) && r.d !== 1 ? fmtDecimal(r) : fmtImproper(r);
  // Fold a negative into the sign: "x − 28", never "x + −28".
  const aSign = a.n < 0 ? MINUS : "+";
  const aMagnitude = show(rat(Math.abs(a.n), a.d));
  const statement = `x ${aSign} ${aMagnitude} ${GLYPH[relation]} ${show(b)}`;
  const answerText = `x ${GLYPH[relation]} ${show(solved.boundary)}`;

  // --- prompt -----------------------------------------------------------
  const prompt = {
    text: bind(variant === "context" ? skin.context : skin.plain, {
      ineq: statement, a: show(a), b: show(b), word: WORD[relation],
    }),
    units: skin.unit,
    math: [statement],
    figure: {
      kind: "number-line" as const,
      min: Math.floor(solved.boundary.n / solved.boundary.d) - 8,
      max: Math.ceil(solved.boundary.n / solved.boundary.d) + 8,
      points: [solved.boundary.n / solved.boundary.d],
      labels: [GLYPH[relation], isClosed(relation) ? "closed" : "open", shadesRight(relation) ? "right" : "left"],
    },
  };

  // --- worked steps: MUST match the manual's "How to solve it" -----------
  const worked: WorkedStep[] = [
    { text: "Treat it exactly like an equation: whatever you do to one side, do to the other.", math: statement },
    { text: `x has ${aMagnitude} ${aSign === MINUS ? "taken away" : "added"}, so ${aSign === MINUS ? "add" : "subtract"} ${aMagnitude} on both sides.`, math: `x ${GLYPH[relation]} ${show(b)} ${aSign === MINUS ? "+" : MINUS} ${aMagnitude}` },
    { text: "Adding and subtracting never flip the symbol. Only multiplying or dividing by a negative does that.", math: `${GLYPH[relation]} stays ${GLYPH[relation]}` },
    { text: "Work out the boundary, then shade toward every value that works.", math: `${answerText}, shaded ${shadesRight(relation) ? "right" : "left"}` },
  ];

  // --- distractors from registry error tags -----------------------------
  const candidates: Candidate[] = [
    // needless-flip: flips the symbol after subtracting
    { tag: "needless-flip", value: `x ${GLYPH[flip(relation)]} ${show(solved.boundary)}` },
    // shade-wrong: reads the reversed statement the wrong way round
    { tag: "shade-wrong", value: `x ${GLYPH[flip(relation)]} ${show(add(b, a))}` },
    { tag: "shade-wrong", value: `x ${GLYPH[relation]} ${show(add(b, a))}` },
  ];
  const choice = buildChoice(rng, answerText, candidates, (v) => String(v));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${relation}|${a.n}/${a.d}|${b.n}/${b.d}`),
    format: rng() < 0.5 ? "expression" : "multiple-choice",
    prompt,
    answer: answerText,
    answerText,
    accept: (input: Answer) => {
      const parsed = parseInequality(String(input));
      return parsed !== null && eqInequality(parsed, solved);
    },
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, relation, a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}` },
  };
}
