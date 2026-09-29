// h8.sp.a3 — Use a linear model; interpret slope and intercept
// (Grade 8 honors, attached to Chapter 8)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul, div0, fmtInt, fmtDecimal, fmtFraction, isTerminating, MINUS } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.sp.a3";

type Variant =
  | "predict-y"   // put x in, read y out                    (tier 1)
  | "slope"       // what does m mean here                   (tier 2)
  | "intercept"   // what does b mean, and when is it silly  (tier 3)
  | "predict-x";  // work backwards from y                   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["predict-y"],
  2: ["slope", "predict-y"],
  3: ["intercept", "slope"],
  4: ["predict-x", "intercept"],
};

/**
 * `step` is the phrase that follows "each extra", and `yUnit` is short enough to
 * follow any number without a plural. "EACH EXTRA HUNDREDS OF HOURS OF PILOT
 * HOURS ADDS 1 SECONDS" is what a longer unit name produces, and it is not a
 * sentence anyone can read.
 */
const MODELS = {
  fuel: {
    x: "payload", counts: "100 kg of payload", step: "100 KG OF PAYLOAD",
    y: "fuel burn", yUnit: "L/MIN", zero: "an aircraft carrying nothing",
  },
  lock: {
    x: "flying hours", counts: "100 flying hours", step: "100 FLYING HOURS",
    y: "lock time", yUnit: "SEC", zero: "a pilot with no hours at all",
  },
  climb: {
    x: "throttle", counts: "1% of throttle", step: "1% OF THROTTLE",
    y: "climb angle", yUnit: "DEG", zero: "an engine at idle",
  },
} as const;

type ModelKey = keyof typeof MODELS;

