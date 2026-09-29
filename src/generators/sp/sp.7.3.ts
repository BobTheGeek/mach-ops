// sp.7.3 — Measures of center
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, fmtFraction, fmtDecimal, isTerminating } from "../../engine/rational";
import { mean, median, modes, sortAsc, sum } from "../../engine/stats";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.7.3";

type Variant =
  | "centre"   // mean, median or mode of an odd-sized set     (tier 1)
  | "even"     // even count, so the median averages two       (tier 2)
  | "outlier"  // one huge value: what does it do to each      (tier 3)
  | "missing"; // the mean is known, one value is not          (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["centre"],
  2: ["even", "centre"],
  3: ["outlier", "even"],
  4: ["missing", "outlier"],
};

type Measure = "MEAN" | "MEDIAN" | "MODE";

const SKINS = {
  sortie: { noun: "sortie times", unit: "minutes", one: "sortie", outlier: "an aborted sortie that ran" },
  lock: { noun: "lock times", unit: "seconds", one: "intercept", outlier: "a bad lock that took" },
  kills: { noun: "confirmed kills", unit: "kills", one: "pilot", outlier: "one ace with" },
} as const;

type SkinKey = keyof typeof SKINS;

const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));
const list = (vs: readonly Rational[]): string => vs.map(show).join(", ");

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "missing" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. build the data set --------------------------------------------
  // The registry's range: 5-10 values in [0,60]. Drawn DISTINCT, because a set
  // that repeats two different values by accident has two modes and "the mode"
  // stops being a single answer.
  const count = variant === "even" ? int(rng, 3, 5) * 2 : int(rng, 2, 4) * 2 + 1;
  const pool = shuffle(rng, Array.from({ length: 57 }, (_, i) => i + 4));
  const base = pool.slice(0, count).map((n) => rat(n));

  // A mode question needs exactly one mode, so one value is repeated in place of
  // another and the set is shuffled: a pair sitting at the front of the list
  // would give the answer away before any counting.
  const withMode = shuffle(rng, [...base.slice(0, count - 1), base[int(rng, 0, count - 2)]!]);
  // T2 is allowed a set with nothing repeated, because "no mode" is an answer
  // the registry asks for by name.
  const noMode = variant === "even" && rng() < 0.3;
  const values = noMode ? base : withMode;

  const measure: Measure = variant === "missing" ? "MEAN"
    : variant === "outlier" ? (rng() < 0.5 ? "MEAN" : "MEDIAN")
      : noMode ? "MODE"
        : pick(rng, ["MEAN", "MEDIAN", "MODE"] as Measure[]);

  // The outlier the registry asks for: one value three times the largest.
  const biggest = sortAsc(values)[values.length - 1]!;
  const outlier = mul(biggest, rat(3));
  const withOutlier = [...values, outlier];
  const data = variant === "outlier" ? withOutlier : values;

  const theMode = modes(data);
  const hasOneMode = theMode.length === 1;

  // Tier 4 hides one value and states the mean instead.
  const hiddenAt = int(rng, 0, data.length - 1);
  const hidden = data[hiddenAt]!;
  const shown = data.filter((_, i) => i !== hiddenAt);
  const statedMean = mean(data);

  const correctValue: Rational =
    variant === "missing" ? hidden
      : measure === "MEAN" ? mean(data)
        : measure === "MEDIAN" ? median(data)
          : (theMode[0] ?? rat(0));

  const answersNone = measure === "MODE" && !hasOneMode;

  // --- 2. prompt --------------------------------------------------------
  const shownList = variant === "missing" ? shown : data;
  const text = variant === "missing"
    ? bind("{{n}} {{noun}} average {{m}} {{unit}}. All but one read {{list}}. What was the missing one?", {
        n: String(data.length), noun: skin.noun, m: show(statedMean), unit: skin.unit, list: list(shown),
      })
    : variant === "outlier"
      ? bind("These {{noun}} are {{list}} {{unit}}, plus {{o}} {{v}} {{unit}}. What is the {{measure}} of all of them?", {
          noun: skin.noun, list: list(values), unit: skin.unit,
          o: skin.outlier, v: show(outlier), measure,
        })
      : bind("The {{noun}} are {{list}} {{unit}}. What is the {{measure}}?", {
          noun: skin.noun, list: list(data), unit: skin.unit, measure,
        });

  const prompt = {
    text,
    units: skin.unit,
    figure: {
      kind: "dot-plot" as const,
      values: shownList.map((v) => v.n / v.d),
      min: 0,
      max: Math.ceil(Math.max(...data.map((v) => v.n / v.d)) / 10) * 10,
    },
  };

  const sorted = sortAsc(data);

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Sort the values smallest to largest. The median is meaningless until you do, and the sort makes the mode easy to see.", math: list(sorted) },
    { text: "Mean is the total divided by how many there are. Count them again: dividing by one too few is the usual slip.", math: `${show(sum(data))} ÷ ${data.length} = ${show(mean(data))}` },
    { text: "Median is the middle of the SORTED list. With an even count, average the two middle ones.", math: show(median(data)) },
    {
      text: variant === "missing"
        ? "Working backwards: the total must be the mean times the count, so the missing value is that total minus the rest."
        : "Mode is the value that appears MOST, not the largest value. A set with nothing repeated has no mode.",
      math: variant === "missing"
        ? `${show(statedMean)} × ${data.length} − ${show(sum(shown))} = ${show(hidden)}`
        : (hasOneMode ? show(theMode[0]!) : "no mode"),
    },
  ];

  // --- 4. "no mode" answers in words ------------------------------------
  if (answersNone) {
    const options = ["NO MODE", ...shuffle(rng, sortAsc(data).slice(0, 3)).map(show)];
    const tags = ["mode-as-max", "median-unsorted", "mean-count-error"];
    const candidates: Candidate[] = options.slice(1).map((value, i) => ({ tag: tags[i % tags.length]!, value }));
    candidates.unshift({ tag: "mode-as-max", value: show(sorted[sorted.length - 1]!) });
    const choice = buildChoice(rng, "NO MODE", candidates, (a: Answer) => String(a));
    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|MODE-NONE|${sorted.map((v) => v.n).join(",")}`),
      format: "multiple-choice",
      prompt,
      answer: "NO MODE",
      answerText: "NO MODE",
      accept: (input: Answer) => String(input).toUpperCase().replace(/\s+/g, " ") === "NO MODE",
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, measure, values: sorted.map((v) => v.n).join(",") },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const unsortedMiddle = data[Math.floor(data.length / 2)]!;
  const candidates: Candidate[] = [
    // median-unsorted: the middle of the list as written, not as sorted
    { tag: "median-unsorted", value: unsortedMiddle, when: measure === "MEDIAN" },
    { tag: "median-unsorted", value: median(data), when: measure !== "MEDIAN" && variant !== "missing" },
    // mean-count-error: divides by one too few
    { tag: "mean-count-error", value: () => div0(sum(data), rat(data.length - 1)), when: data.length > 1 },
    // mode-as-max: reports the largest value rather than the most frequent
    { tag: "mode-as-max", value: sorted[sorted.length - 1]!, when: variant !== "missing" },
    // The slip on a missing-value card is answering with the mean of what you
    // can see, as if the hidden value did not count.
    { tag: "mode-as-max", value: () => div0(sum(shown), rat(shown.length)), when: variant === "missing" },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correctValue, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${measure}|${sorted.map((v) => `${v.n}/${v.d}`).join(",")}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correctValue,
    answerText: show(correctValue),
    accept: acceptRational(correctValue),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, measure, values: sorted.map((v) => v.n).join(",") },
  };
}
