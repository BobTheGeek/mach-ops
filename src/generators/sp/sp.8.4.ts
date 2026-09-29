// sp.8.4 — Using random samples to compare populations
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, sub, abs, cmp, fmtInt, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { fiveNumber, range, sortAsc } from "../../engine/stats";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.8.4";

type Variant =
  | "medians"  // read two sample box plots                      (tier 1)
  | "spread"   // compare with the mean and the range            (tier 2)
  | "meaningful" // is the gap bigger than the overlap           (tier 3)
  | "advise";  // conclude, or go and collect more               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["medians"],
  2: ["spread", "medians"],
  3: ["meaningful", "spread"],
  4: ["advise", "meaningful"],
};

const SKINS = {
  lock: { noun: "lock times", one: "lock time", unit: "seconds", a: "F-16 PILOTS", b: "F-15 PILOTS" },
  sortie: { noun: "sortie times", one: "sortie time", unit: "minutes", a: "EAGLE", b: "FALCON" },
} as const;

type SkinKey = keyof typeof SKINS;

const show = (r: Rational): string =>
  (r.d === 1 ? fmtInt(r.n) : isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));
const nums = (vs: readonly Rational[]): number[] => vs.map((v) => v.n / v.d);
const asPlot = (vs: readonly Rational[]) => {
  const f = fiveNumber(vs);
  const n = (r: Rational): number => r.n / r.d;
  return { min: n(f.min), q1: n(f.q1), median: n(f.median), q3: n(f.q3), max: n(f.max) };
};

