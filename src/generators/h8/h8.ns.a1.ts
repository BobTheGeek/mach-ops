// h8.ns.a1 — Rational vs irrational; repeating decimals to fractions (HONORS)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtFraction, overline } from "../../engine/rational";
import {
  qSqrt, qPi, qRational, qDecimal, isIrrational, repeatingToFraction, trickPowers, type Quantity,
} from "../../engine/quantity";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.ns.a1";

type Variant =
  | "classify"      // is this number rational or irrational?          (tier 1)
  | "one-digit"     // 0.333... to a fraction                          (tier 2)
  | "two-digit"     // 0.4545... to a fraction                         (tier 3)
  | "classify-roots"; // perfect vs non-perfect squares in a list      (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["classify"],
  2: ["one-digit", "classify"],
  3: ["two-digit", "one-digit"],
  4: ["classify-roots", "two-digit"],
};

const SKINS = {
  sensor: {
    classify: "The sensor reads {{value}}. Is that reading a rational number?",
    toFraction: "The sensor repeats: {{decimal}}. Write the reading as a fraction.",
    roots: "Which of these readings is irrational?",
  },
  mach: {
    classify: "Airspeed reads {{value}} of Mach 1. Is that a rational number?",
    toFraction: "The Mach readout repeats: {{decimal}}. Write it as a fraction.",
    roots: "Which of these Mach values is irrational?",
  },
  range: {
    classify: "The range computer shows {{value}} NM. Is that a rational number?",
    toFraction: "The range readout repeats: {{decimal}}. Write it as a fraction.",
    roots: "Which of these ranges is irrational?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

/** The registry's own foil list: sqrt(49), 0.25, 22/7, pi, sqrt(50). */
/**
 * The registry names the kinds of foil (sqrt(49), 0.25, 22/7, pi, sqrt(50)); the
 * lists are generated rather than hand-written so the space is large enough for
 * the no-repeat guard to work with. A fixed list of about fifty ran the guard out
 * inside a single twenty-problem mission.
 */
const RATIONAL_FOILS: Quantity[] = [
  // perfect squares: a root that is a whole number
  ...Array.from({ length: 20 }, (_, i) => qSqrt((i + 2) ** 2)),
  // decimals that end
  ...([[1, 4, "0.25"], [3, 5, "0.6"], [7, 8, "0.875"], [1, 2, "0.5"], [-3, 4, "−0.75"],
       [1, 8, "0.125"], [9, 10, "0.9"], [3, 20, "0.15"], [7, 25, "0.28"], [-1, 5, "−0.2"]] as const)
    .map(([n, d, text]) => qDecimal(rat(n, d), text)),
  // fractions of whole numbers, including the classic pi impostor 22/7
  ...([[22, 7], [5, 8], [-7, 3], [11, 6], [9, 5], [-2, 9], [13, 4], [17, 1], [-6, 1], [0, 1],
       [3, 7], [15, 11], [-8, 13], [19, 12], [23, 6], [-11, 4], [29, 9], [7, 16]] as const)
    .map(([n, d]) => qRational(rat(n, d))),
];

const IRRATIONAL_FOILS: Quantity[] = [
  // every non-square radicand up to 225 is an irrational root
  ...Array.from({ length: 224 }, (_, i) => i + 2)
    .filter((n) => !Number.isInteger(Math.sqrt(n)))
    .map((n) => qSqrt(n)),
  ...Array.from({ length: 6 }, (_, i) => qPi(i + 1)),
];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "classify-roots" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  /* -------- classify: one value, rational or not ---------------------- */
  if (variant === "classify") {
    const rational = rng() < 0.5;
    const q = pick(rng, rational ? RATIONAL_FOILS : IRRATIONAL_FOILS);
    const yes = !isIrrational(q);

    const options = ["RATIONAL", "IRRATIONAL"];
    const correctIndex = yes ? 0 : 1;
    const wrongTag = q.label.startsWith("√")
      ? "sqrt-always-irrational"     // sqrt(49) marked irrational
      : "long-decimal-irrational";   // a long or repeating decimal marked irrational

    const worked: WorkedStep[] = [
      { text: "Ask whether the number can be written as a fraction of two whole numbers.", math: q.label },
      {
        text: q.label.startsWith("√")
          ? "For a square root, ask whether the number under the root is a perfect square."
          : "A decimal that ends or repeats is rational; one that never ends and never repeats is not.",
        math: q.label.startsWith("√") ? `is there a whole number whose square is ${q.label.slice(1)}?` : q.label,
      },
      {
        text: q.rational ? "It can, so write the fraction it equals." : "It cannot, so no fraction of whole numbers will ever give it.",
        math: q.rational ? `${q.label} = ${fmtFraction(q.rational)}` : `${q.label} never ends and never repeats`,
      },
      { text: "Name it.", math: yes ? "RATIONAL" : "IRRATIONAL" },
    ];

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${q.label}`),
      format: "yes-no",
      prompt: {
        text: bind(skin.classify, { value: q.label }),
        figure: { kind: "number-line" as const, min: -4, max: 8, points: [q.value], labels: [q.label] },
      },
      answer: options[correctIndex]!,
      answerText: options[correctIndex]!,
      accept: (input: Answer) => input === options[correctIndex],
      distractors: [{ tag: wrongTag, value: options[1 - correctIndex]! }],
      options,
      optionText: options,
      correctIndex,
      worked,
      errorTagsByAnswer: { [options[1 - correctIndex]!]: wrongTag },
      params: { variant, skin: skinKey, value: q.label },
    };
  }

  /* -------- classify-roots: pick the irrational from a list ----------- */
  if (variant === "classify-roots") {
    const odd = pick(rng, IRRATIONAL_FOILS);
    const rest = shuffle(rng, RATIONAL_FOILS).slice(0, 3);
    const laid = shuffle(rng, [odd, ...rest]);
    const correctIndex = laid.findIndex((q) => q.label === odd.label);
    const optionText = laid.map((q) => q.label);

    const worked: WorkedStep[] = [
      { text: "Take each value in turn and ask whether it can be written as a fraction.", math: optionText.join("   ") },
      { text: "A root is rational only when what is under it is a perfect square.", math: "√49 = 7, but √50 is not a whole number" },
      { text: "A decimal that ends or repeats is rational; pi never does either.", math: "0.25 and 22/7 are fractions; π is not" },
      { text: "The one that cannot be written as a fraction is the irrational one.", math: odd.label },
    ];

    const distractors = laid
      .filter((_, i) => i !== correctIndex)
      .map((q) => ({ tag: q.label.startsWith("√") ? "sqrt-always-irrational" : "long-decimal-irrational", value: q.label }));

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${optionText.join(",")}`),
      format: "multiple-choice",
      prompt: {
        text: skin.roots,
        figure: { kind: "number-line" as const, min: -2, max: 10, points: laid.map((q) => q.value), labels: optionText },
      },
      answer: odd.label,
      answerText: odd.label,
      accept: (input: Answer) => input === odd.label,
      distractors,
      options: optionText,
      optionText,
      correctIndex,
      worked,
      errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [d.value, d.tag])),
      params: { variant, skin: skinKey, set: optionText.join(" ") },
    };
  }

  /* -------- repeating decimal to a fraction --------------------------- */
  const repeatLength = variant === "two-digit" ? 2 : 1;
  // "0.d repeating" alone is nine problems. A whole part and an optional
  // non-repeating digit after the point widen it without changing the method:
  // 1.16 repeating is still x, multiply, subtract. The registry fixes the number
  // of repeating digits, not what sits in front of them.
  const whole = String(int(rng, 0, 9));
  const fixed = rng() < 0.5 ? String(int(rng, 0, 9)) : "";
  let repeat = String(int(rng, 1, 10 ** repeatLength - 1)).padStart(repeatLength, "0");
  if (repeatLength === 2 && repeat[0] === repeat[1]) repeat = `${repeat[0]}${(Number(repeat[1]) + 1) % 10}`;
  // A fixed digit equal to the repeat is really just a longer repeat.
  if (fixed !== "" && fixed === repeat[0]) repeat = `${(Number(repeat[0]) + 1) % 10}${repeat.slice(1)}`;
  if (repeat === "0".repeat(repeatLength)) repeat = "1".padStart(repeatLength, "0");

  const correct = repeatingToFraction(whole, fixed, repeat);
  const powers = trickPowers(fixed, repeat);
  // Either write the bar or write the digits out; doing both reads as a typo.
  const decimalText = `${whole}.${fixed}${repeat}${repeat}${repeat}…`;
  const barText = `${whole}.${fixed}${overline(repeat)}`;

  const worked: WorkedStep[] = [
    { text: "Give the repeating decimal a name.", math: `x = ${barText}` },
    {
      text: fixed === ""
        ? `Multiply by ${powers.high} — one power of ten for each repeating digit — so the repeat lines up.`
        : `Multiply by ${powers.low} to clear the digit that does not repeat, and by ${powers.high} to line the repeat up.`,
      math: `${powers.high}x = ${Number(`${whole}${fixed}${repeat}`)}.${repeat}${repeat}…`,
    },
    {
      text: "Subtract the smaller multiple from the larger. The repeating tails cancel.",
      math: `${powers.high - powers.low}x = ${Number(`${whole}${fixed}${repeat}`) - Number(`${whole}${fixed}`)}`,
    },
    { text: "Divide, then simplify.", math: `x = ${fmtFraction(correct)}` },
  ];

  // multiply-wrong-power: uses 10x for a two-digit repeat
  const wrongPower = repeatingToFraction(whole, fixed, repeat.slice(0, 1));
  const candidates: Candidate[] = [
    { tag: "multiply-wrong-power", value: wrongPower, when: repeatLength === 2 },
    // treating the repeating digits as if they simply stopped: the same wrong
    // power of ten, applied by cutting the decimal short
    { tag: "multiply-wrong-power", value: rat(Number(`${whole}${fixed}${repeat}`), 10 ** (fixed.length + repeatLength)) },
    { tag: "multiply-wrong-power", value: rat(Number(repeat), 10 ** repeatLength) },
    { tag: "long-decimal-irrational", value: rat(Number(repeat), 9 * 10 ** (repeatLength - 1)), when: repeatLength === 2 },
  ];

  const fmtAnswer = (x: Answer): string => fmtFraction(x as { n: number; d: number });
  const choice = buildChoice(rng, correct, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${whole}|${fixed}|${repeat}`),
    format: rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt: {
      text: bind(skin.toFraction, { decimal: decimalText }),
      figure: { kind: "algebra-trick-10x" as const, rows: [[`x = ${whole}.${repeat}…`], [`${powers.high}x = ${Number(repeat)}.${repeat}…`]] },
    },
    answer: correct,
    answerText: fmtFraction(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, whole, fixed, repeat },
  };
}
