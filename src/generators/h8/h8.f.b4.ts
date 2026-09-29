// h8.f.b4 — Construct a linear function to model a relationship
// (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";
import { parseLinear, fmtLinear, type Linear } from "../../engine/linear";

const SKILL = "h8.f.b4";

type Variant =
  | "story"    // a rate and a start, in words             (tier 1)
  | "points"   // two (x, y) pairs                          (tier 2)
  | "table"    // a table with no row at x = 0              (tier 3)
  | "predict"; // build it, then use it                     (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["story"],
  2: ["points", "story"],
  3: ["table", "points"],
  4: ["predict", "table"],
};

const SKINS = {
  fuel: { y: "fuel", unit: "L", x: "minute", verb: "burn", verbs: "burns", falls: true },
  altitude: { y: "altitude", unit: "ft", x: "minute", verb: "lose", verbs: "loses", falls: true },
  credits: { y: "credits", unit: "CR", x: "mission", verb: "earn", verbs: "earns", falls: false },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "predict" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the model ------------------------------------------------------
  // The registry's ranges. A falling skin gets a negative rate, which is the
  // whole point of its `sign-of-rate` error tag.
  const size = int(rng, 1, 15);
  const m = rat(skin.falls ? -size : size);
  // Tier 4 predicts up to twenty steps out, so a falling model has to START
  // with enough to last: "how much fuel is left" must never answer −75 L.
  const floor = skin.falls ? size * 25 : 0;
  const b = rat(floor + int(rng, 0, 60) * 5);

  const line: Linear = { a: m, b };
  const equation = fmtLinear(line);

  // Two points on it, neither at x = 0.
  const x1 = int(rng, 1, 6);
  const x2 = x1 + int(rng, 1, 5);
  const yAt = (x: number): Rational => add(mul(m, rat(x)), b);

  // Tier 4 uses the model once it is built.
  const askAt = int(rng, 7, 20);
  const predicted = yAt(askAt);

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "story"
      ? bind("You start with {{b}} {{unit}} of {{y}} and {{verb}} {{m}} {{unit}} every {{x}}. Write the rule.", {
          b: showNumber(b), unit: skin.unit, y: skin.y, verb: skin.verb, m: fmtInt(size), x: skin.x,
        })
      : variant === "points"
        ? bind("At {{x1}} {{x}}s there were {{y1}} {{unit}}, and at {{x2}} {{x}}s there were {{y2}}. Write the rule.", {
            x1: fmtInt(x1), x: skin.x, y1: showNumber(yAt(x1)), unit: skin.unit,
            x2: fmtInt(x2), y2: showNumber(yAt(x2)),
          })
        : variant === "table"
          ? bind("The log starts at {{x1}} {{x}}s, not at zero: {{list}}. Write the rule.", {
              x1: fmtInt(x1), x: skin.x,
              list: [x1, x1 + 1, x1 + 2].map((x) => `(${x}, ${showNumber(yAt(x))})`).join(" "),
            })
          : bind("{{y}} starts at {{b}} {{unit}} and {{verb}} {{m}} {{unit}} every {{x}}. How much is left after {{n}} {{x}}s?", {
              y: `${skin.y.charAt(0).toUpperCase()}${skin.y.slice(1)}`, b: showNumber(b), unit: skin.unit,
              verb: skin.verbs, m: fmtInt(size), x: skin.x, n: fmtInt(askAt),
            });

  const prompt = {
    text,
    units: skin.unit,
    figure: {
      kind: "table" as const,
      rows: [
        [skin.x.toUpperCase(), ...[x1, x1 + 1, x1 + 2].map(String)],
        [skin.y.toUpperCase(), ...[x1, x1 + 1, x1 + 2].map((x) => showNumber(yAt(x)))],
      ],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the RATE first. From a story it is the 'per' number; from two points it is the change in y divided by the change in x.", math: `m = ${showNumber(m)} per ${skin.x}` },
    { text: "Give it a sign. Something running DOWN has a negative rate, however the sentence is worded.", math: skin.falls ? `${skin.verbs} → m is negative` : `${skin.verbs} → m is positive` },
    { text: "Find the START: the value at x = 0. If the table does not go back that far, work backwards from a row you do have.", math: `b = ${showNumber(yAt(x1))} − ${showNumber(m)} × ${fmtInt(x1)} = ${showNumber(b)}` },
    { text: "Write y = mx + b, then use it: put an x in to predict a y.", math: `${equation}, at x = ${fmtInt(askAt)} → ${showNumber(predicted)}` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${m.n}|${b.n}|${x1},${x2}|${variant === "predict" ? askAt : 0}`);

  // --- 4. tier 4 predicts a number --------------------------------------
  if (variant === "predict") {
    const candidates: Candidate[] = [
      // sign-of-rate: a falling situation modelled with a positive rate
      { tag: "sign-of-rate", value: add(mul(rat(size), rat(askAt)), b), when: skin.falls },
      { tag: "sign-of-rate", value: sub(b, mul(rat(size), rat(askAt))), when: !skin.falls },
      // initial-not-at-zero: the first row used as the start
      { tag: "initial-not-at-zero", value: add(mul(m, rat(askAt)), yAt(x1)) },
      // The amount used rather than the amount left: the change, written the way
      // a player would write it, which on a falling model is positive.
      { tag: "sign-of-rate", value: mul(rat(size), rat(askAt)) },
    ];
    const choice = buildChoice(rng, predicted, candidates, (v: Answer) => showNumber(v as Rational));
    return {
      skill: SKILL, tier, seed, hash,
      format: rng() < 0.5 ? "numeric" : "multiple-choice",
      prompt,
      answer: predicted,
      answerText: showNumber(predicted),
      accept: acceptRational(predicted),
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, m: m.n, b: b.n },
    };
  }

  // --- 5. the rule itself -----------------------------------------------
  const candidates: Candidate[] = [
    // sign-of-rate: the rate written the wrong way round
    { tag: "sign-of-rate", value: fmtLinear({ a: mul(m, rat(-1)), b }) },
    // initial-not-at-zero: the first logged value used as b
    { tag: "initial-not-at-zero", value: fmtLinear({ a: m, b: yAt(x1) }) },
    { tag: "sign-of-rate", value: fmtLinear({ a: b, b: m }) },
  ];
  const choice = buildChoice(rng, equation, candidates, (v: Answer) => String(v));

  return {
    skill: SKILL, tier, seed, hash,
    format: rng() < 0.5 ? "expression" : "multiple-choice",
    prompt,
    answer: equation,
    answerText: equation,
    accept: (input: Answer) => {
      const parsed = parseLinear(String(input).replace(/^y\s*=\s*/i, ""));
      return parsed !== null && parsed.a.n * m.d === m.n * parsed.a.d && parsed.b.n * b.d === b.n * parsed.b.d;
    },
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, m: m.n, b: b.n },
  };
}
