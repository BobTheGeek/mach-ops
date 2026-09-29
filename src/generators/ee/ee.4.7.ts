// ee.4.7 — Solving two-step inequalities
// Shape follows content/examples/generators/ns.1.4.ts.
//
// Two-step equations plus the flip rule. Tier 4 answers a count, so the boundary
// has to be interpreted rather than read off: 3.5 missiles is 3 missiles.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul, div0, toNumber, fmtFraction, fmtImproper, MINUS } from "../../engine/rational";
import {
  ineq, flip, GLYPH, isClosed, shadesRight, divideBy, shiftBy, parseInequality, eqInequality, type Relation,
} from "../../engine/inequality";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ee.4.7";

type Variant =
  | "positive"  // px + q < r, all positive                  (tier 1)
  | "flip"      // negative p, so the symbol reverses        (tier 2)
  | "bracket"   // p(x + q) >= r, rational coefficients      (tier 3)
  | "count";    // a limit answered as a whole count         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["positive"],
  2: ["flip", "positive"],
  3: ["bracket", "flip"],
  4: ["count", "bracket"],
};

const SKINS = {
  ordnance: {
    unit: "",
    plain: "Loadout computer: solve {{ineq}} for x.",
    count: "Each store weighs {{p}} lb and the rack weighs {{q}} lb. Maximum ordnance is {{r}} lb. How many stores can you carry?",
    noun: "stores",
  },
  fuel: {
    unit: "",
    plain: "Fuel computer: solve {{ineq}} for x.",
    count: "Each leg burns {{p}} L and start-up burns {{q}} L. You have {{r}} L. How many legs can you fly?",
    noun: "legs",
  },
  credits: {
    unit: "",
    plain: "Credit ledger: solve {{ineq}} for x.",
    count: "Each upgrade costs {{p}} CR and the fitting fee is {{q}} CR. Your budget is {{r}} CR. How many upgrades?",
    noun: "upgrades",
  },
} as const;

