// rp.6.1 — Fractions, decimals, and percents
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import {
  rat, mul, fromDecimal, cmp, fmtFraction, fmtDecimal, fmtRepeating, isTerminating, toNumber,
} from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.6.1";

type Variant =
  | "to-decimal"  // a whole-number percent to a decimal     (tier 1)
  | "to-percent"  // a fraction to a percent                 (tier 2)
  | "edge"        // under 1%, over 100%, repeating          (tier 3)
  | "order";      // order a mixed set                       (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["to-decimal"],
  2: ["to-percent", "to-decimal"],
  3: ["edge", "to-percent"],
  4: ["order", "edge"],
};

const SKINS = {
  shields: { noun: "shield gauge" },
  fuel: { noun: "fuel gauge" },
  thrust: { noun: "thrust readout" },
} as const;

type SkinKey = keyof typeof SKINS;

/**
 * The registry's tier-2 denominators. Drawing a denominator and then a numerator
 * is not the same as drawing a value: quarters have three numerators and
 * twenty-fifths have twenty-four, so 1/4 would come up eight times as often as
 * any given twenty-fifth. The value space is built once and drawn from uniformly.
 */
const DENOMINATORS = [4, 5, 8, 20, 25] as const;

const FRACTION_VALUES: [number, number][] = DENOMINATORS.flatMap((d) =>
  Array.from({ length: d - 1 }, (_, i) => [i + 1, d] as [number, number]),
);
/**
 * The registry names the edge cases — under 1%, over 100%, and repeating — but a
 * hand-written list of seven is far too small for the no-repeat guard, so each
 * family is generated.
 */
const EDGES: [number, number][] = [
  // under 1%: n/200 and n/400 are 0.5% steps
  ...Array.from({ length: 9 }, (_, i) => [i + 1, 200] as [number, number]),
  ...Array.from({ length: 9 }, (_, i) => [(i * 2) + 1, 400] as [number, number]),
  // over 100%
  ...Array.from({ length: 14 }, (_, i) => [i + 3, 2] as [number, number]),
  ...Array.from({ length: 12 }, (_, i) => [i + 5, 4] as [number, number]),
  // repeating
  [1, 3], [2, 3], [1, 6], [5, 6], [1, 9], [2, 9], [4, 9], [5, 9], [7, 9], [8, 9],
  [1, 12], [5, 12], [7, 12], [11, 12],
];

const percentOf = (r: Rational): Rational => mul(r, rat(100));

