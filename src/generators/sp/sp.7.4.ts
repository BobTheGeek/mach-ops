// sp.7.4 — Measures of variation
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, cmp, fmtFraction, fmtDecimal, isTerminating } from "../../engine/rational";
import { fiveNumber, iqr, range, mad, mean, sortAsc, quartilesIncludingMedian } from "../../engine/stats";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.7.4";

type Variant =
  | "range"      // max minus min                            (tier 1)
  | "quartiles"  // Q1, Q3 or IQR on an odd count            (tier 2)
  | "mad"        // mean absolute deviation, or an even IQR  (tier 3)
  | "compare";   // which squadron is more consistent        (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["range"],
  2: ["quartiles", "range"],
  3: ["mad", "quartiles"],
  4: ["compare", "mad"],
};

type Ask = "RANGE" | "Q1" | "Q3" | "IQR" | "MAD";

const SKINS = {
  landing: { noun: "landing times", unit: "seconds", a: "EAGLE", b: "FALCON" },
  fuel: { noun: "fuel burn figures", unit: "litres", a: "ALPHA FLIGHT", b: "BRAVO FLIGHT" },
  lock: { noun: "lock times", unit: "seconds", a: "EAGLE", b: "FALCON" },
} as const;

type SkinKey = keyof typeof SKINS;

const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));
const list = (vs: readonly Rational[]): string => vs.map(show).join(", ");
const nums = (vs: readonly Rational[]): number[] => vs.map((v) => v.n / v.d);

/** Distinct whole values in the registry's [0,100], drawn without replacement. */
function draw(rng: () => number, n: number, lo: number, hi: number): Rational[] {
  const pool = shuffle(rng, Array.from({ length: hi - lo + 1 }, (_, i) => i + lo));
  return pool.slice(0, n).map((v) => rat(v));
}

/**
 * Some draws cannot be used: two squadrons with the same spread have no "more
 * consistent" answer, and a set the search could not build would carry a MAD
 * the card then lies about. Those are retried on a salted stream rather than by
 * calling generate() again with a different seed — a Problem must report the
 * seed it was ASKED for, and a re-seeded recursion reported the salted one.
 */
export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  return build(tier, seed, opts, 0);
}

const RETRY_SALT = 7919;
const MAX_RETRIES = 8;

