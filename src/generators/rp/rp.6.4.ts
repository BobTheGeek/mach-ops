// rp.6.4 — Percents of increase and decrease; percent error
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, add, sub, div0, abs, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.6.4";

type Variant =
  | "increase"   // percent increase                        (tier 1)
  | "decrease"   // percent decrease                        (tier 2)
  | "error"      // percent error against an actual         (tier 3)
  | "successive";// two changes in a row                    (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["increase"],
  2: ["decrease", "increase"],
  3: ["error", "decrease"],
  4: ["successive", "error"],
};

const PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80] as const;

const SKINS = {
  speed: { noun: "top speed", unit: "KT" },
  squadron: { noun: "squadron size", unit: "" },
  fuel: { noun: "fuel load", unit: "L" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "successive" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the original and the change ----------------------------
  // A multiple of 20 keeps every percent in the list on a whole number.
  const original = rat(int(rng, 1, 100) * 20);
  const percent = rat(pick(rng, PERCENTS));
  const fraction = div0(percent, rat(100));

  const up = variant === "increase" || (variant === "successive");
  const changed = up ? mul(original, add(rat(1), fraction)) : mul(original, sub(rat(1), fraction));

  // Successive: up by the percent, then down by the same percent.
  const second = mul(changed, sub(rat(1), fraction));

  // Percent error: an estimate within 30% of the actual.
  const estimate = mul(original, add(rat(1), mul(fraction, rat(rng() < 0.5 ? 1 : -1))));
  const percentError = mul(div0(abs(sub(estimate, original)), original), rat(100));

  const correct = variant === "error" ? percentError
    : variant === "successive" ? second
      : percent;

  const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "error"
      ? bind("You estimated the {{noun}} at {{est}} but it was really {{act}}. What was the percent error?", {
          noun: skin.noun, est: show(estimate), act: show(original),
        })
      : variant === "successive"
        ? bind("The {{noun}} went up {{p}}% after an upgrade, then down {{p}}% after damage. It started at {{orig}}. Where is it now?", {
            noun: skin.noun, p: show(percent), orig: show(original),
          })
        : bind("The {{noun}} went from {{orig}} to {{now}}. What percent {{dir}} is that?", {
            noun: skin.noun, orig: show(original), now: show(changed), dir: up ? "increase" : "decrease",
          });

  const prompt = {
    text,
    ...(skin.unit ? { units: skin.unit } : {}),
    figure: {
      kind: "tape-diagram-100" as const,
      rows: [["ORIGINAL", show(original)], ["NEW", show(variant === "successive" ? second : changed)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const isError = variant === "error";
  // Percent error measures the estimate against the actual; percent change
  // measures the new value against the original. Same shape, different pair.
  const from = isError ? estimate : changed;
  const gap = isError ? abs(sub(estimate, original)) : sub(changed, original);

  const worked: WorkedStep[] = [
    {
      text: isError
        ? "Find how far the estimate was from the actual value. Percent error has no direction, so take the size of the gap."
        : "Find the difference between the new value and the original.",
      math: `${show(from)} − ${show(original)} → ${show(gap)}`,
    },
    {
      text: isError
        ? "Divide by the ACTUAL value, never by your estimate. The actual is what you were aiming at."
        : "Divide by the ORIGINAL, never by the new one. The original is what the change is measured against.",
      math: `÷ ${show(original)}`,
    },
    { text: "Multiply by 100 to turn it into a percent.", math: `× 100` },
    {
      text: variant === "successive"
        ? "Up then down by the same percent does NOT return to the start, because the second percent is taken off a bigger number."
        : "Write the answer as a percent.",
      math: variant === "successive" ? `${show(original)} → ${show(changed)} → ${show(second)}` : `${show(correct)}%`,
    },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // divide-by-new: divides by the new value, or by the estimate, instead of
    // by the thing the change is measured against
    { tag: "divide-by-new", value: () => mul(div0(gap, from), rat(100)), when: from.n !== 0 },
    // difference-only: reports the raw difference as if it were a percent
    { tag: "difference-only", value: abs(gap) },
    // successive-cancel: thinks up then down returns to the start
    { tag: "successive-cancel", value: original, when: variant === "successive" },
    { tag: "successive-cancel", value: changed, when: variant !== "successive" },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${original.n}|${percent.n}|${estimate.n}/${estimate.d}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: variant === "successive" ? show(correct) : `${show(correct)}%`,
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, original: original.n, percent: percent.n },
  };
}
