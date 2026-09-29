// ee.4.6 — Solving inequalities using multiplication or division
// Shape follows content/examples/generators/ns.1.4.ts.
//
// The registry asks that half of the tier 2-4 items require a flip, so the
// coefficient's sign is drawn against the tier rather than left to chance.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, fmtFraction, fmtImproper } from "../../engine/rational";
import {
  ineq, flip, GLYPH, isClosed, shadesRight, divideBy, parseInequality, eqInequality, type Relation,
} from "../../engine/inequality";
import { buildChoice, bind, isUsableChoice, type Candidate } from "../shared";

const SKILL = "ee.4.6";

type Variant =
  | "positive"   // ax > b with a positive                (tier 1)
  | "negative"   // a negative, so the symbol flips       (tier 2)
  | "divided"    // x/a with a negative                   (tier 3)
  | "fraction"   // a fraction coefficient                (tier 3)
  | "descent";   // a negative rate against a limit       (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["positive"],
  2: ["negative", "positive"],
  3: ["divided", "fraction"],
  4: ["descent", "negative"],
};

const SKINS = {
  descent: {
    unit: "MIN",
    plain: "Descent computer: solve {{ineq}} for x.",
    context: "You descend {{rate}} ft every minute and must stay above {{limit}} ft of your start. For how many minutes x?",
  },
  fuel: {
    unit: "MIN",
    plain: "Fuel computer: solve {{ineq}} for x.",
    context: "You burn {{rate}} L every minute and must stay above {{limit}} L of your start. For how many minutes x?",
  },
  closure: {
    unit: "MIN",
    plain: "Intercept computer: solve {{ineq}} for x.",
    context: "You close {{rate}} NM every minute and must stay outside {{limit}} NM of your start. For how many minutes x?",
  },
} as const;

type SkinKey = keyof typeof SKINS;
const ALL: Relation[] = ["lt", "le", "gt", "ge"];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "descent" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  const relation = pick(rng, ALL);
  // Half of everything above tier 1 must need a flip.
  const mustFlip = tier > 1 && rng() < 0.5;

  let a: Rational;
  switch (variant) {
    case "positive": a = rat(int(rng, 2, 12)); break;
    case "negative": a = rat(-int(rng, 2, 12)); break;
    case "divided": a = rat(mustFlip ? -int(rng, 2, 12) : int(rng, 2, 12)); break;
    case "fraction": {
      const d = pick(rng, [2, 3, 4, 5] as const);
      let n = int(rng, 1, 5);
      while (n % d === 0) n += 1;
      a = rat(mustFlip ? -n : n, d);
      break;
    }
    case "descent": a = rat(-int(rng, 2, 60) * 10); break;
  }

  // A descent context reads as minutes, so the boundary is a positive count and
  // never zero: "stay above 0 ft of your start" is not a limit.
  const boundaryX = variant === "descent" ? rat(int(rng, 1, 20)) : rat(int(rng, -20, 20));
  const dividing = variant === "divided";
  // ax <relation> b, or x/a <relation> b.
  const b = dividing ? rat(boundaryX.n, boundaryX.d * a.n) : mul(a, boundaryX);
  const statement = dividing
    ? `x / ${fmtImproper(a)} ${GLYPH[relation]} ${fmtFraction(b)}`
    : `${fmtImproper(a)}x ${GLYPH[relation]} ${fmtFraction(b)}`;

  // Dividing by the coefficient (or multiplying, for x/a) flips iff it is negative.
  const solved = dividing
    ? { relation: a.n < 0 ? flip(relation) : relation, boundary: mul(b, a) }
    : divideBy(ineq(relation, b), a);
  const answerText = `x ${GLYPH[solved.relation]} ${fmtImproper(solved.boundary)}`;
  const flips = a.n < 0;

  // --- prompt -----------------------------------------------------------
  const prompt = {
    text: bind(variant === "descent" ? skin.context : skin.plain, {
      ineq: statement,
      rate: fmtFraction(rat(Math.abs(a.n), a.d)),
      limit: fmtFraction(rat(Math.abs(b.n), b.d)),
    }),
    units: skin.unit,
    math: [statement],
    figure: {
      kind: "test-point" as const,
      min: Math.floor(solved.boundary.n / solved.boundary.d) - 8,
      max: Math.ceil(solved.boundary.n / solved.boundary.d) + 8,
      points: [solved.boundary.n / solved.boundary.d],
      labels: [GLYPH[solved.relation], isClosed(solved.relation) ? "closed" : "open", shadesRight(solved.relation) ? "right" : "left"],
    },
  };

  // --- worked steps: MUST match the manual's "How to solve it" -----------
  const worked: WorkedStep[] = [
    { text: `x is being ${dividing ? "divided by" : "multiplied by"} ${fmtImproper(a)}, so do the opposite to both sides.`, math: statement },
    {
      text: "Before you write the answer, look at the sign of what you divided or multiplied by.",
      math: `${fmtImproper(a)} is ${flips ? "negative" : "positive"}`,
    },
    {
      text: flips
        ? "Dividing or multiplying by a NEGATIVE reverses the symbol. This is the only rule that does."
        : "It is positive, so the symbol does not move. A negative on the other side does not matter.",
      math: flips ? `${GLYPH[relation]} becomes ${GLYPH[solved.relation]}` : `${GLYPH[relation]} stays ${GLYPH[relation]}`,
    },
    { text: "Write the boundary and shade toward every value that works.", math: `${answerText}, shaded ${shadesRight(solved.relation) ? "right" : "left"}` },
  ];

  // --- distractors from registry error tags -----------------------------
  const candidates: Candidate[] = [
    // no-flip: the value is right but the symbol was not reversed
    { tag: "no-flip", value: `x ${GLYPH[relation]} ${fmtImproper(solved.boundary)}`, when: flips },
    // flip-on-negative-constant: flipped because b is negative, not the divisor
    { tag: "flip-on-negative-constant", value: `x ${GLYPH[flip(relation)]} ${fmtImproper(solved.boundary)}`, when: !flips && b.n < 0 },
    { tag: "flip-on-negative-constant", value: `x ${GLYPH[flip(solved.relation)]} ${fmtImproper(rat(-solved.boundary.n, solved.boundary.d))}`, when: solved.boundary.n !== 0 },
    { tag: "no-flip", value: `x ${GLYPH[solved.relation]} ${fmtImproper(rat(-solved.boundary.n, solved.boundary.d))}`, when: solved.boundary.n !== 0 },
  ];
  const choice = buildChoice(rng, answerText, candidates, (v) => String(v));
  // With a positive coefficient and a non-negative constant neither flip recipe
  // applies, so there may be nothing distinct left to offer.
  const usable = isUsableChoice(choice);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${relation}|${a.n}/${a.d}|${b.n}/${b.d}`),
    format: !usable || rng() < 0.5 ? "expression" : "multiple-choice",
    prompt,
    answer: answerText,
    answerText,
    accept: (input: Answer) => {
      const parsed = parseInequality(String(input));
      return parsed !== null && eqInequality(parsed, solved);
    },
    ...(usable
      ? {
          distractors: choice.distractors,
          options: choice.options,
          optionText: choice.optionText,
          correctIndex: choice.correctIndex,
        }
      : {}),
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, relation, a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}`, flips: flips ? 1 : 0 },
  };
}
