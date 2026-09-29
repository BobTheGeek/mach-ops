// sp.7.5 — Choosing appropriate measures
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, sub, abs, cmp, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { mean, median, sortAsc } from "../../engine/stats";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "sp.7.5";

type Variant =
  | "shape"     // symmetric or skewed, and which way          (tier 1)
  | "measure"   // which measure of centre describes it best   (tier 2)
  | "outlier"   // one abort: does that change the choice      (tier 3)
  | "compare";  // two distributions, one choice each          (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["shape"],
  2: ["measure", "shape"],
  3: ["outlier", "measure"],
  4: ["compare", "outlier"],
};

type Shape = "SYMMETRIC" | "SKEWED RIGHT" | "SKEWED LEFT";

const SKINS = {
  sortie: { noun: "sortie durations", unit: "minutes", a: "EAGLE", b: "FALCON" },
  kills: { noun: "kill counts", unit: "kills", a: "EAGLE", b: "FALCON" },
  lock: { noun: "lock times", unit: "seconds", a: "ALPHA", b: "BRAVO" },
} as const;

type SkinKey = keyof typeof SKINS;

const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));
const list = (vs: readonly Rational[]): string => vs.map(show).join(", ");
const nums = (vs: readonly Rational[]): number[] => vs.map((v) => v.n / v.d);

/**
 * A set of the requested shape.
 *
 * Symmetric sets are built as a mirror about a centre, so the mean and the
 * median are equal exactly rather than nearly. Skewed sets get a tail on one
 * side wide enough that the mean is dragged clear of the median; a set where
 * they differ by a hair is not a set anyone can classify by eye.
 */
function build(rng: () => number, shape: Shape): Rational[] {
  const centre = int(rng, 30, 60);
  const step = int(rng, 2, 5);

  if (shape === "SYMMETRIC") {
    const arms = int(rng, 2, 3);
    const values = [centre];
    for (let i = 1; i <= arms; i++) {
      const d = step * i;
      const copies = arms + 1 - i;
      for (let c = 0; c < copies; c++) { values.push(centre - d); values.push(centre + d); }
    }
    return sortAsc(values.map((v) => rat(v)));
  }

  // A cluster plus a tail. The tail is a long way out, which is what makes the
  // mean move and the median stay put. A left tail is built downward from a high
  // cluster rather than mirrored, because mirroring a right tail ran the values
  // through zero and a one-minute sortie is not data, it is a bug.
  const size = int(rng, 5, 7);
  const tails = int(rng, 2, 3);
  if (shape === "SKEWED RIGHT") {
    const cluster = Array.from({ length: size }, () => centre + int(rng, -step, step));
    const tail = Array.from({ length: tails }, (_, i) => centre + (i + 3) * step * int(rng, 3, 5));
    return sortAsc([...cluster, ...tail].map((v) => rat(v)));
  }
  const top = centre + int(rng, 50, 90);
  const cluster = Array.from({ length: size }, () => top + int(rng, -step, step));
  const tail = Array.from({ length: tails }, (_, i) => Math.max(5, top - (i + 3) * step * int(rng, 3, 5)));
  return sortAsc([...cluster, ...tail].map((v) => rat(v)));
}

