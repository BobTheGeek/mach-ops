// rp.6.5 — Discounts and markups
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, sub, add, div0, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.6.5";

type Variant =
  | "discount"  // sale price from a percent off        (tier 1)
  | "markup"    // cost to selling price                 (tier 2)
  | "original"  // find the original from a sale price   (tier 3)
  | "stacked";  // two discounts in a row                (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["discount"],
  2: ["markup", "discount"],
  3: ["original", "markup"],
  4: ["stacked", "original"],
};

const RATES = [10, 20, 25, 40, 50, 60] as const;

const SKINS = {
  shop: { item: "a paint scheme", unit: "CR" },
  parts: { item: "a spare part", unit: "CR" },
  upgrade: { item: "an avionics upgrade", unit: "CR" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "stacked" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // A multiple of 100 keeps every rate, stacked or not, on whole credits.
  const price = rat(int(rng, 1, 50) * 100);
  const rate = rat(pick(rng, RATES));
  const fraction = div0(rate, rat(100));

  const secondRate = rat(pick(rng, RATES.filter((r) => r !== rate.n)));
  const secondFraction = div0(secondRate, rat(100));

  const salePrice = mul(price, sub(rat(1), fraction));
  const sellingPrice = mul(price, add(rat(1), fraction));
  const stackedPrice = mul(salePrice, sub(rat(1), secondFraction));

  const correct = variant === "discount" ? salePrice
    : variant === "markup" ? sellingPrice
      : variant === "original" ? price
        : stackedPrice;

  const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

  const text =
    variant === "discount" ? bind("{{item}} costs {{price}} CR with {{r}}% off. What is the sale price?", {
      item: skin.item.charAt(0).toUpperCase() + skin.item.slice(1), price: show(price), r: show(rate),
    })
      : variant === "markup" ? bind("{{item}} costs the base {{price}} CR and is marked up {{r}}%. What is the selling price?", {
        item: skin.item.charAt(0).toUpperCase() + skin.item.slice(1), price: show(price), r: show(rate),
      })
        : variant === "original" ? bind("{{item}} is on sale at {{sale}} CR after {{r}}% off. What was the original price?", {
          item: skin.item.charAt(0).toUpperCase() + skin.item.slice(1), sale: show(salePrice), r: show(rate),
        })
          : bind("{{item}} costs {{price}} CR. You have {{r}}% off, then {{r2}}% off what is left. What do you pay?", {
            item: skin.item.charAt(0).toUpperCase() + skin.item.slice(1), price: show(price), r: show(rate), r2: show(secondRate),
          });

  const prompt = {
    text,
    units: skin.unit,
    figure: {
      kind: "tape-diagram" as const,
      rows: [["PRICE", show(price)], ["CHANGE", show(mul(price, fraction))], ["PAY", show(correct)]],
    },
  };

  const keptPercent = sub(rat(100), rate);
  const worked: WorkedStep[] = [
    { text: "A discount tells you what you take OFF. Work out what you KEEP instead.", math: `100% − ${show(rate)}% = ${show(keptPercent)}%` },
    { text: "Turn that into a decimal and multiply the price by it. One step, not two.", math: `${show(price)} × ${show(sub(rat(1), fraction))}` },
    {
      text: variant === "markup"
        ? "A markup is ADDED, so you multiply by more than 1."
        : "Stacked discounts do not add up: the second comes off what is already reduced.",
      math: variant === "markup" ? `× ${show(add(rat(1), fraction))}` : `× ${show(sub(rat(1), fraction))} then × ${show(sub(rat(1), secondFraction))}`,
    },
    { text: "Write the amount you actually pay, not the amount you saved.", math: `${show(correct)} ${skin.unit}` },
  ];

  const candidates: Candidate[] = [
    // discount-as-price: reports the discount amount as the sale price
    { tag: "discount-as-price", value: mul(price, fraction) },
    // stack-add: 20% then 10% treated as 30%
    { tag: "stack-add", value: mul(price, sub(rat(1), add(fraction, secondFraction))), when: variant === "stacked" },
    { tag: "stack-add", value: mul(price, add(rat(1), fraction)), when: variant === "discount" },
    // markup-subtract: subtracts the markup instead of adding it
    { tag: "markup-subtract", value: mul(price, sub(rat(1), fraction)), when: variant === "markup" },
    { tag: "markup-subtract", value: mul(salePrice, sub(rat(1), fraction)), when: variant === "original" },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${price.n}|${rate.n}|${secondRate.n}`),
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
    params: { variant, skin: skinKey, price: price.n, rate: rate.n, rate2: secondRate.n },
  };
}
