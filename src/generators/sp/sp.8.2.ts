// sp.8.2 — Using random samples to describe populations
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul, div0, fmtInt, fmtFraction, fmtDecimal, isTerminating } from "../../engine/rational";
import { mean, sortAsc } from "../../engine/stats";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.8.2";

type Variant =
  | "scale"    // sample proportion -> a count for the population   (tier 1)
  | "average"  // sample mean -> an estimate of the population mean (tier 2)
  | "spread"   // several samples, one reasonable estimate          (tier 3)
  | "size";    // is this sample big enough to say anything         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["scale"],
  2: ["average", "scale"],
  3: ["spread", "average"],
  4: ["size", "spread"],
};

const SKINS = {
  missiles: { thing: "missiles", trait: "duds", store: "depot", measure: "flight hours", unit: "hours" },
  airframes: { thing: "airframes", trait: "due a spar check", store: "wing", measure: "sortie length", unit: "minutes" },
  rounds: { thing: "rounds", trait: "misfires", store: "magazine", measure: "muzzle velocity", unit: "m/s" },
} as const;

type SkinKey = keyof typeof SKINS;

const show = (r: Rational): string =>
  (r.d === 1 ? fmtInt(r.n) : isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "size" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. sample, population, and the share between them ----------------
  // The registry's ranges: a sample of 20-100 out of a population of 500-5,000,
  // with the share a clean fraction so the estimate is a whole number of things.
  const sample = int(rng, 2, 10) * 10;
  const population = int(rng, 1, 10) * 500;
  const share = pick(rng, [
    rat(1, 10), rat(1, 5), rat(1, 4), rat(3, 10), rat(2, 5), rat(1, 2), rat(3, 5), rat(3, 4),
  ]);
  const found = mul(rat(sample), share);
  const estimate = mul(rat(population), share);

  // Tier 2 estimates an average rather than a count.
  const sampleValues = sortAsc(Array.from({ length: 5 }, () => rat(int(rng, 20, 90))));
  const sampleMean = mean(sampleValues);

  // Tier 3 shows what several samples of the same population look like. The
  // three offsets are drawn distinct and are NOT made to cancel: if they did,
  // the average would land back on one of the three and the card would look
  // like a trick rather than an average.
  // Offsets are tens, so they have to stay small enough that the lowest of the
  // three sample estimates is still a positive count of things.
  const maxK = Math.max(3, Math.min(9, Math.floor(estimate.n / estimate.d / 10) - 1));
  const offsetPool = shuffle(rng, [
    ...Array.from({ length: maxK - 1 }, (_, i) => -(i + 2)),
    ...Array.from({ length: maxK - 1 }, (_, i) => i + 2),
  ]);
  const offsets = ((): number[] => {
    // A sum divisible by three keeps the average of the three estimates a whole
    // number of missiles, and distinct offsets keep the three samples from
    // printing the same figure twice. Every trio is tried, not a sliding
    // window: the fallback used to reach outside the clamp and produce a
    // negative count.
    for (let i = 0; i < offsetPool.length; i++) {
      for (let j = i + 1; j < offsetPool.length; j++) {
        for (let k = j + 1; k < offsetPool.length; k++) {
          const trio = [offsetPool[i]!, offsetPool[j]!, offsetPool[k]!];
          if ((trio[0]! + trio[1]! + trio[2]!) % 3 === 0) return trio;
        }
      }
    }
    return [-2, 2, 3];
  })();
  const others = offsets.map((k) => add(estimate, rat(k * 10)));
  const middle = mean(others);

  const correct: Rational =
    variant === "scale" ? estimate
      : variant === "average" ? sampleMean
        : middle;

  // Tier 4's sample is either a sensible fraction of the population or a token one.
  // "Big enough" has to be a judgement the data supports: a fiftieth of the
  // population against a thousandth of it, not 20 against 25.
  const bigEnough = rng() < 0.5;
  const tiny = bigEnough ? Math.max(50, sample) : int(rng, 3, 8);

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "scale"
      ? bind("A random sample of {{n}} {{thing}} was checked and {{f}} were {{trait}}. {{store}} holds {{N}}. How many of those are {{trait}}?", {
          n: fmtInt(sample), thing: skin.thing, f: show(found), trait: skin.trait,
          store: `The ${skin.store}`, N: fmtInt(population),
        })
      : variant === "average"
        ? bind("Five {{thing}} drawn at random measured {{list}} {{unit}}. Estimate the MEAN {{measure}} for all {{N}}.", {
            thing: skin.thing, list: sampleValues.map(show).join(", "), unit: skin.unit,
            measure: skin.measure, N: fmtInt(population),
          })
        : variant === "spread"
          ? bind("Three random samples of {{thing}} give estimates of {{a}}, {{b}} and {{c}} {{trait}} out of {{N}}. What is a reasonable single estimate?", {
              thing: skin.thing, a: show(others[0]!), b: show(others[1]!), c: show(others[2]!),
              trait: skin.trait, N: fmtInt(population),
            })
          : bind("You checked {{n}} {{thing}} out of {{N}}, picked at random. Is that enough to estimate the whole {{store}}?", {
              n: fmtInt(tiny), thing: skin.thing, N: fmtInt(population), store: skin.store,
            });

  const prompt = {
    text,
    figure: {
      kind: "proportion-table" as const,
      rows: variant === "average"
        ? [["SAMPLE", ...sampleValues.map(show)], ["MEAN", show(sampleMean)]]
        : [["SAMPLE", fmtInt(sample), `${show(found)} ${skin.trait}`],
           ["POPULATION", fmtInt(population), variant === "scale" ? "?" : show(estimate)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Work out the share the sample found: the count divided by the sample size.", math: `${show(found)}/${fmtInt(sample)} = ${fmtFraction(share)}` },
    { text: "Multiply that share by the WHOLE population. The sample count on its own is not an estimate for anything bigger.", math: `${fmtFraction(share)} × ${fmtInt(population)} = ${show(estimate)}` },
    { text: "For an average, the sample mean IS the estimate. You do not scale a mean up: it is already a per-one figure.", math: `mean ${show(sampleMean)} ${skin.unit}` },
    { text: "Expect samples to disagree. Different random samples give different estimates, and that variation is normal, not a mistake.", math: `${show(others[2]!)} to ${show(others[1]!)}` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${sample}|${population}|${share.n}/${share.d}|${sampleValues.map((v) => v.n).join(",")}|${variant === "size" ? tiny : 0}`);

  // --- 4. is the sample big enough --------------------------------------
  if (variant === "size") {
    const right = bigEnough ? "YES" : "NO";
    const foil = bigEnough ? "NO" : "YES";
    const options = ["YES", "NO"];
    return {
      skill: SKILL, tier, seed, hash,
      format: "yes-no",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: [{ tag: "identical-samples", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: "identical-samples" },
      params: { variant, skin: skinKey, sample: tiny, population },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // unscaled: reports the sample count as though it were the population count
    { tag: "unscaled", value: found, when: variant === "scale" },
    { tag: "unscaled", value: mul(sampleMean, rat(5)), when: variant === "average" },
    // identical-samples: expects every sample to agree, so takes one of them and
    // treats it as the answer for all of them.
    { tag: "identical-samples", value: others[0]!, when: variant === "spread" },
    { tag: "identical-samples", value: others[2]!, when: variant === "spread" },
    { tag: "unscaled", value: rat(sample), when: variant === "spread" },
    { tag: "identical-samples", value: rat(sample), when: variant !== "spread" },
    // scaling a mean that is already per-one
    // A population-per-sample figure is a plausible slip on a count or a mean,
    // but on "which single estimate" it is a fraction of an object.
    { tag: "unscaled", value: () => div0(rat(population), rat(sample)), when: sample > 0 && variant !== "spread" },
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
    params: { variant, skin: skinKey, sample, population, share: `${share.n}/${share.d}` },
  };
}