/** The shape a set actually has, with a margin so the call is never a coin toss. */
function shapeOfSet(values: readonly Rational[]): Shape | null {
  const gap = sub(mean(values), median(values));
  if (gap.n === 0) return "SYMMETRIC";
  if (cmp(abs(gap), rat(3)) < 0) return null;
  return gap.n > 0 ? "SKEWED RIGHT" : "SKEWED LEFT";
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "compare" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. build a set of a known shape ----------------------------------
  // "Which measure" and the squadron comparison both answer MEAN exactly when
  // the set is symmetric. Drawing one shape in three would make MEDIAN right
  // two times in three and reward not reading the data at all, so those two
  // variants see a symmetric set half the time.
  // A quarter forced symmetric plus a third of the remaining three-way draw
  // puts MEAN and MEDIAN at one in two, which is where a two-option card has to
  // sit or the right answer can be guessed from the question alone.
  const wanted: Shape = (variant === "measure" || variant === "compare") && rng() < 0.25
    ? "SYMMETRIC"
    : pick(rng, ["SYMMETRIC", "SKEWED RIGHT", "SKEWED LEFT"] as Shape[]);
  let data = build(rng, wanted);
  let shape = shapeOfSet(data);
  for (let attempt = 0; attempt < 30 && shape !== wanted; attempt++) {
    data = build(rng, wanted);
    shape = shapeOfSet(data);
  }
  if (shape === null) shape = wanted;

  // Tier 3 takes a clean symmetric set and drops one abort into it, which is
  // the whole reason the choice of measure ever changes.
  // Half the time the extra sortie is an ordinary one, so "an extra value was
  // added" is not by itself a reason to switch to the median. Only a value far
  // from the rest is.
  const symmetric = build(rng, "SYMMETRIC");
  const sortedSym = sortAsc(symmetric);
  const reallyOdd = rng() < 0.5;
  const late = reallyOdd
    ? rat(sortedSym[symmetric.length - 1]!.n * 4)
    : rat(sortedSym[int(rng, 1, symmetric.length - 2)]!.n + int(rng, -2, 2));
  const withOutlier = sortAsc([...symmetric, late]);

  // Tier 4 sets a symmetric squadron against a skewed one.
  const rivalShape: Shape = shape === "SYMMETRIC" ? pick(rng, ["SKEWED RIGHT", "SKEWED LEFT"] as Shape[]) : "SYMMETRIC";
  let rival = build(rng, rivalShape);
  for (let attempt = 0; attempt < 30 && shapeOfSet(rival) !== rivalShape; attempt++) rival = build(rng, rivalShape);

  const shown = variant === "outlier" ? withOutlier : data;
  // Symmetric with nothing odd in it is the only case the mean wins.
  const useMean = variant === "outlier" ? !reallyOdd : shape === "SYMMETRIC";

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "shape"
      ? bind("The {{noun}} are {{list}} {{unit}}. What shape is this data?", {
          noun: skin.noun, list: list(shuffle(rng, [...shown])), unit: skin.unit,
        })
      : variant === "measure"
        ? bind("The {{noun}} are {{list}} {{unit}}. Which measure of CENTRE describes them best?", {
            noun: skin.noun, list: list(shuffle(rng, [...shown])), unit: skin.unit,
          })
        : variant === "outlier"
          ? bind("The {{noun}} were {{list}} {{unit}}, then one more came in at {{late}}. Which measure of CENTRE describes them best now?", {
              noun: skin.noun, list: list(symmetric), unit: skin.unit, late: show(late),
            })
          : bind("{{a}} logged {{la}}. {{b}} logged {{lb}}. Both in {{unit}}. Which squadron should be summarised with the MEAN?", {
              a: skin.a, la: list(shown), b: skin.b, lb: list(rival), unit: skin.unit,
            });

  const prompt = {
    text,
    figure: variant === "compare"
      ? { kind: "parallel-dot-plots" as const, rows: [nums(shown), nums(rival)], labels: [skin.a, skin.b], min: 0 }
      : { kind: "skew-vs-symmetric" as const, values: nums(shown), min: 0 },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Look at the shape first. A mirror-image pile is symmetric; a long tail on one side is skewed towards that side.", math: shape },
    { text: "Compare the mean with the median. A tail to the RIGHT drags the mean ABOVE the median; a tail to the left drags it below.", math: `mean ${show(mean(shown))}   median ${show(median(shown))}` },
    { text: "Hunt for outliers. One value far from the rest is enough to make the mean a bad summary on its own.", math: variant === "outlier" && reallyOdd ? `${show(late)} is far out` : "nothing far out" },
    { text: "Symmetric with no outliers: use the MEAN and the MAD. Skewed or with outliers: use the MEDIAN and the IQR.", math: useMean ? "MEAN and MAD" : "MEDIAN and IQR" },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${shown.map((v) => v.n).join(",")}|${variant === "compare" ? rival.map((v) => v.n).join(",") : ""}`);

  // --- 4. the shape question answers with a shape -----------------------
  if (variant === "shape") {
    const MIRROR: Record<Shape, Shape> = {
      "SYMMETRIC": "SKEWED RIGHT", "SKEWED RIGHT": "SKEWED LEFT", "SKEWED LEFT": "SKEWED RIGHT",
    };
    const candidates: Candidate[] = [
      // skew-direction: left and right read the wrong way round
      { tag: "skew-direction", value: MIRROR[shape] },
      { tag: "always-mean", value: "SYMMETRIC" },
      { tag: "skew-direction", value: "SKEWED LEFT" },
      { tag: "always-mean", value: "SKEWED RIGHT" },
    ];
    const choice = buildChoice(rng, shape, candidates, (a: Answer) => String(a), 3);
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: shape,
      answerText: shape,
      accept: (input: Answer) => String(input).toUpperCase() === shape,
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, shape, values: shown.map((v) => v.n).join(",") },
    };
  }

  // --- 5. the comparison names a squadron -------------------------------
  if (variant === "compare") {
    const right = shape === "SYMMETRIC" ? skin.a : skin.b;
    const foil = right === skin.a ? skin.b : skin.a;
    const options = [skin.a, skin.b];
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: [{ tag: "always-mean", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: "always-mean" },
      params: { variant, skin: skinKey, shape, values: shown.map((v) => v.n).join(",") },
    };
  }

  // --- 6. which measure -------------------------------------------------
  const right = useMean ? "MEAN" : "MEDIAN";
  const options = ["MEAN", "MEDIAN"];
  const foil = useMean ? "MEDIAN" : "MEAN";
  return {
    skill: SKILL, tier, seed, hash,
    format: "multiple-choice",
    prompt,
    answer: right,
    answerText: right,
    accept: (input: Answer) => String(input).toUpperCase() === right,
    distractors: [{ tag: "always-mean", value: foil }],
    options,
    optionText: options,
    correctIndex: options.indexOf(right),
    worked,
    errorTagsByAnswer: { [foil]: "always-mean" },
    params: { variant, skin: skinKey, shape, values: shown.map((v) => v.n).join(",") },
  };
}
