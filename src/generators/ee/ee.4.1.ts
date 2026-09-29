// ee.4.1 — Solving equations using addition or subtraction
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fromDecimal, add, sub, neg, fmtFraction, isTerminating, fmtDecimal, MINUS } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ee.4.1";

type Variant =
  | "plus"      // x + a = b, integers                (tier 1)
  | "minus"     // x - a = b, with negatives          (tier 2)
  | "rational"  // decimal or fraction constants      (tier 3)
  | "context";  // fuel plus reserve equals total     (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["plus"],
  2: ["minus", "plus"],
  3: ["rational", "minus"],
  4: ["context", "rational"],
};

const SKINS = {
  fuel: {
    unit: "L",
    plain: "Fuel computer: solve {{eq}} for x.",
    context: "Your tank plus a {{a}} L reserve comes to {{b}} L. How much is in the tank?",
  },
  altitude: {
    unit: "FT",
    plain: "Altitude computer: solve {{eq}} for x.",
    context: "Your altitude plus a {{a}} ft climb reaches {{b}} ft. What altitude did you start at?",
  },
  credits: {
    unit: "CR",
    plain: "Credit ledger: solve {{eq}} for x.",
    context: "Your balance plus a {{a}} CR bonus comes to {{b}} CR. What was the balance?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose x first, then build an equation that has it ------------
  const rational = variant === "rational";
  // A value drawn as a decimal reads as a decimal; one drawn as a fraction reads
  // as a fraction. Showing 21/8 as 2.625 is technically right and looks like noise.
  const asDecimal = rational && rng() < 0.5;
  const drawRational = (): Rational =>
    asDecimal ? fromDecimal(int(rng, -300, 300) / 10, 1) : rat(int(rng, -40, 40), pick(rng, [2, 4, 5, 8] as const));
  const x: Rational = rational ? drawRational() : rat(int(rng, -40, 40));

  // A context reads as quantities, so both sides stay positive there.
  const positive = variant === "context";
  const a: Rational = positive ? rat(int(rng, 100, 900)) : rational ? drawRational() : rat(int(rng, -40, 40));
  const xShown = positive ? rat(int(rng, 100, 2000)) : x;

  const subtracting = variant === "minus";
  const solution = positive ? xShown : x;
  const b = subtracting ? sub(solution, a) : add(solution, a);

  const show = (r: Rational): string =>
    asDecimal && isTerminating(r) && r.d !== 1 ? fmtDecimal(r) : fmtFraction(r);

  // Fold a negative constant into the sign: "x − 32", never "x + −32".
  const sign = subtracting !== a.n < 0 ? MINUS : "+";
  const magnitude = show(rat(Math.abs(a.n), a.d));
  const eq = `x ${sign} ${magnitude} = ${show(b)}`;

  // --- 2. prompt --------------------------------------------------------
  const prompt = {
    text: bind(variant === "context" ? skin.context : skin.plain, {
      eq, a: show(a), b: show(b),
    }),
    units: skin.unit,
    math: [eq],
    figure: {
      kind: "hanger-diagram" as const,
      rows: [[`x ${sign} ${magnitude}`], [show(b)]],
      labels: [show(solution)],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find what is being done to x, and do the opposite.", math: `x ${sign} ${magnitude}` },
    { text: `Here x has ${magnitude} ${sign === MINUS ? "taken away" : "added"}, so ${sign === MINUS ? "add" : "subtract"} ${magnitude}.`, math: `${sign === MINUS ? "add" : "subtract"} ${magnitude}` },
    { text: "Do it to BOTH sides, or the equation stops being true.", math: `x = ${show(b)} ${sign === MINUS ? "+" : MINUS} ${magnitude}` },
    { text: "Work it out, then check by putting the answer back in.", math: `x = ${show(solution)} ${skin.unit}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // same-op: repeats the operation instead of inverting it
    { tag: "same-op", value: subtracting ? sub(b, a) : add(b, a) },
    // one-side-only: changes one side and leaves the other
    { tag: "one-side-only", value: b },
    { tag: "one-side-only", value: neg(solution), when: solution.n !== 0 },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, solution, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${solution.n}/${solution.d}|${a.n}/${a.d}`),
    format: solution.d === 1 ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: solution,
    answerText: show(solution),
    accept: acceptRational(solution),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, x: `${solution.n}/${solution.d}`, a: `${a.n}/${a.d}` },
  };
}
