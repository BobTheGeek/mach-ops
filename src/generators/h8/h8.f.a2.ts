// h8.f.a2 — Compare linear functions across representations
// (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul, div0, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.f.a2";

type Variant =
  | "rate"     // the rate of change out of a table or a graph  (tier 1)
  | "start"    // the initial value from words or an equation    (tier 2)
  | "which"    // which one is faster, or starts higher          (tier 3)
  | "swap";    // translate one form into another                (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["rate"],
  2: ["start", "rate"],
  3: ["which", "start"],
  4: ["swap", "which"],
};

type Form = "TABLE" | "GRAPH" | "EQUATION" | "WORDS";

const SKINS = {
  fuel: { thing: "fuel plan", a: "TANKER A", b: "TANKER B", unit: "L", per: "minute" },
  climb: { thing: "climb profile", a: "LEAD", b: "WINGMAN", unit: "ft", per: "minute" },
} as const;

type SkinKey = keyof typeof SKINS;

/**
 * A tie has no "which one is faster", so those draws are retried on a salted
 * stream rather than by calling generate() again with a different seed: a
 * Problem must report the seed it was ASKED for.
 */
export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  return build(tier, seed, opts, 0);
}

const RETRY_SALT = 8191;
const MAX_RETRIES = 8;

function build(tier: Tier, seed: number, opts: GenerateOpts, attempt: number): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed + attempt * RETRY_SALT}`));
  const variant = opts.transfer && tier === 4 ? "swap" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. two functions, in two different forms --------------------------
  // The registry's ranges. The step in x is never 1, because reading the change
  // in y WITHOUT dividing by the change in x is this skill's own error tag and
  // a step of 1 would hide it.
  const stepX = int(rng, 2, 5);
  const m1 = rat(int(rng, 1, 5) * (rng() < 0.3 ? -1 : 1));
  const m2 = rat(int(rng, 1, 5) * (rng() < 0.3 ? -1 : 1));
  const b1 = rat(int(rng, -4, 20) * 5);
  const b2 = rat(int(rng, -4, 20) * 5);

  const formA: Form = pick(rng, ["TABLE", "GRAPH"] as Form[]);

  const yAt = (m: Rational, b: Rational, x: number): Rational => add(mul(m, rat(x)), b);
  const xs = [stepX, stepX * 2, stepX * 3];

  const askRate = variant === "rate" || (variant === "which" && rng() < 0.5);
  const correct: Rational = variant === "rate" ? m1
    : variant === "start" ? b2
      : variant === "swap" ? m2
        : rat(0);

  const describe = (m: Rational, b: Rational): string =>
    `starts at ${showNumber(b)} ${skin.unit} and changes by ${showNumber(m)} ${skin.unit} every ${skin.per}`;
  const equation = (m: Rational, b: Rational): string =>
    `y = ${showNumber(m)}x ${b.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(b.n))}`;

  // --- 2. prompt --------------------------------------------------------
  const tableText = xs.map((x) => `(${x}, ${showNumber(yAt(m1, b1, x))})`).join(" ");
  const text =
    variant === "rate"
      ? bind("{{a}}'s {{thing}} reads {{list}}. What is its RATE OF CHANGE per {{per}}?", {
          a: skin.a, thing: skin.thing, list: tableText, per: skin.per,
        })
      : variant === "start"
        ? bind("{{b}} {{desc}}. What is its INITIAL value?", { b: skin.b, desc: describe(m2, b2) })
        : variant === "which"
          ? bind("{{a}} reads {{list}}. {{b}} follows {{eq}}. Which one {{ask}}?", {
              a: skin.a, list: tableText, b: skin.b, eq: equation(m2, b2),
              ask: askRate ? "CHANGES FASTER" : "STARTS HIGHER",
            })
          : bind("{{b}} {{desc}}. Written as an equation, what is its RATE?", { b: skin.b, desc: describe(m2, b2) });

  const prompt = {
    text,
    units: `${skin.unit} per ${skin.per}`,
    figure: {
      kind: (formA === "GRAPH" ? "coordinate-plane" : "table") as "coordinate-plane" | "table",
      rows: [["X", ...xs.map(String)], ["Y", ...xs.map((x) => showNumber(yAt(m1, b1, x)))]],
      series: [xs.map((x) => [x, yAt(m1, b1, x).n / yAt(m1, b1, x).d])],
      max: Math.max(...xs) + 1,
      maxY: 100,
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the RATE OF CHANGE in each: how much y moves for each 1 of x. In an equation it is the number next to x.", math: `${showNumber(m1)} and ${showNumber(m2)}` },
    { text: "From a table, divide the change in y by the change in x. The change in y on its own is not the rate unless x steps by 1.", math: `${showNumber(mul(m1, rat(stepX)))} ÷ ${fmtInt(stepX)} = ${showNumber(m1)}` },
    { text: "Find the INITIAL value in each: the y when x is 0. In an equation it is the number on its own.", math: `${showNumber(b1)} and ${showNumber(b2)}` },
    { text: "Now compare like with like. 'Faster' compares the rates; 'starts higher' compares the initial values.", math: askRate ? "compare rates" : "compare starts" },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${m1.n},${b1.n}|${m2.n},${b2.n}|${stepX}|${askRate}`);

  // --- 4. "which one" names a function ----------------------------------
  if (variant === "which") {
    const aWins = askRate
      ? Math.abs(m1.n / m1.d) > Math.abs(m2.n / m2.d)
      : b1.n * b2.d > b2.n * b1.d;
    // A tie has no answer, so it is redrawn on a salted stream.
    const tied = askRate ? Math.abs(m1.n / m1.d) === Math.abs(m2.n / m2.d) : b1.n * b2.d === b2.n * b1.d;
    if (tied && attempt < MAX_RETRIES) return build(tier, seed, opts, attempt + 1);
    const right = aWins ? skin.a : skin.b;
    const foil = aWins ? skin.b : skin.a;
    const options = [skin.a, skin.b];
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: [{ tag: "rate-vs-initial-swap", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: "rate-vs-initial-swap" },
      params: { variant, skin: skinKey, askRate: String(askRate) },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // rate-vs-initial-swap: the intercept given where the rate was asked for
    { tag: "rate-vs-initial-swap", value: variant === "start" ? m2 : b1 },
    // table-rate-unscaled: the change in y with no dividing by the change in x
    { tag: "table-rate-unscaled", value: mul(correct, rat(stepX)) },
    { tag: "table-rate-unscaled", value: div0(correct, rat(stepX)), when: correct.n !== 0 },
    { tag: "rate-vs-initial-swap", value: m2, when: variant === "rate" },
  ];
  const choice = buildChoice(rng, correct, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed, hash,
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: showNumber(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, askRate: String(askRate) },
  };
}
