// h8.ee.c7a — One, none, or infinitely many solutions (HONORS)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtFraction, MINUS } from "../../engine/rational";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.c7a";

type Case = "one" | "none" | "infinite";

type Variant =
  | "plain"        // classify after simplifying, integers       (tier 1)
  | "distribute"   // needs distributing first                   (tier 2)
  | "build"        // which equation has no solutions            (tier 3)
  | "context";     // can two flight plans ever coincide         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["plain"],
  2: ["distribute", "plain"],
  3: ["build", "distribute"],
  4: ["context", "build"],
};

const LABELS: Record<Case, string> = {
  one: "ONE SOLUTION",
  none: "NO SOLUTION",
  infinite: "INFINITELY MANY",
};

const SKINS = {
  plans: {
    classify: "How many solutions does this flight equation have? {{eq}}",
    build: "Which of these equations has {{target}}?",
    context: "Plan A and plan B are described by {{eq}}. Do the two plans ever coincide?",
  },
  fuel: {
    classify: "How many solutions does this fuel equation have? {{eq}}",
    build: "Which of these fuel equations has {{target}}?",
    context: "Two fuel plans give {{eq}}. Do they ever match?",
  },
  intercept: {
    classify: "How many solutions does this intercept equation have? {{eq}}",
    build: "Which of these intercept equations has {{target}}?",
    context: "Two tracks give {{eq}}. Do they ever cross?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

const sign = (n: number): string => (n < 0 ? MINUS : "+");
const abs = (n: number): string => String(Math.abs(n));

/**
 * Build an equation of a chosen case.
 *   one       different coefficients, so it solves to a number
 *   none      same coefficient, different constants: a false statement
 *   infinite  identical sides: a true statement
 */
function buildEquation(rng: () => number, kase: Case, distribute: boolean): { text: string; simplified: string } {
  const a = int(rng, 2, 7);
  const b = int(rng, -9, 9);
  const k = distribute ? int(rng, 2, 4) : 1;

  const leftCoef = a * k;
  const leftConst = b * k;

  let rightCoef = leftCoef;
  let rightConst = leftConst;
  if (kase === "one") {
    rightCoef = leftCoef + int(rng, 1, 5);
    rightConst = int(rng, -9, 9);
  } else if (kase === "none") {
    rightConst = leftConst + (rng() < 0.5 ? int(rng, 1, 6) : -int(rng, 1, 6));
  }

  // "7x + 0" is not something anyone writes; drop a zero constant.
  const withConst = (coef: number, konst: number): string =>
    konst === 0 ? `${coef}x` : `${coef}x ${sign(konst)} ${abs(konst)}`;
  const inside = b === 0 ? `${a}x` : `${a}x ${sign(b)} ${abs(b)}`;
  const left = distribute ? `${k}(${inside})` : withConst(leftCoef, leftConst);
  const right = withConst(rightCoef, rightConst);

  const simplified =
    kase === "one"
      ? `x = ${fmtFraction(rat(rightConst - leftConst, leftCoef - rightCoef))}`
      : kase === "none"
        ? `${leftConst} = ${rightConst}`
        : `${leftConst} = ${leftConst}`;

  return { text: `${left} = ${right}`, simplified };
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // The registry asks for the three cases with equal probability.
  const kase = pick(rng, ["one", "none", "infinite"] as Case[]);
  const distribute = variant === "distribute" || (variant === "build" && rng() < 0.5);
  const eq = buildEquation(rng, kase, distribute);

  /* -------- build: pick the equation with a stated outcome ----------- */
  if (variant === "build") {
    const others: Case[] = (["one", "none", "infinite"] as Case[]).filter((c) => c !== kase);
    const pool = [
      eq,
      buildEquation(rng, others[0]!, distribute),
      buildEquation(rng, others[1]!, distribute),
      buildEquation(rng, others[rng() < 0.5 ? 0 : 1]!, distribute),
    ];
    const laid = pool.map((p, i) => ({ p, i }));
    // Rotate deterministically instead of shuffling, so the answer is not always first.
    const offset = int(rng, 0, 3);
    const order = laid.map((_, i) => laid[(i + offset) % laid.length]!);
    const correctIndex = order.findIndex((o) => o.i === 0);
    const optionText = order.map((o) => o.p.text);

    const worked: WorkedStep[] = [
      { text: "Simplify each equation until the x terms are together.", math: optionText[0]! },
      { text: "If the x terms cancel and the numbers disagree, that is a false statement: no solution.", math: LABELS.none },
      { text: "If they cancel and the numbers agree, that is a true statement: every x works.", math: LABELS.infinite },
      { text: "If an x survives, there is exactly one solution. Pick the one you were asked for.", math: LABELS[kase] },
    ];

    const distractors = order
      .filter((_, i) => i !== correctIndex)
      .map((o) => ({ tag: o.p.simplified.includes("x =") ? "zero-means-none" : "true-means-none", value: o.p.text }));

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${optionText.join("|")}`),
      format: "multiple-choice",
      prompt: {
        text: bind(skin.build, { target: LABELS[kase] }),
        figure: { kind: "hanger-diagram" as const, rows: optionText.map((t) => [t]) },
      },
      answer: eq.text,
      answerText: eq.text,
      accept: (input: Answer) => input === eq.text,
      distractors,
      options: optionText,
      optionText,
      correctIndex,
      worked,
      errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [d.value, d.tag])),
      params: { variant, skin: skinKey, kase, set: optionText.join(" | ") },
    };
  }

  /* -------- classify one equation ------------------------------------ */
  const options = [LABELS.one, LABELS.none, LABELS.infinite];
  const correctIndex = options.indexOf(LABELS[kase]);

  const worked: WorkedStep[] = [
    {
      text: distribute ? "Distribute across the brackets first, every term inside." : "Simplify each side as far as it goes.",
      math: eq.text,
    },
    { text: "Move the x terms to one side. Watch what is left.", math: eq.simplified },
    {
      text:
        kase === "one"
          ? "An x survived, so there is exactly one value that works."
          : kase === "none"
            ? "The x terms cancelled and the numbers left behind disagree. A false statement means nothing works."
            : "The x terms cancelled and the numbers left behind agree. A true statement means every value works.",
      math: eq.simplified,
    },
    { text: "Name the case.", math: LABELS[kase] },
  ];

  const candidates: Candidate[] = [
    // zero-means-none: x = 0 read as no solution
    { tag: "zero-means-none", value: LABELS.none, when: kase === "one" },
    // true-means-none: 4 = 4 read as no solution
    { tag: "true-means-none", value: LABELS.none, when: kase === "infinite" },
    { tag: "true-means-none", value: LABELS.infinite, when: kase === "none" },
    { tag: "zero-means-none", value: LABELS.one, when: kase !== "one" },
  ];

  const choice = buildChoice(rng, LABELS[kase], candidates, (x) => String(x), 3);
  void correctIndex;

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${eq.text}`),
    format: "pick-one:one|none|infinite",
    prompt: {
      text: bind(variant === "context" ? skin.context : skin.classify, { eq: eq.text }),
      figure: { kind: "hanger-diagram" as const, rows: [[eq.text], [eq.simplified]] },
    },
    answer: LABELS[kase],
    answerText: LABELS[kase],
    accept: (input: Answer) => input === LABELS[kase],
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, kase, eq: eq.text },
  };
}
