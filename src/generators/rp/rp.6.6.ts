// rp.6.6 — Simple interest
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, add, div0, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.6.6";

type Variant =
  | "interest"  // I from P, r, t in whole years        (tier 1)
  | "balance"   // balance after t years                 (tier 2)
  | "months"    // t given in months                     (tier 3)
  | "find-rate";// find r from I                         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["interest"],
  2: ["balance", "interest"],
  3: ["months", "balance"],
  4: ["find-rate", "months"],
};

/** The registry's rate list. */
const RATES = [2, 3, 4, 5, 6, 8] as const;

const SKINS = {
  account: { noun: "squadron credit account", verb: "earns", unit: "CR" },
  loan: { noun: "hangar loan for a new airframe", verb: "is charged", unit: "CR" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "find-rate" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose principal, rate and time -------------------------------
  // A multiple of 100 keeps every rate on whole credits.
  const principal = rat(int(rng, 1, 100) * 100);
  const rate = rat(pick(rng, RATES));
  const rateDecimal = div0(rate, rat(100));

  const months = variant === "months" ? pick(rng, [6, 12, 18, 24, 30, 36] as const) : 0;
  const years: Rational = variant === "months" ? rat(months, 12) : rat(int(rng, 1, 10));

  const interest = mul(mul(principal, rateDecimal), years);
  const balance = add(principal, interest);

  const correct = variant === "interest" ? interest
    : variant === "balance" || variant === "months" ? balance
      : rate;

  const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

  // --- 2. prompt --------------------------------------------------------
  const timeText = variant === "months" ? `${months} months` : `${show(years)} year${years.n === 1 ? "" : "s"}`;
  const text =
    variant === "find-rate"
      ? bind("A {{noun}} of {{p}} CR {{verb}} {{i}} CR of simple interest over {{t}}. What is the annual rate?", {
          noun: skin.noun, p: show(principal), verb: skin.verb, i: show(interest), t: timeText,
        })
      : variant === "interest"
        ? bind("A {{noun}} of {{p}} CR {{verb}} {{r}}% simple interest a year. How much interest over {{t}}?", {
            noun: skin.noun, p: show(principal), verb: skin.verb, r: show(rate), t: timeText,
          })
        : bind("A {{noun}} of {{p}} CR {{verb}} {{r}}% simple interest a year. What is the balance after {{t}}?", {
            noun: skin.noun, p: show(principal), verb: skin.verb, r: show(rate), t: timeText,
          });

  const prompt = {
    text,
    units: variant === "find-rate" ? "%" : skin.unit,
    figure: {
      kind: "balance-table" as const,
      rows: [["PRINCIPAL", show(principal)], ["RATE", `${show(rate)}%`], ["TIME", timeText],
             ["INTEREST", show(interest)], ["BALANCE", show(balance)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Write down the three parts: principal, rate and time. Interest is I = P × r × t.", math: `P = ${show(principal)}, r = ${show(rate)}%, t = ${timeText}` },
    { text: "Turn the rate into a decimal: divide by 100.", math: `${show(rate)}% = ${show(rateDecimal)}` },
    {
      text: "Put the time in YEARS. Months have to be divided by 12 first; the rate is an annual rate.",
      math: variant === "months" ? `${months} ÷ 12 = ${show(years)} years` : `${show(years)} years`,
    },
    {
      text: variant === "interest"
        ? "Multiply the three together. That is the interest."
        : variant === "find-rate"
          ? "Rearrange for r, then turn it back into a percent."
          : "Multiply for the interest, then ADD it to the principal for the balance.",
      math: variant === "find-rate" ? `r = ${show(correct)}%` : `${show(correct)} ${skin.unit}`,
    },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // rate-not-decimal: uses 5 rather than 0.05
    { tag: "rate-not-decimal", value: mul(mul(principal, rate), years) },
    // months-as-years: uses 18 for 18 months
    { tag: "months-as-years", value: mul(mul(principal, rateDecimal), rat(months || 1)), when: variant === "months" },
    { tag: "months-as-years", value: mul(interest, rat(12)), when: variant !== "months" },
    // interest-as-balance: reports the interest when the balance was asked
    { tag: "interest-as-balance", value: interest, when: variant !== "interest" },
    { tag: "interest-as-balance", value: balance, when: variant === "interest" },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${principal.n}|${rate.n}|${years.n}/${years.d}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: variant === "find-rate" ? `${show(correct)}%` : show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, principal: principal.n, rate: rate.n, years: `${years.n}/${years.d}` },
  };
}
