// sp.7.6 — Box-and-whisker plots
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, sub, add, div0, cmp, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { fiveNumber, iqr, sortAsc } from "../../engine/stats";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.7.6";

type Variant =
  | "read"     // read a number off the plot                      (tier 1)
  | "build"    // build the five-number summary from the data     (tier 2)
  | "percent"  // what share of the data sits in a section        (tier 3)
  | "compare"; // two plots side by side                          (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["read"],
  2: ["build", "read"],
  3: ["percent", "build"],
  4: ["compare", "percent"],
};

type Part = "MINIMUM" | "Q1" | "MEDIAN" | "Q3" | "MAXIMUM";
const PARTS: Part[] = ["MINIMUM", "Q1", "MEDIAN", "Q3", "MAXIMUM"];

/** The sections the registry asks about, and the share of the data in each. */
const SECTIONS = [
  { phrase: "above Q1", share: 75 },
  { phrase: "inside the box", share: 50 },
  { phrase: "below the median", share: 50 },
  { phrase: "above Q3", share: 25 },
  { phrase: "below Q1", share: 25 },
] as const;

const SKINS = {
  sortie: { noun: "sortie times", one: "sortie time", unit: "minutes", a: "EAGLE", b: "FALCON" },
  lock: { noun: "lock times", one: "lock time", unit: "seconds", a: "ALPHA", b: "BRAVO" },
} as const;

type SkinKey = keyof typeof SKINS;

const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));
const list = (vs: readonly Rational[]): string => vs.map(show).join(", ");
const asPlot = (vs: readonly Rational[]) => {
  const f = fiveNumber(vs);
  const n = (r: Rational): number => r.n / r.d;
  return { min: n(f.min), q1: n(f.q1), median: n(f.median), q3: n(f.q3), max: n(f.max) };
};

