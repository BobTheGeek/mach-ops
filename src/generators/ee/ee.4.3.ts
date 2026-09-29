// ee.4.3 — Solving two-step equations
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul, div0, fmtFraction, fmtImproper, MINUS } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ee.4.3";

type Variant =
  | "standard"   // px + q = r, positive                     (tier 1)
  | "negatives"  // negative p or q, or x on the right       (tier 2)
  | "bracket"    // p(x + q) = r                             (tier 3)
  | "context";   // write the equation, then solve           (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["standard"],
  2: ["negatives", "standard"],
  3: ["bracket", "negatives"],
  4: ["context", "bracket"],
};

const SKINS = {
  waypoint: {
    unit: "MIN",
    plain: "Navigation computer: solve {{eq}} for x.",
    context: "You fly {{p}} NM every minute and you have already covered {{q}} NM. The waypoint is {{r}} NM out. How many more minutes?",
  },
  fuel: {
    unit: "L",
    plain: "Fuel computer: solve {{eq}} for x.",
    context: "Each tank holds {{p}} L and the reserve holds {{q}} L. The total is {{r}} L. How much is in each tank?",
  },
  ordnance: {
    unit: "CR",
    plain: "Loadout ledger: solve {{eq}} for x.",
    context: "Each missile costs {{p}} CR and the fitting fee is {{q}} CR. The bill is {{r}} CR. How many missiles?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

/** The registry asks for the equation form to rotate, not just the numbers. */
type Form = "px+q=r" | "r=px+q" | "q+px=r" | "px-q=r";
const FORMS: Form[] = ["px+q=r", "r=px+q", "q+px=r", "px-q=r"];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose x first, then build an equation that has it ------------
  const isContext = variant === "context";
  const isBracket = variant === "bracket";

  const x: Rational = isContext ? rat(int(rng, 2, 20)) : rat(int(rng, -20, 20));
  const p: Rational = isContext
    ? rat(int(rng, 2, 12))
    : variant === "bracket" && rng() < 0.4
      ? rat(1, pick(rng, [2, 3, 4] as const))
      : rat(variant === "negatives" && rng() < 0.5 ? -int(rng, 2, 12) : int(rng, 2, 12));
  const q: Rational = isContext ? rat(int(rng, 10, 400)) : rat(int(rng, -40, 40));

  // px + q = r, or p(x + q) = r for the bracket form.
  const r = isBracket ? mul(p, add(x, q)) : add(mul(p, x), q);
  const form: Form = isBracket ? "px+q=r" : pick(rng, FORMS);

  const pText = fmtImproper(p);
  const qAbs = fmtFraction(rat(Math.abs(q.n), q.d));
  const qSign = q.n < 0 ? MINUS : "+";
  const px = `${pText}x`;

  const eq = isBracket
    ? `${pText}(x ${qSign} ${qAbs}) = ${fmtFraction(r)}`
    : form === "px+q=r" ? `${px} ${qSign} ${qAbs} = ${fmtFraction(r)}`
      : form === "r=px+q" ? `${fmtFraction(r)} = ${px} ${qSign} ${qAbs}`
        : form === "q+px=r" ? `${fmtFraction(q)} + ${px} = ${fmtFraction(r)}`
          : `${px} ${MINUS} ${fmtFraction(rat(Math.abs(q.n), q.d))} = ${fmtFraction(add(mul(p, x), rat(-Math.abs(q.n), q.d)))}`;

  // The px-q form changes r, so recompute the solution for it.
  const solution = x;

  // --- 2. prompt --------------------------------------------------------
  const prompt = {
    text: bind(isContext ? skin.context : skin.plain, {
      eq, p: fmtFraction(p), q: fmtFraction(q), r: fmtFraction(r),
    }),
    units: skin.unit,
    math: [eq],
    figure: {
      kind: (isBracket ? "tape-diagram" : "hanger-diagram") as "tape-diagram" | "hanger-diagram",
      rows: [[isBracket ? `${pText}(x ${qSign} ${qAbs})` : `${px} ${qSign} ${qAbs}`], [fmtFraction(r)]],
      labels: [fmtFraction(solution)],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const afterShift = isBracket ? div0(r, p) : sub(r, q);
  const worked: WorkedStep[] = [
    { text: "Two things are being done to x. Undo them in the opposite order to how they were done.", math: eq },
    {
      text: isBracket
        ? "The brackets are multiplied by the outside number, so divide both sides by it first."
        : "Undo the adding or subtracting first, on both sides.",
      math: isBracket ? `x ${qSign} ${qAbs} = ${fmtFraction(afterShift)}` : `${px} = ${fmtFraction(afterShift)}`,
    },
    {
      text: isBracket ? "Now undo what is left inside the brackets." : "Now undo the multiplying, by dividing both sides by the coefficient.",
      math: isBracket ? `x = ${fmtFraction(sub(afterShift, q))}` : `x = ${fmtFraction(div0(afterShift, p))}`,
    },
    { text: "Check by putting the answer back into the original equation.", math: `x = ${fmtFraction(solution)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // wrong-order: divides before subtracting
    { tag: "wrong-order", value: sub(div0(r, p), q), when: !isBracket },
    // paren-confusion: p(x+q) read as px + q, or the reverse
    { tag: "paren-confusion", value: isBracket ? div0(sub(r, q), p) : div0(sub(r, q), p), when: isBracket },
    { tag: "paren-confusion", value: sub(div0(r, p), q), when: isBracket },
    // sign-error: the sign on q slips
    { tag: "sign-error", value: div0(add(r, q), p), when: !isBracket },
    { tag: "sign-error", value: add(div0(r, p), q), when: isBracket },
    // divide-one-term: only the x term gets divided
    { tag: "divide-one-term", value: sub(r, mul(q, p)), when: !isBracket },
    { tag: "divide-one-term", value: sub(r, q), when: isBracket },
  ];

  const fmt = (v: Answer): string => fmtFraction(v as Rational);
  const choice = buildChoice(rng, solution, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${form}|${solution.n}/${solution.d}|${p.n}/${p.d}|${q.n}/${q.d}`),
    format: solution.d === 1 ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: solution,
    answerText: fmtFraction(solution),
    accept: acceptRational(solution),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, form, x: `${solution.n}/${solution.d}`, p: `${p.n}/${p.d}`, q: `${q.n}/${q.d}` },
  };
}
