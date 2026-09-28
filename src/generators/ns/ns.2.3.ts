// ns.2.3 — Converting between fractions and decimals
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import {
  rat, fmtFraction, fmtDecimal, fmtRepeating, decimalParts, isTerminating, overline,
} from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ns.2.3";

type Variant =
  | "terminating"   // denominator from 2,4,5,8,10,20,25            (tier 1)
  | "repeating"     // denominator from 3,6,9,11,12                 (tier 2)
  | "to-fraction"   // decimal to a fraction in simplest form       (tier 3)
  | "which-terminates"; // choose terminating vs repeating          (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["terminating"],
  2: ["repeating", "terminating"],
  3: ["to-fraction", "repeating"],
  4: ["which-terminates", "to-fraction"],
};

const TERMINATING_DENOMS = [2, 4, 5, 8, 10, 20, 25] as const;
const REPEATING_DENOMS = [3, 6, 9, 11, 12] as const;

/**
 * Drawing a denominator and then a numerator is not the same as drawing a value.
 * Halves have one coprime numerator and twenty-fifths have twenty, so picking the
 * denominator first makes 1/2 come up as often as every twenty-fifth combined.
 * These lists are the value space, drawn from uniformly. Numerators run past the
 * denominator so the space is large enough for the no-repeat guard to work with.
 */
const MAX_WHOLE = 3;

function valueSpace(denominators: readonly number[]): { n: number; d: number }[] {
  const out: { n: number; d: number }[] = [];
  for (const d of denominators) {
    for (let n = 1; n <= d * MAX_WHOLE; n++) if (gcd(n, d) === 1) out.push({ n, d });
  }
  return out;
}

const TERMINATING_VALUES = valueSpace(TERMINATING_DENOMS);
const REPEATING_VALUES = valueSpace(REPEATING_DENOMS);

/** Decimals with 1-3 places, drawn uniformly over the values rather than the places. */
const DECIMAL_MAX_UNITS = 999;