type SkinKey = keyof typeof SKINS;
const ALL: Relation[] = ["lt", "le", "gt", "ge"];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "count" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  const isCount = variant === "count";
  const isBracket = variant === "bracket";
  const relation: Relation = isCount ? "le" : pick(rng, ALL);

  let p: Rational;
  switch (variant) {
    case "positive": p = rat(int(rng, 2, 12)); break;
    case "flip": p = rat(-int(rng, 2, 12)); break;
    case "bracket": p = rng() < 0.4 ? rat(1, pick(rng, [2, 3, 4] as const)) : rat(int(rng, -9, -2) || -2); break;
    // Even, so that a half-integer boundary still leaves a whole total: nobody
    // has 9,629 and a half litres.
    case "count": p = rat(int(rng, 10, 150) * 2); break;
  }
  const q: Rational = isCount ? rat(int(rng, 50, 400)) : rat(int(rng, -40, 40));

  // A count question needs a boundary that is not a whole number, or there is
  // nothing to interpret. The rest take a clean boundary.
  const boundaryX: Rational = isCount
    ? rat(int(rng, 5, 40) * 2 + 1, 2)
    : rat(int(rng, -20, 20));

  const r = isBracket ? mul(p, add(boundaryX, q)) : add(mul(p, boundaryX), q);

  const qAbs = fmtFraction(rat(Math.abs(q.n), q.d));
  const qSign = q.n < 0 ? MINUS : "+";
  const statement = isBracket
    ? `${fmtImproper(p)}(x ${qSign} ${qAbs}) ${GLYPH[relation]} ${fmtFraction(r)}`
    : `${fmtImproper(p)}x ${qSign} ${qAbs} ${GLYPH[relation]} ${fmtFraction(r)}`;

  // Solve: undo the constant, then divide, flipping only for a negative divisor.
  const afterShift = isBracket ? divideBy(ineq(relation, r), p) : shiftBy(ineq(relation, r), rat(-q.n, q.d));
  const solved = isBracket
    ? shiftBy(afterShift, rat(-q.n, q.d))
    : divideBy(afterShift, p);
  const flips = toNumber(p) < 0;

  // --- prompt -----------------------------------------------------------
  const countAnswer = Math.floor(toNumber(solved.boundary));
  const answerText = isCount ? String(countAnswer) : `x ${GLYPH[solved.relation]} ${fmtImproper(solved.boundary)}`;

  const prompt = {
    text: bind(isCount ? skin.count : skin.plain, {
      ineq: statement, p: fmtFraction(p), q: fmtFraction(q), r: fmtFraction(r),
    }),
    ...(skin.unit ? { units: skin.unit } : {}),
    math: [statement],
    figure: {
      kind: "number-line" as const,
      min: Math.floor(toNumber(solved.boundary)) - 8,
      max: Math.ceil(toNumber(solved.boundary)) + 8,
      points: [toNumber(solved.boundary)],
      labels: [GLYPH[solved.relation], isClosed(solved.relation) ? "closed" : "open", shadesRight(solved.relation) ? "right" : "left"],
    },
  };

  // --- worked steps: MUST match the manual's "How to solve it" -----------
  const worked: WorkedStep[] = [
    { text: "Two things are being done to x. Undo the adding or subtracting first, on both sides.", math: statement },
    {
      text: isBracket ? "Here the brackets come first, so divide both sides by the outside number." : "Now undo the multiplying by dividing both sides by the coefficient.",
      math: `x ${GLYPH[afterShift.relation]} ${fmtImproper(afterShift.boundary)}`,
    },
    {
      text: flips
        ? "You divided by a NEGATIVE, so reverse the symbol. Nothing else reverses it."
        : "You divided by a positive, so the symbol does not move.",
      math: flips ? `${GLYPH[relation]} becomes ${GLYPH[solved.relation]}` : `${GLYPH[solved.relation]} unchanged`,
    },
    {
      text: isCount
        ? `You cannot carry part of a store. Round DOWN to the last whole number that still fits.`
        : "Write the boundary and shade toward every value that works.",
      math: isCount
        ? `x ${GLYPH[solved.relation]} ${fmtImproper(solved.boundary)} → ${countAnswer} ${skin.noun}`
        : `${answerText}, shaded ${shadesRight(solved.relation) ? "right" : "left"}`,
    },
  ];

  // --- distractors from registry error tags -----------------------------
  if (isCount) {
    const candidates: Candidate[] = [
      // fractional-count: reports the boundary itself, stores and all
      { tag: "fractional-count", value: rat(Math.ceil(toNumber(solved.boundary))) },
      // divide-one-term: divides r by p without removing the fixed cost first
      { tag: "divide-one-term", value: rat(Math.floor(toNumber(div0(r, p)))) },
      // no-flip has no meaning with a positive coefficient; the count slip stands in
      { tag: "fractional-count", value: rat(countAnswer + 1) },
      { tag: "divide-one-term", value: rat(Math.max(0, countAnswer - 1)) },
    ];
    const fmt = (v: Answer): string => fmtFraction(v as Rational);
    const choice = buildChoice(rng, rat(countAnswer), candidates, fmt);

    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${p.n}|${q.n}|${r.n}/${r.d}`),
      format: rng() < 0.5 ? "numeric" : "multiple-choice",
      prompt,
      answer: rat(countAnswer),
      answerText,
      accept: acceptRational(rat(countAnswer)),
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, p: `${p.n}/${p.d}`, q: `${q.n}/${q.d}`, boundary: `${solved.boundary.n}/${solved.boundary.d}` },
    };
  }

  const candidates: Candidate[] = [
    { tag: "no-flip", value: `x ${GLYPH[relation]} ${fmtImproper(solved.boundary)}`, when: flips },
    // wrong order: divided before shifting
    { tag: "divide-one-term", value: `x ${GLYPH[solved.relation]} ${fmtImproper(sub(div0(r, p), q))}`, when: !isBracket },
    { tag: "divide-one-term", value: `x ${GLYPH[solved.relation]} ${fmtImproper(sub(r, q))}`, when: isBracket },
    { tag: "fractional-count", value: `x ${GLYPH[flip(solved.relation)]} ${fmtImproper(solved.boundary)}` },
  ];
  const choice = buildChoice(rng, answerText, candidates, (v) => String(v));

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${relation}|${p.n}/${p.d}|${q.n}/${q.d}|${boundaryX.n}/${boundaryX.d}`),
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
    params: { variant, skin: skinKey, relation, p: `${p.n}/${p.d}`, q: `${q.n}/${q.d}` },
  };
}