/** A sample of `count` values scattered around a centre, all whole and distinct. */
function sample(rng: () => number, centre: number, half: number, count: number): Rational[] {
  const lo = Math.max(4, centre - half);
  const hi = centre + half;
  const pool = shuffle(rng, Array.from({ length: hi - lo + 1 }, (_, i) => i + lo));
  return sortAsc(pool.slice(0, count).map((v) => rat(v)));
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "advise" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. two samples, overlapping or not -------------------------------
  // The registry: 10-15 values each, with the overlap varied. Separated boxes
  // support a conclusion; overlapping ones do not, and the card has to show
  // both or "is this meaningful" is a question with one standing answer.
  const count = int(rng, 5, 7) * 2 + 1;
  const half = int(rng, 8, 16);
  const separated = rng() < 0.5;
  const centreA = int(rng, 40, 70);
  const centreB = centreA + (separated ? half * 3 : int(rng, 2, 5));

  const setA = sample(rng, centreA, half, count);
  const setB = sample(rng, centreB, half, count);

  const fa = fiveNumber(setA);
  const fb = fiveNumber(setB);
  const higher = cmp(fa.median, fb.median) > 0 ? skin.a : skin.b;
  const medianGap = cmp(fa.median, fb.median) >= 0 ? sub(fa.median, fb.median) : sub(fb.median, fa.median);
  // Boxes clear of each other: Q1 of the upper is above Q3 of the lower.
  const upper = cmp(fa.median, fb.median) > 0 ? fa : fb;
  const lower = cmp(fa.median, fb.median) > 0 ? fb : fa;
  const boxesClear = cmp(upper.q1, lower.q3) > 0;

  const rangeA = range(setA);
  const rangeB = range(setB);

  const correct: Rational = variant === "spread" ? rangeA : medianGap;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "medians"
      ? bind("Two samples, same axis. How much higher is the MEDIAN {{one}} of {{h}} than the other?", { one: skin.one, h: higher })
      : variant === "spread"
        // The medians, not the means: an odd-sized sample of whole values has a
        // whole median, and "averaged 63 11/15 minutes" is not a sentence.
        ? bind("{{a}} had a median of {{ma}} {{unit}} and {{b}} {{mb}}. What is the RANGE of the {{a}} sample?", {
            a: skin.a, ma: show(fa.median), unit: skin.unit, b: skin.b, mb: show(fb.median),
          })
        : variant === "meaningful"
          ? bind("These are SAMPLES, not the whole squadrons. Looking at the two boxes, is the difference in {{noun}} big enough to report?", { noun: skin.noun })
          : bind("These are SAMPLES of {{noun}}, taken once each. What should you do next?", { noun: skin.noun });

  const prompt = {
    text,
    units: skin.unit,
    figure: {
      kind: "side-by-side-box-plots" as const,
      plots: [asPlot(setA), asPlot(setB)],
      labels: [skin.a, skin.b],
      min: 0,
      max: Math.ceil(Math.max(...nums(setA), ...nums(setB)) / 10) * 10 + 10,
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Read a centre off each plot. The line inside the box is the median of that sample.", math: `${skin.a} ${show(fa.median)}   ${skin.b} ${show(fb.median)}` },
    { text: "Read the spread of each. The box is the middle half; the whiskers reach the smallest and largest values.", math: `boxes ${show(fa.q1)}–${show(fa.q3)} and ${show(fb.q1)}–${show(fb.q3)}` },
    { text: "Ask whether the boxes overlap. Boxes that sit clear of each other support a conclusion; boxes that sit on top of each other do not.", math: boxesClear ? "the boxes are clear of each other" : "the boxes overlap" },
    { text: "Say how confident you are. One sample from each is a hint, not a proof, and overlapping boxes mean the honest answer is to collect more.", math: boxesClear ? `${higher} is higher` : "not enough to say" },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${setA.map((v) => v.n).join(",")}|${setB.map((v) => v.n).join(",")}`);

  // --- 4. is the difference worth reporting -----------------------------
  if (variant === "meaningful") {
    const right = boxesClear ? "YES" : "NO";
    const foil = boxesClear ? "NO" : "YES";
    const options = ["YES", "NO"];
    return {
      skill: SKILL, tier, seed, hash,
      format: "yes-no",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: [{ tag: "ignore-overlap", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: "ignore-overlap" },
      params: { variant, skin: skinKey, boxesClear: String(boxesClear) },
    };
  }

  // --- 5. what to do next -----------------------------------------------
  if (variant === "advise") {
    const REPORT = `REPORT THAT ${higher} CAME OUT HIGHER, AND SAY IT CAME FROM ONE SAMPLE EACH`;
    const MORE = "TAKE MORE SAMPLES — THESE BOXES OVERLAP TOO MUCH TO CALL IT";
    const right = boxesClear ? REPORT : MORE;
    const candidates: Candidate[] = [
      // one-sample-proof: treats a single sample as settled fact
      { tag: "one-sample-proof", value: `CONCLUDE THAT ${higher} IS DEFINITELY FASTER` },
      // ignore-overlap: reads a clear result out of overlapping boxes
      { tag: "ignore-overlap", value: boxesClear ? MORE : REPORT },
      { tag: "one-sample-proof", value: `REPORT THAT THE TWO SQUADRONS ARE IDENTICAL` },
    ];
    const choice = buildChoice(rng, right, candidates, (a: Answer) => String(a));
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input) === right,
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, boxesClear: String(boxesClear) },
    };
  }

  // --- 6. distractors from registry error tags --------------------------
  // Every recipe is written to stay positive: "how much higher" and "how wide"
  // have no negative answers, and a minus sign on an option is a tell.
  const candidates: Candidate[] = [
    // ignore-overlap: answers with a spread where a gap was asked for
    { tag: "ignore-overlap", value: variant === "spread" ? rangeB : abs(sub(upper.q3, lower.q1)) },
    // one-sample-proof: reaches for the extremes, as if the samples were the whole story
    { tag: "one-sample-proof", value: variant === "spread" ? sub(fa.q3, fa.q1) : abs(sub(upper.max, lower.min)) },
    { tag: "ignore-overlap", value: variant === "spread" ? abs(sub(rangeA, rangeB)) : abs(sub(upper.max, lower.max)) },
    { tag: "one-sample-proof", value: variant === "spread" ? sub(fa.max, fa.median) : abs(sub(upper.q1, lower.q1)) },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed, hash,
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
    params: { variant, skin: skinKey, boxesClear: String(boxesClear) },
  };
}