const SKINS = {
  fuel: {
    unit: "",
    toDecimal: "The fuel gauge reads {{frac}} of a tank. What does the digital readout show?",
    toFraction: "The digital readout shows {{dec}}. What fraction of a tank is that, in simplest form?",
    which: "Which of these gauge fractions gives a readout that ends, instead of repeating forever?",
  },
  mach: {
    unit: "MACH",
    toDecimal: "Airspeed is {{frac}} of Mach 1. Write it as a decimal.",
    toFraction: "Airspeed reads {{dec}} of Mach 1. Write it as a fraction in simplest form.",
    which: "Which of these Mach fractions writes as a decimal that ends?",
  },
  load: {
    unit: "",
    toDecimal: "The load gauge reads {{frac}}. What does the digital readout show?",
    toFraction: "The load readout shows {{dec}}. What fraction is that, in simplest form?",
    which: "Which of these load fractions gives a readout that ends?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; }

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "which-terminates" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the value first ----------------------------------------
  let value: Rational = rat(1, 2);
  let choices: Rational[] = [];
  let rightIndex = 0;

  switch (variant) {
    case "terminating": {
      const v = pick(rng, TERMINATING_VALUES);
      value = rat(v.n, v.d);
      break;
    }
    case "repeating": {
      const v = pick(rng, REPEATING_VALUES);
      value = rat(v.n, v.d);
      break;
    }
    case "to-fraction": {
      // Thousandths drawn uniformly; reducing gives 1, 2 or 3 places naturally.
      value = rat(int(rng, 1, DECIMAL_MAX_UNITS), 1000);
      break;
    }
    case "which-terminates": {
      const draw = (space: { n: number; d: number }[]): Rational => {
        const v = pick(rng, space);
        return rat(v.n, v.d);
      };
      const winner = draw(TERMINATING_VALUES);
      const pool = [winner, draw(REPEATING_VALUES), draw(REPEATING_VALUES), draw(REPEATING_VALUES)];
      choices = shuffle(rng, pool);
      rightIndex = choices.findIndex((c) => isTerminating(c));
      value = choices[rightIndex]!;
      break;
    }
  }

  const parts = decimalParts(value);
  const asDecimal = fmtRepeating(value);
  const asFraction = fmtFraction(value);

  // --- 2. prompt --------------------------------------------------------
  const template = variant === "to-fraction" ? skin.toFraction
    : variant === "which-terminates" ? skin.which : skin.toDecimal;

  const prompt = {
    text: bind(template, { frac: asFraction, dec: fmtDecimal(value) }),
    ...(skin.unit ? { units: skin.unit } : {}),
    figure: {
      kind: "long-division" as const,
      rows: variant === "which-terminates"
        ? choices.map((c) => [fmtFraction(c)])
        : [[`${Math.abs(value.n)} ÷ ${value.d}`, asDecimal]],
      labels: [parts.whole, parts.fixed, parts.repeat],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = variant === "to-fraction"
    ? [
        { text: "Read the last place value. That is the denominator.", math: `${parts.fixed.length === 1 ? "tenths" : parts.fixed.length === 2 ? "hundredths" : "thousandths"}` },
        { text: "Write the digits after the point over that denominator.", math: `${Math.round(Number(`0.${parts.fixed}`) * 10 ** parts.fixed.length)}/${10 ** parts.fixed.length}` },
        { text: "Divide the top and bottom by their greatest common factor.", math: `÷ ${gcd(Math.round(Number(`0.${parts.fixed}`) * 10 ** parts.fixed.length), 10 ** parts.fixed.length)}` },
        { text: "Write the fraction in simplest form.", math: asFraction },
      ]
    : variant === "which-terminates"
      ? [
          { text: "You do not have to divide. Look at the denominator in simplest form.", math: choices.map((c) => fmtFraction(c)).join("   ") },
          { text: "Break the denominator into prime factors.", math: `${value.d} = ${primeFactorString(value.d)}` },
          { text: "Only 2s and 5s make a decimal that ends, because ten is two times five.", math: `${value.d} → 2s and 5s only` },
          { text: "Any other prime factor means the decimal repeats.", math: asFraction },
        ]
      : [
          { text: "Divide the numerator by the denominator. The numerator goes inside.", math: `${Math.abs(value.n)} ÷ ${value.d}` },
          { text: "Bring down a zero and keep dividing, writing each digit after the point.", math: `0.${parts.fixed}${parts.repeat}` },
          { text: "If a remainder comes back, the digits since it first appeared repeat forever.", math: parts.repeat ? `remainder repeats after ${parts.fixed.length} place${parts.fixed.length === 1 ? "" : "s"}` : "remainder reaches 0" },
          { text: parts.repeat ? "Put a bar over the repeating digits." : "The remainder reached zero, so the decimal ends.", math: asDecimal },
        ];

  // --- 4. distractors from registry error tags --------------------------
  const wantsFraction = variant === "to-fraction";
  const fmtAnswer = (x: Answer): string => {
    if (typeof x === "string") return x;
    const r = x as Rational;
    return wantsFraction ? fmtFraction(r) : variant === "which-terminates" ? fmtFraction(r) : fmtRepeating(r);
  };

  if (variant === "which-terminates") {
    const distractors = choices
      .map((value2, i) => ({ tag: "truncate", value: value2, i }))
      .filter((c) => c.i !== rightIndex)
      .map(({ tag, value: v }) => ({ tag, value: v }));
    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${choices.map((c) => `${c.n}/${c.d}`).join(",")}`),
      format: "pick-one:terminates",
      prompt,
      answer: value,
      answerText: fmtFraction(value),
      accept: acceptRational(value),
      distractors,
      options: choices,
      optionText: choices.map((c) => fmtFraction(c)),
      correctIndex: rightIndex,
      worked,
      errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [fmtFraction(d.value as Rational), d.tag])),
      params: { variant, skin: skinKey, set: choices.map((c) => `${c.n}/${c.d}`).join(" ") },
    };
  }

  const flipped = rat(value.d, Math.abs(value.n) || 1);
  const candidates: Candidate[] = [
    // divide-backwards: divides the denominator by the numerator
    { tag: "divide-backwards", value: flipped },
    // bar-placement: the bar lands on the wrong digits
    { tag: "bar-placement", value: `${parts.whole}.${overline(parts.fixed + parts.repeat)}`, when: parts.repeat.length > 0 && parts.fixed.length > 0 },
    // truncate: 1/3 written as 0.33, a rounded value passed off as exact
    { tag: "truncate", value: rat(Math.round(Number(`${parts.whole}.${(parts.fixed + parts.repeat.repeat(4)).slice(0, 2)}`) * 100), 100), when: parts.repeat.length > 0 },
  ];

  const choice = buildChoice(rng, value, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${value.n}/${value.d}`),
    format: wantsFraction ? (rng() < 0.5 ? "fraction" : "multiple-choice") : rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: value,
    answerText: fmtAnswer(value),
    accept: acceptRational(value),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, value: `${value.n}/${value.d}` },
  };
}

function primeFactorString(n: number): string {
  const factors: number[] = [];
  let x = n;
  for (let p = 2; p * p <= x; p++) while (x % p === 0) { factors.push(p); x /= p; }
  if (x > 1) factors.push(x);
  return factors.join(" × ");
}
