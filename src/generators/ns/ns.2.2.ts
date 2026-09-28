// ns.2.2 — Dividing integers
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt, fmtFraction, fmtDecimal, isTerminating, toNumber, MINUS } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "ns.2.2";

type Variant =
  | "one-negative"    // exact quotient, one factor negative      (tier 1)
  | "two-negative"    // exact quotient, both negative            (tier 2)
  | "equiv-forms"     // pick the form NOT equal to -(p/q)        (tier 3)
  | "fraction-result" // 7 / (-2) = -3.5                          (tier 3)
  | "rate-context";   // total change / time -> rate per minute   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["one-negative"],
  2: ["two-negative", "one-negative"],
  3: ["equiv-forms", "fraction-result"],
  4: ["rate-context", "fraction-result"],
};

const SKINS = {
  descent: {
    unit: "ft/min",
    plain: "Descent computer: {{a}} ÷ {{b}} = ?",
    rate: "You lose {{total}} ft over {{minutes}} minutes. What is the average rate per minute?",
    equiv: "Three readouts should all mean the same as {{target}}. Which one does NOT?",
  },
  fuel: {
    unit: "L/min",
    plain: "Fuel computer: {{a}} ÷ {{b}} = ?",
    rate: "You burn {{total}} L over {{minutes}} minutes. What is the average burn per minute?",
    equiv: "Three readouts should all mean the same as {{target}}. Which one does NOT?",
  },
  credits: {
    unit: "cr",
    plain: "Credit ledger: {{a}} ÷ {{b}} = ?",
    rate: "A {{total}} cr balance is split evenly across {{minutes}} sorties. What is the change per sortie?",
    equiv: "Three readouts should all mean the same as {{target}}. Which one does NOT?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "rate-context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the answer first, then the dividend --------------------
  let a = 0;
  let b = 1;
  let p = 0;
  let q = 1;
  let equivOptions: string[] = [];
  let equivWrong = 0;

  switch (variant) {
    case "one-negative": {
      const quotient = int(rng, -12, -1);
      b = int(rng, 2, 12);
      a = quotient * b;
      if (rng() < 0.5) { a = -a; b = -b; } // move the minus to the divisor
      break;
    }
    case "two-negative": {
      const quotient = int(rng, 1, 12);
      b = -int(rng, 2, 12);
      a = quotient * b;
      break;
    }
    case "fraction-result": {
      a = int(rng, 3, 39);
      b = -int(rng, 2, 8);
      if (a % b === 0) a += 1;
      break;
    }
    case "equiv-forms": {
      p = int(rng, 2, 24);
      q = int(rng, 2, 9);
      // Three of these equal -(p/q); the fourth is the odd one out.
      const equal = [`${MINUS}${p}/${q}`, `${MINUS}(${p}/${q})`, `${p}/(${MINUS}${q})`];
      const notEqual = `${MINUS}${p}/(${MINUS}${q})`; // two negatives cancel
      const laid = shuffle(rng, [...equal, notEqual]);
      equivOptions = laid;
      equivWrong = laid.indexOf(notEqual);
      break;
    }
    case "rate-context": {
      const perMinute = -int(rng, 20, 400);
      b = int(rng, 2, 12);
      a = perMinute * b;
      break;
    }
  }

  const quotient = variant === "equiv-forms" ? rat(0) : rat(a, b);

  // --- 2. prompt --------------------------------------------------------
  const exact = variant === "equiv-forms" ? "" : isTerminating(quotient) ? fmtDecimal(quotient) : fmtFraction(quotient);
  const template = variant === "equiv-forms" ? skin.equiv : variant === "rate-context" ? skin.rate : skin.plain;

  const prompt = {
    text: bind(template, {
      a: fmtInt(a),
      b: fmtInt(b),
      total: fmtInt(a),
      minutes: String(Math.abs(b)),
      target: `${MINUS}(${p}/${q})`,
    }),
    units: skin.unit,
    figure: {
      kind: "fact-family" as const,
      rows: variant === "equiv-forms"
        ? equivOptions.map((o) => [o])
        : [[`${fmtInt(a)} ÷ ${fmtInt(b)}`, exact], [`${exact} × ${fmtInt(b)}`, fmtInt(a)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = variant === "equiv-forms"
    ? [
        { text: "A minus sign can sit in front, on the numerator, or on the denominator. All three mean the same value.", math: `${MINUS}(p/q) = (${MINUS}p)/q = p/(${MINUS}q)` },
        { text: "Count the minus signs in each form. One minus means negative.", math: `${MINUS}${p}/${q}` },
        { text: "Two minus signs cancel, so that form is positive. It is the odd one out.", math: `${MINUS}${p}/(${MINUS}${q}) = ${p}/${q}` },
      ]
    : [
        { text: "Divide the sizes, ignoring the signs for now.", math: `${Math.abs(a)} ÷ ${Math.abs(b)} = ${exact.replace(MINUS, "")}` },
        { text: "Same signs give a positive answer; different signs give a negative one. The rule is the same as multiplication.", math: `${a < 0 ? "−" : "+"} ÷ ${b < 0 ? "−" : "+"}` },
        { text: "Write the answer with that sign. If it does not divide evenly, leave it as a fraction or an exact decimal.", math: `${exact} ${skin.unit}` },
      ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // add-rule-on-div: neg / neg comes out negative
    { tag: "add-rule-on-div", value: rat(-quotient.n, quotient.d), when: variant !== "equiv-forms" && toNumber(quotient) !== 0 },
    // equiv-forms: treats two equal forms as different
    { tag: "equiv-forms", value: rat(quotient.n * -1, quotient.d), when: false },
    // zero-confusion: 0/n and n/0 swapped
    { tag: "zero-confusion", value: rat(0), when: variant !== "equiv-forms" && toNumber(quotient) !== 0 },
  ];

  const fmtAnswer = (x: Answer): string => {
    const r = x as { n: number; d: number };
    return isTerminating(rat(r.n, r.d)) ? fmtDecimal(rat(r.n, r.d)) : fmtFraction(rat(r.n, r.d));
  };

  if (variant === "equiv-forms") {
    // Pick-one over the four written forms; the tag is always equiv-forms.
    const distractors = equivOptions
      .map((value) => ({ tag: "equiv-forms", value }))
      .filter((_, i) => i !== equivWrong);
    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${p}/${q}|${equivOptions.join(",")}`),
      format: "pick-one:not-equal",
      prompt,
      answer: equivOptions[equivWrong]!,
      answerText: equivOptions[equivWrong]!,
      accept: (input: Answer) => input === equivOptions[equivWrong],
      distractors,
      options: equivOptions,
      optionText: equivOptions,
      correctIndex: equivWrong,
      worked,
      errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [d.value, d.tag])),
      params: { variant, skin: skinKey, p, q, order: equivOptions.join("|") },
    };
  }

  const choice = buildChoice(rng, quotient, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a}|${b}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: quotient,
    answerText: fmtAnswer(quotient),
    accept: acceptRational(quotient),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, a, b },
  };
}