/** Distinct whole values in the registry's [0,100]. */
function draw(rng: () => number, n: number): Rational[] {
  const pool = shuffle(rng, Array.from({ length: 96 }, (_, i) => i + 5));
  return sortAsc(pool.slice(0, n).map((v) => rat(v)));
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

const RETRY_SALT = 6373;
const MAX_RETRIES = 8;

function build(tier: Tier, seed: number, opts: GenerateOpts, attempt: number): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed + attempt * RETRY_SALT}`));
  const variant = opts.transfer && tier === 4 ? "compare" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. build the data -------------------------------------------------
  // The registry's range: 9-15 values on a 0-100 axis. An odd count keeps every
  // one of the five numbers a whole number, so a plot can be read exactly.
  const count = int(rng, 4, 7) * 2 + 1;
  const data = draw(rng, count);
  const f = fiveNumber(data);
  const part = pick(rng, PARTS);
  const section = pick(rng, [...SECTIONS]);

  const rivalData = draw(rng, count);
  const rivalFive = fiveNumber(rivalData);

  const correct: Rational =
    variant === "percent" ? rat(section.share)
      : part === "MINIMUM" ? f.min
        : part === "Q1" ? f.q1
          : part === "MEDIAN" ? f.median
            : part === "Q3" ? f.q3
              : f.max;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "read"
      ? bind("Read the box plot of {{noun}}. What is the {{part}}?", { noun: skin.noun, part })
      : variant === "build"
        ? bind("The {{noun}} are {{list}} {{unit}}. Build the five-number summary: what is the {{part}}?", {
            noun: skin.noun, list: list(shuffle(rng, [...data])), unit: skin.unit, part,
          })
        : variant === "percent"
          ? bind("On this box plot of {{noun}}, what PERCENT of the readings sit {{where}}?", {
              noun: skin.noun, where: section.phrase,
            })
          : bind("Two squadrons, same axis. Which one has the higher MEDIAN {{one}}?", { one: skin.one });

  const prompt = {
    text,
    units: variant === "percent" ? "%" : skin.unit,
    figure: variant === "build"
      ? { kind: "dot-plot" as const, values: data.map((v) => v.n / v.d), min: 0, max: 100 }
      : variant === "compare"
        ? {
            kind: "side-by-side-box-plots" as const,
            plots: [asPlot(data), asPlot(rivalData)],
            labels: [skin.a, skin.b],
            min: 0, max: 100,
          }
        : { kind: "box-plot" as const, plots: [asPlot(data)], min: 0, max: 100 },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Name the five numbers: minimum, Q1, median, Q3, maximum. The plot draws them in that order, left to right.", math: `${show(f.min)} · ${show(f.q1)} · ${show(f.median)} · ${show(f.q3)} · ${show(f.max)}` },
    { text: "The box runs from Q1 to Q3. Its width is the IQR, the middle half of the data.", math: `${show(f.q3)} − ${show(f.q1)} = ${show(iqr(data))}` },
    { text: "The line inside the box is the median, not the middle of the box. It sits wherever the data puts it.", math: `median ${show(f.median)}` },
    { text: "Each of the four sections holds about a QUARTER of the data, however long or short it looks. A long whisker is spread out, not crowded.", math: "25% · 25% · 25% · 25%" },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${data.map((v) => v.n).join(",")}|${variant === "percent" ? section.phrase : part}|${variant === "compare" ? rivalData.map((v) => v.n).join(",") : ""}`);

  // --- 4. the comparison names a squadron -------------------------------
  if (variant === "compare") {
    // A tie has no answer, and a hair's difference is a reading test rather than
    // a statistics one, so the two medians are drawn clear of each other.
    // After MAX_RETRIES the draw is used as it stands: an endless search for a
    // clear gap is worse than one card where the two medians are close.
    if (Math.abs(f.median.n / f.median.d - rivalFive.median.n / rivalFive.median.d) < 8
      && attempt < MAX_RETRIES) {
      return build(tier, seed, opts, attempt + 1);
    }
    const right = cmp(f.median, rivalFive.median) > 0 ? skin.a : skin.b;
    const foil = right === skin.a ? skin.b : skin.a;
    const options = [skin.a, skin.b];
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      // Judging by which plot is WIDER rather than where its median line sits is
      // the "longer means more" mistake in its comparison form.
      distractors: [{ tag: "longer-means-more", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: "longer-means-more" },
      params: { variant, skin: skinKey, part, values: data.map((v) => v.n).join(",") },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const midRange = div0(add(f.min, f.max), rat(2));
  const candidates: Candidate[] = variant === "percent"
    ? [
        // Every wrong share here is one a real misreading produces: judging the
        // section by how long it looks, or treating the box as half the values
        // rather than half the data. buildChoice drops whichever one is right.
        { tag: "box-is-half-values", value: rat(50) },
        { tag: "longer-means-more", value: rat(75) },
        { tag: "box-is-half-values", value: rat(25) },
        { tag: "longer-means-more", value: rat(100) },
      ]
    : [
        // box-is-half-values: takes the middle of the RANGE for the median
        { tag: "box-is-half-values", value: midRange, when: part === "MEDIAN" },
        { tag: "box-is-half-values", value: f.median, when: part !== "MEDIAN" },
        // longer-means-more: reaches for an end of the plot rather than a quartile
        { tag: "longer-means-more", value: part === "Q1" ? f.min : part === "Q3" ? f.max : f.q1 },
        { tag: "longer-means-more", value: sub(f.q3, f.q1) },
      ];

  const fmt = (v: Answer): string => (variant === "percent" ? `${show(v as Rational)}%` : show(v as Rational));
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed, hash,
    format: variant === "percent" ? (rng() < 0.5 ? "numeric" : "multiple-choice") : (rng() < 0.5 ? "box-plot-read" : "multiple-choice"),
    prompt,
    answer: correct,
    answerText: variant === "percent" ? `${show(correct)}%` : show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, part, section: section.phrase, values: data.map((v) => v.n).join(",") },
  };
}
