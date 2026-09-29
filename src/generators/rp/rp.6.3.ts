// rp.6.3 — The percent equation (tax, tip, commission, fees)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, add, div0, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.6.3";

type Variant =
  | "part"      // a = p% of w, clean numbers              (tier 1)
  | "total"     // price plus tax                          (tier 2)
  | "reverse"   // find the percent or the whole           (tier 3)
  | "multi";    // tax plus a fee                          (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["part"],
  2: ["total", "part"],
  3: ["reverse", "total"],
  4: ["multi", "reverse"],
};

/** The registry's rate list. */
const RATES = [5, 6, 7, 8, 10, 15, 20] as const;

const SKINS = {
  shop: { item: "A missile", rateName: "base tax", unit: "CR" },
  hangar: { item: "A hangar slot", rateName: "the hangar fee", unit: "CR" },
  commission: { item: "A kill bounty", rateName: "the pilot commission", unit: "CR" },
} as const;

/** "base tax is 8%" at the start of a sentence needs a capital. */
const startCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "multi" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the price and the rate ---------------------------------
  // A multiple of 20 keeps every rate on a whole number of credits.
  const price = rat(int(rng, 1, 100) * 20);
  const rate = rat(pick(rng, RATES));
  const rateDecimal = div0(rate, rat(100));

  const taxAmount = mul(price, rateDecimal);
  const total = add(price, taxAmount);

  const secondRate = rat(pick(rng, RATES.filter((r) => r !== rate.n)));
  const secondAmount = mul(price, div0(secondRate, rat(100)));
  const multiTotal = add(total, secondAmount);

  const correct = variant === "part" ? taxAmount
    : variant === "total" ? total
      : variant === "reverse" ? rate
        : multiTotal;

  const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "part" ? bind("{{item}} costs {{price}} CR and {{rateName}} is {{rate}}%. How much is that?", {
      item: skin.item, price: show(price), rateName: skin.rateName, rate: show(rate),
    })
      : variant === "total" ? bind("{{item}} costs {{price}} CR and {{rateName}} is {{rate}}%. What do you pay in total?", {
        item: skin.item, price: show(price), rateName: skin.rateName, rate: show(rate),
      })
        : variant === "reverse" ? bind("{{item}} costs {{price}} CR and you pay {{total}} CR. What percent was added?", {
          item: skin.item, price: show(price), total: show(total),
        })
          : bind("{{item}} costs {{price}} CR. {{rateName}} is {{rate}}% and a handling fee is {{rate2}}%, both on the price. What do you pay?", {
            item: skin.item, price: show(price),
            rateName: startCase(skin.rateName), rate: show(rate), rate2: show(secondRate),
          });

  const prompt = {
    text,
    units: skin.unit,
    figure: {
      kind: "tape-diagram" as const,
      rows: [["PRICE", show(price)], [skin.rateName.toUpperCase(), show(taxAmount)], ["TOTAL", show(total)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Turn the percent into a decimal first: divide by 100.", math: `${show(rate)}% = ${show(rateDecimal)}` },
    { text: "The part is the decimal times the whole.", math: `${show(rateDecimal)} × ${show(price)} = ${show(taxAmount)}` },
    {
      text: variant === "part"
        ? "The question asked for the tax itself, so stop here."
        : "Tax and fees are ADDED to the price. The total is the price plus what was added.",
      math: variant === "part" ? show(taxAmount) : `${show(price)} + ${show(taxAmount)}`,
    },
    { text: "Write the answer.", math: `${show(correct)}${variant === "reverse" ? "%" : ` ${skin.unit}`}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // percent-not-decimal: multiplies by 8 instead of 0.08
    { tag: "percent-not-decimal", value: mul(price, rate) },
    // tax-not-added: reports the tax when the total was asked
    { tag: "tax-not-added", value: taxAmount, when: variant !== "part" },
    { tag: "tax-not-added", value: total, when: variant === "part" },
    // add-percents-to-price: adds the rate to the price as if it were credits
    { tag: "add-percents-to-price", value: add(price, rate) },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${price.n}|${rate.n}|${secondRate.n}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: variant === "reverse" ? `${show(correct)}%` : show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, price: price.n, rate: rate.n, rate2: secondRate.n },
  };
}