function build(tier: Tier, seed: number, opts: GenerateOpts, attempt: number): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed + attempt * RETRY_SALT}`));
  const variant = opts.transfer && tier === 4 ? "compare" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. build the data -------------------------------------------------
  // MAD is only writable by hand on a small set, so tier 3 keeps to 5-6 values.
  const count = variant === "mad" ? int(rng, 5, 6)
    : variant === "quartiles" ? int(rng, 4, 4) * 2 + 1
      : int(rng, 5, 9);

  /**
   * A MAD is the one measure here that does not have to land on a whole number,
   * and "29 7/9 seconds" is a discouraging answer to a question about how spread
   * out some landing times are. The set is built around a whole mean whose
   * absolute deviations total a multiple of the count, so the MAD comes out
   * whole. If no such set turns up in a bounded search the exact fraction is
   * used, because a wrong-but-tidy answer is worse than an untidy right one.
   */
  function madSet(): Rational[] {
    for (let attempt = 0; attempt < 60; attempt++) {
      const m = int(rng, 25, 75);
      const devs: number[] = [];
      for (let i = 0; i < count - 1; i++) devs.push(int(rng, -20, 20));
      devs.push(-devs.reduce((a, b) => a + b, 0));
      const values = devs.map((d) => m + d);
      const spread = devs.reduce((a, b) => a + Math.abs(b), 0);
      const ok = spread > 0
        && spread % count === 0
        && new Set(values).size === count
        && values.every((v) => v >= 4 && v <= 100)
        && devs.every((d) => Math.abs(d) <= 25);
      if (ok) return sortAsc(values.map((v) => rat(v)));
    }
    return sortAsc(draw(rng, count, 4, 100));
  }

  const data = variant === "mad" ? madSet() : sortAsc(draw(rng, count, 4, 100));

  const f = fiveNumber(data);
  const theIqr = iqr(data);
  const theRange = range(data);
  const theMad = mad(data);

  const ask: Ask = variant === "range" ? "RANGE"
    : variant === "quartiles" ? pick(rng, ["Q1", "Q3", "IQR"] as Ask[])
      : variant === "mad" ? (rng() < 0.6 ? "MAD" : "IQR")
        : "IQR";

  const correct: Rational = ask === "RANGE" ? theRange
    : ask === "Q1" ? f.q1
      : ask === "Q3" ? f.q3
        : ask === "MAD" ? theMad
          : theIqr;

  // Tier 4 sets one squadron against another. The gap has to be wide enough
  // that "which is more consistent" is a reading, not a coin toss.
  /**
   * The mistake this card is for is answering with the range. So the pair is
   * drawn until the squadron with the narrower RANGE is the one with the WIDER
   * IQR: reading the ends gives one answer and reading the middle half gives
   * the other, and only one of them is consistency.
   */
  function rival(): { set: Rational[]; ideal: boolean } {
    let fallback: Rational[] = sortAsc(draw(rng, count, 4, 100));
    for (let attempt = 0; attempt < 80; attempt++) {
      const candidate = sortAsc(draw(rng, count, 4, 100));
      const ci = iqr(candidate);
      const gap = Math.abs(theIqr.n / theIqr.d - ci.n / ci.d);
      if (gap < 8) continue;
      fallback = candidate;
      const iqrOrder = cmp(theIqr, ci);
      const rangeOrder = cmp(theRange, range(candidate));
      if (iqrOrder !== 0 && rangeOrder !== 0 && iqrOrder !== rangeOrder) {
        return { set: candidate, ideal: true };
      }
    }
    return { set: fallback, ideal: false };
  }

  const rivalDraw = variant === "compare" ? rival() : { set: [] as Rational[], ideal: false };
  const other = rivalDraw.set;
  const otherIqr = variant === "compare" ? iqr(other) : rat(0);
  const tight = variant === "compare" && cmp(theIqr, otherIqr) < 0 ? skin.a : skin.b;
  const clearGap = variant === "compare"
    && Math.abs(theIqr.n / theIqr.d - otherIqr.n / otherIqr.d) >= 8;

  // --- 2. prompt --------------------------------------------------------
  const text = variant === "compare"
    ? bind("{{a}} logged {{la}}. {{b}} logged {{lb}}. Both in {{unit}}. Which squadron is more CONSISTENT?", {
        a: skin.a, la: list(data), b: skin.b, lb: list(other), unit: skin.unit,
      })
    : bind("The {{noun}} are {{list}} {{unit}}. What is the {{ask}}?", {
        noun: skin.noun, list: list(shuffle(rng, [...data])), unit: skin.unit, ask,
      });

  const prompt = {
    text,
    units: skin.unit,
    figure: variant === "compare"
      ? {
          kind: "parallel-dot-plots" as const,
          rows: [nums(data), nums(other)],
          labels: [skin.a, skin.b],
          min: 0, max: 100,
        }
      : {
          kind: "quartile-marks" as const,
          values: nums(data),
          min: 0, max: 100,
          // The mean is marked on a MAD card because every distance is measured
          // FROM it and it is not the answer. Q1 and Q3 are never marked: on
          // this skill they are the answer.
          marks: ask === "MAD" ? [{ at: mean(data).n / mean(data).d, label: "MEAN" }] : [],
        },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Sort the values. Every measure of spread here is read off the sorted list.", math: list(data) },
    { text: "Range is the largest minus the smallest. It uses only the two ends, so one odd value moves it a long way.", math: `${show(f.max)} − ${show(f.min)} = ${show(theRange)}` },
    { text: "Split at the median. On an odd count the median goes in NEITHER half. Q1 and Q3 are the medians of the halves.", math: `Q1 = ${show(f.q1)}   MED = ${show(f.median)}   Q3 = ${show(f.q3)}` },
    {
      text: ask === "MAD"
        ? "MAD is the average distance from the mean: subtract the mean from each value, drop the signs, and average what is left."
        : "IQR is Q3 MINUS Q1, the width of the middle half. Adding them is not a spread at all.",
      math: ask === "MAD"
        ? `mean ${show(mean(data))} → MAD ${show(theMad)}`
        : `${show(f.q3)} − ${show(f.q1)} = ${show(theIqr)}`,
    },
  ];

  // --- 4. the comparison answers with a squadron ------------------------
  if (variant === "compare") {
    // Redraw rather than ship a card whose answer is a guess: an identical or
    // near-identical spread has no honest "more consistent".
    if (!clearGap && attempt < MAX_RETRIES) return build(tier, seed, opts, attempt + 1);

    const options = [skin.a, skin.b];
    const foil = tight === skin.a ? skin.b : skin.a;
    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${data.map((v) => v.n).join(",")}|${other.map((v) => v.n).join(",")}`),
      format: "multiple-choice",
      prompt,
      answer: tight,
      answerText: tight,
      accept: (input: Answer) => String(input).toUpperCase() === tight,
      distractors: [{ tag: "range-as-iqr", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(tight),
      worked,
      errorTagsByAnswer: { [foil]: "range-as-iqr" },
      params: { variant, skin: skinKey, ask, values: data.map((v) => v.n).join(","), other: other.map((v) => v.n).join(",") },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const included = quartilesIncludingMedian(data);
  const candidates: Candidate[] = [
    // iqr-sum: adds the quartiles instead of subtracting them
    { tag: "iqr-sum", value: add(f.q3, f.q1) },
    // quartile-includes-median: keeps the median in both halves on an odd count
    { tag: "quartile-includes-median", value: ask === "Q1" ? included.q1 : ask === "Q3" ? included.q3 : sub(included.q3, included.q1) },
    // range-as-iqr: reports max minus min whatever was asked for
    { tag: "range-as-iqr", value: theRange, when: ask !== "RANGE" },
    { tag: "range-as-iqr", value: theIqr, when: ask === "RANGE" },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${ask}|${data.map((v) => v.n).join(",")}`),
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
    params: { variant, skin: skinKey, ask, values: data.map((v) => v.n).join(",") },
  };
}