function fmtPercent(r: Rational): string {
  const p = percentOf(r);
  return `${isTerminating(p) ? fmtDecimal(p) : fmtRepeating(p)}%`;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "order" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  /* -------- order a mixed set --------------------------------------- */
  if (variant === "order") {
    const size = int(rng, 4, 5);
    const pool: { value: Rational; label: string }[] = [
      ((): { value: Rational; label: string } => { const v = pick(rng, FRACTION_VALUES); const r = rat(v[0], v[1]); return { value: r, label: fmtFraction(r) }; })(),
      ((): { value: Rational; label: string } => { const v = fromDecimal(int(rng, 5, 95) / 100, 2); return { value: v, label: fmtDecimal(v) }; })(),
      ((): { value: Rational; label: string } => { const p = int(rng, 5, 95); return { value: rat(p, 100), label: `${p}%` }; })(),
      ((): { value: Rational; label: string } => { const v = fromDecimal(int(rng, 5, 95) / 100, 2); return { value: v, label: fmtDecimal(v) }; })(),
      { value: rat(1, 3), label: "1/3" },
    ];
    const set = shuffle(rng, pool).slice(0, size);
    const sorted = [...set].sort((a, b) => cmp(a.value, b.value));

    const worked: WorkedStep[] = [
      { text: "Pick one form and put everything in it. Decimals are usually easiest.", math: set.map((q) => q.label).join("   ") },
      { text: "A percent becomes a decimal by dividing by 100: move the point two places left.", math: "25% → 0.25" },
      { text: "A fraction becomes a decimal by dividing the top by the bottom.", math: "1/4 → 0.25" },
      { text: "Now compare the decimals and put them back in their original forms.", math: sorted.map((q) => q.label).join(" < ") },
    ];

    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${set.map((q) => `${q.value.n}/${q.value.d}`).join(",")}`),
      format: "order",
      prompt: {
        text: bind("Sort these {{noun}} readings from lowest to highest: {{list}}.", {
          noun: skin.noun, list: set.map((q) => q.label).join(", "),
        }),
        figure: { kind: "hundred-grid" as const, rows: set.map((q) => [q.label]) },
      },
      answer: sorted.map((q) => q.value),
      answerText: sorted.map((q) => q.label).join(" < "),
      orderLabels: sorted.map((q) => q.label),
      accept: (input: Answer) => {
        if (!Array.isArray(input) || input.length !== sorted.length) return false;
        return input.every((x, i) => {
          const r = x as Rational;
          return r.n * sorted[i]!.value.d === sorted[i]!.value.n * r.d;
        });
      },
      worked,
      errorTagsByAnswer: {},
      params: { variant, skin: skinKey, set: set.map((q) => q.label).join(" ") },
    };
  }

  /* -------- convert one value --------------------------------------- */
  let value: Rational;
  let givenText: string;
  let wantPercent: boolean;

  switch (variant) {
    case "to-decimal": {
      const p = int(rng, 1, 99);
      value = rat(p, 100);
      givenText = `${p}%`;
      wantPercent = false;
      break;
    }
    case "to-percent": {
      const v = pick(rng, FRACTION_VALUES);
      value = rat(v[0], v[1]);
      givenText = fmtFraction(value);
      wantPercent = true;
      break;
    }
    case "edge": {
      const e = pick(rng, EDGES);
      value = rat(e[0], e[1]);
      wantPercent = rng() < 0.5;
      givenText = wantPercent ? fmtFraction(value) : fmtPercent(value);
      break;
    }
  }

  const answerText = wantPercent ? fmtPercent(value) : isTerminating(value) ? fmtDecimal(value) : fmtRepeating(value);

  const worked: WorkedStep[] = [
    { text: "Percent means 'per 100'. A percent is already a fraction with 100 on the bottom.", math: `${fmtPercent(value)} = ${fmtDecimal(percentOf(value))}/100` },
    {
      text: wantPercent
        ? "To go TO a percent, multiply by 100: move the point two places RIGHT."
        : "To go FROM a percent, divide by 100: move the point two places LEFT.",
      math: wantPercent ? `× 100` : `÷ 100`,
    },
    { text: "Watch the small and large ones. 0.5% is half of one percent, not a half; 250% is more than the whole thing.", math: "0.5% = 0.005   250% = 2.5" },
    { text: "Write the answer in the form you were asked for.", math: answerText },
  ];

  // Distractors from the registry's tags.
  const hundredTimes = mul(value, rat(100));
  const candidates: Candidate[] = [
    // point-direction: multiplied instead of divided
    { tag: "point-direction", value: hundredTimes },
    // half-percent: 0.5% read as 50%
    { tag: "half-percent", value: mul(value, rat(100)), when: toNumber(value) < 0.01 },
    { tag: "half-percent", value: rat(value.n, value.d * 10) },
    // over-100: 250% read as 0.25
    { tag: "over-100", value: rat(value.n, value.d * 100), when: toNumber(value) > 1 },
    { tag: "over-100", value: mul(value, rat(10)) },
  ];

  const fmt = (v: Answer): string => {
    const r = v as Rational;
    return wantPercent ? fmtPercent(r) : isTerminating(r) ? fmtDecimal(r) : fmtRepeating(r);
  };
  const choice = buildChoice(rng, value, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${value.n}/${value.d}|${wantPercent ? "p" : "d"}`),
    format: wantPercent ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt: {
      text: bind("The {{noun}} reads {{given}}. Write it as a {{want}}.", {
        noun: skin.noun, given: givenText, want: wantPercent ? "percent" : "decimal",
      }),
      figure: { kind: "hundred-grid" as const, rows: [[givenText], [answerText]] },
    },
    answer: value,
    answerText,
    accept: acceptRational(value),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, value: `${value.n}/${value.d}`, want: wantPercent ? "percent" : "decimal" },
  };
}