const show = (r: Rational): string =>
  (r.d === 1 ? fmtInt(r.n) : isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "predict-x" : pick(rng, VARIANTS[tier]);
  const key = (opts.skin as ModelKey | undefined) ?? pick(rng, Object.keys(MODELS) as ModelKey[]);
  const model = MODELS[key];

  // --- 1. the line ------------------------------------------------------
  // The registry: m in [-5,5] as a simple decimal, b in [0,100]. m is never 0 —
  // a flat model has no slope to interpret — and halves keep the arithmetic
  // exact without needing a calculator.
  const falling = rng() < 0.35;
  // A falling line is kept gentle so the intercept can still hold y above zero
  // across the whole x range: a model predicting a negative fuel burn is not a
  // model of anything.
  const magnitude = falling
    ? (rng() < 0.5 ? rat(int(rng, 1, 5), 2) : rat(int(rng, 1, 2)))
    : (rng() < 0.4 ? rat(int(rng, 1, 9), 2) : rat(int(rng, 1, 5)));
  const m = falling ? mul(magnitude, rat(-1)) : magnitude;
  const floor = falling ? Math.ceil((magnitude.n / magnitude.d) * 20 / 5) * 5 + 5 : 0;
  const b = rat(Math.min(100, floor + int(rng, 0, 20 - floor / 5) * 5));

  const x = rat(int(rng, 2, 20));
  const y = add(mul(m, x), b);

  // Working backwards needs a y that lands on a whole x.
  const targetX = rat(int(rng, 2, 20));
  const targetY = add(mul(m, targetX), b);

  const correct: Rational = variant === "predict-y" ? y : variant === "predict-x" ? targetX : rat(0);

  // A coefficient of 1 is written as x, and b is never negative here, so the
  // sign in the middle is always a plus. Building it from m's sign produced
  // "y = −3.5x 50", an equation with no operator in it at all.
  const coefficient = show(m) === "1" ? "x" : show(m) === `${MINUS}1` ? `${MINUS}x` : `${show(m)}x`;
  const equation = b.n === 0 ? `y = ${coefficient}` : `y = ${coefficient} + ${show(b)}`;
  const sign = m.n >= 0 ? "adds" : "takes off";
  const per = show(m.n < 0 ? mul(m, rat(-1)) : m);

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "predict-y"
      ? bind("A line of fit gives {{eq}}, where x counts {{counts}} and y is {{y}} in {{yu}}. Predict y when x is {{v}}.", {
          eq: equation, counts: model.counts, y: model.y, yu: model.yUnit, v: show(x),
        })
      : variant === "slope"
        ? bind("The model is {{eq}}, where x counts {{counts}} and y is {{y}} in {{yu}}. What does the {{mv}} mean?", {
            eq: equation, counts: model.counts, y: model.y, yu: model.yUnit, mv: show(m),
          })
        : variant === "intercept"
          ? bind("The model is {{eq}}, where x counts {{counts}} and y is {{y}} in {{yu}}. What does the {{bv}} mean?", {
              eq: equation, counts: model.counts, y: model.y, yu: model.yUnit, bv: show(b),
            })
          : bind("The model is {{eq}}, where x counts {{counts}} and y is {{y}} in {{yu}}. What x gives a y of {{ty}}?", {
              eq: equation, counts: model.counts, y: model.y, yu: model.yUnit, ty: show(targetY),
            });

  const prompt = {
    text,
    figure: { kind: "equation" as const, rows: [["MODEL", equation], ["SLOPE", show(m)], ["INTERCEPT", show(b)]] },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Name the two numbers. In y = mx + b, m multiplies x and b stands on its own.", math: `m = ${show(m)}   b = ${show(b)}` },
    { text: "To predict y, put the x value in and work it out. Multiply first, then add.", math: `${show(m)} × ${show(x)} + ${show(b)} = ${show(y)}` },
    { text: "m is a RATE: each extra unit of x adds m to y. Say it with both units or it means nothing.", math: `each extra ${model.counts} ${sign} ${per} ${model.yUnit}` },
    { text: "b is the predicted y when x is 0. Ask whether x = 0 makes sense here before you trust it.", math: `at x = 0, y = ${show(b)} (${model.zero})` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${m.n}/${m.d}|${b.n}|${variant === "predict-x" ? targetX.n : x.n}`);

  // --- 4. the two interpretation variants answer in words ---------------
  if (variant === "slope" || variant === "intercept") {
    const verb = sign === "adds" ? "ADDS" : "TAKES OFF";
    const slopeText = `EACH EXTRA ${model.step} ${verb} ${per} ${model.yUnit}`;
    const interceptText = `WITH NO ${model.x.toUpperCase()} AT ALL, THE MODEL PREDICTS ${show(b)} ${model.yUnit}`;
    const right = variant === "slope" ? slopeText : interceptText;
    const candidates: Candidate[] = [
      // slope-intercept-swap: the two numbers read as each other's meaning
      { tag: "slope-intercept-swap", value: variant === "slope" ? interceptText : slopeText },
      // units-dropped: a rate quoted as a bare number, which says nothing
      { tag: "units-dropped", value: variant === "slope" ? `THE ${model.y.toUpperCase()} GOES UP BY ${per}` : `THE ${model.y.toUpperCase()} IS ${show(b)}` },
      { tag: "slope-intercept-swap", value: `EACH EXTRA ${model.step} ${verb} ${show(b)} ${model.yUnit}` },
      { tag: "units-dropped", value: `THE TOTAL ${model.y.toUpperCase()} IS ${per}` },
    ];
    const choice = buildChoice(rng, right, candidates, (a: Answer) => String(a));
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
      params: { variant, skin: key, m: `${m.n}/${m.d}`, b: b.n },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  // Dividing by b instead of m is a real slip, but it usually lands on a fraction
  // like 57/85 that nobody would write down as an answer, so it is only offered
  // when it comes out whole.
  const dividedByB = b.n === 0 ? null : div0(sub(targetY, b), b);
  const candidates: Candidate[] = [
    // slope-intercept-swap: m and b used the wrong way round
    { tag: "slope-intercept-swap", value: add(mul(b, x), m), when: variant === "predict-y" },
    { tag: "slope-intercept-swap", value: dividedByB ?? rat(0), when: variant === "predict-x" && dividedByB !== null && dividedByB.d === 1 },
    // units-dropped: the multiplication done and the intercept forgotten
    { tag: "units-dropped", value: variant === "predict-y" ? mul(m, x) : () => div0(targetY, m), when: m.n !== 0 },
    // subtracted but never divided, or added x to b and stopped
    { tag: "slope-intercept-swap", value: variant === "predict-y" ? add(x, b) : sub(targetY, b) },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed, hash,
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: key, m: `${m.n}/${m.d}`, b: b.n },
  };
}
