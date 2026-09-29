// h8.ee.c7b — Multi-step equations with variables on both sides (HONORS)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fmtFraction, MINUS } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.c7b";

type Variant =
  | "both-sides"    // ax + b = cx + d, integers                (tier 1)
  | "distribute"    // distribute on one side first             (tier 2)
  | "rational"      // rational coefficients, both sides        (tier 3)
  | "two-plans";    // when do two fuel plans cost the same     (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["both-sides"],
  2: ["distribute", "both-sides"],
  3: ["rational", "distribute"],
  4: ["two-plans", "rational"],
};

const SKINS = {
  fuel: {
    unit: "",
    plain: "Solve the fuel equation for x: {{eq}}",
    plans: "Plan A burns {{a}} L per minute after a {{b}} L start. Plan B burns {{c}} L per minute after a {{d}} L start. After how many minutes are they equal?",
  },
  intercept: {
    unit: "",
    plain: "Solve the intercept equation for x: {{eq}}",
    plans: "You fly {{a}} NM per minute from {{b}} NM out. The bogey flies {{c}} NM per minute from {{d}} NM out. After how many minutes are you level?",
  },
  cost: {
    unit: "",
    plain: "Solve the loadout equation for x: {{eq}}",
    plans: "Loadout A costs {{a}} CR each plus {{b}} CR fixed. Loadout B costs {{c}} CR each plus {{d}} CR fixed. At how many units do they cost the same?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

/** Write nx the way a card should: 1x is x, -1x is −x. */
function term(n: Rational, v = "x"): string {
  if (n.d === 1 && n.n === 1) return v;
  if (n.d === 1 && n.n === -1) return `${MINUS}${v}`;
  return `${fmtFraction(n)}${v}`;
}

function side(coef: Rational, konst: Rational): string {
  if (coef.n === 0) return fmtFraction(konst);
  if (konst.n === 0) return term(coef);
  return `${term(coef)} ${konst.n > 0 ? "+" : MINUS} ${fmtFraction(rat(Math.abs(konst.n), konst.d))}`;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "two-plans" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose x first, then build an equation that has it ----------
  // The two-plans card talks about costs and distances, so the numbers in it
  // have to be quantities a pilot could read: positive x, positive constants.
  const positiveOnly = variant === "two-plans";
  const x = positiveOnly
    ? rat(int(rng, 2, 14))
    : variant === "rational"
      ? rat(int(rng, -12, 12), pick(rng, [1, 2, 3, 4]))
      : rat(int(rng, -12, 12));

  // Plan A must be the steeper one, or the crossing happens before minute zero.
  const a = rat(positiveOnly ? int(rng, 4, 9) : int(rng, 2, 9));
  let c = rat(positiveOnly ? int(rng, 1, 3) : int(rng, 1, 8));
  while (a.n === c.n && a.d === c.d) c = rat(int(rng, 1, 8));

  // Distribution factor, 1 when the variant does not distribute.
  const k = variant === "distribute" ? int(rng, 2, 5) : 1;
  const inner = rat(positiveOnly ? int(rng, 1, 6) : int(rng, -6, 6));

  // Left is k(ax + inner); right is cx + d. Choose d so x is the solution.
  const leftCoef = rat(a.n * k, a.d);
  const leftConst = rat(inner.n * k, inner.d);
  // d = (leftCoef - c) * x + leftConst, exactly.
  const diff = rat(leftCoef.n * c.d - c.n * leftCoef.d, leftCoef.d * c.d);
  const dTimes = rat(diff.n * x.n, diff.d * x.d);
  const d = rat(dTimes.n * leftConst.d + leftConst.n * dTimes.d, dTimes.d * leftConst.d);

  const leftText = k === 1 ? side(leftCoef, leftConst) : `${k}(${side(a, inner)})`;
  const rightText = side(c, d);
  const equation = `${leftText} = ${rightText}`;

  // --- 2. prompt --------------------------------------------------------
  const isPlans = variant === "two-plans";
  const prompt = {
    text: isPlans
      ? bind(skin.plans, {
          a: fmtFraction(leftCoef), b: fmtFraction(leftConst),
          c: fmtFraction(c), d: fmtFraction(d),
        })
      : bind(skin.plain, { eq: equation }),
    figure: {
      kind: "hanger-diagram" as const,
      rows: [[leftText], [rightText]],
      labels: [leftText, rightText],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    {
      text: k === 1 ? "Simplify each side. Combine anything that can be combined." : "Distribute across every term inside the brackets, not just the first one.",
      math: k === 1 ? equation : `${side(leftCoef, leftConst)} = ${rightText}`,
    },
    { text: "Move the variable terms to one side by doing the same thing to both sides. A term that crosses the equals sign changes its sign.", math: `${term(diff)} = ${fmtFraction(d)} ${MINUS} ${fmtFraction(leftConst)}` },
    { text: "Move the constants to the other side the same way.", math: `${term(diff)} = ${fmtFraction(rat(d.n * leftConst.d - leftConst.n * d.d, d.d * leftConst.d))}` },
    { text: "Divide both sides by the coefficient, then check by putting the answer back in.", math: `x = ${fmtFraction(x)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const signError = rat(-x.n, x.d);
  // distribute-partial: only the first term inside the brackets gets multiplied
  const partialDiff = rat(a.n * k * c.d - c.n * a.d, a.d * c.d);
  const partialConst = rat(d.n * inner.d - inner.n * d.d, d.d * inner.d);
  const partial = partialDiff.n === 0 ? null : rat(partialConst.n * partialDiff.d, partialConst.d * partialDiff.n);

  const candidates: Candidate[] = [
    { tag: "move-without-sign-change", value: signError, when: x.n !== 0 },
    { tag: "distribute-partial", value: partial ?? rat(0), when: k > 1 && partial !== null },
    { tag: "distribute-partial", value: rat(x.n + 1, x.d), when: k === 1 },
  ];

  const fmtAnswer = (v: Answer): string => fmtFraction(v as Rational);
  const choice = buildChoice(rng, x, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${leftCoef.n}/${leftCoef.d}|${leftConst.n}/${leftConst.d}|${c.n}/${c.d}|${d.n}/${d.d}|${k}`),
    format: x.d === 1 ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: x,
    answerText: fmtFraction(x),
    accept: acceptRational(x),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, x: `${x.n}/${x.d}`, k, a: `${a.n}/${a.d}`, c: `${c.n}/${c.d}` },
  };
}
