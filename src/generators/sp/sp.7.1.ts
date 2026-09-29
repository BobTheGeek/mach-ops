// sp.7.1 — Probability and sample spaces
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, sub, mul, div0, cmp, fmtFraction, fmtInt } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.7.1";

type Variant =
  | "likelihood"   // where does this sit between impossible and certain  (tier 1)
  | "simple"       // P(event) as a fraction                              (tier 2)
  | "complement"   // P(not the event)                                    (tier 3)
  | "predict";     // relative frequency -> predicted count               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["likelihood"],
  2: ["simple", "likelihood"],
  3: ["complement", "simple"],
  4: ["predict", "complement"],
};

/**
 * The registry's draws: bags of 5-20 items in 2-4 colours, spinners of 3-8
 * sectors, dice. Each names its own container and its own outcome so no sentence
 * is assembled from parts that do not belong together.
 */
const SKINS = {
  bag: { holder: "The ordnance bag holds", unit: "rounds", pickVerb: "You pull one round at random" },
  spinner: { holder: "The threat wheel has", unit: "sectors", pickVerb: "You spin it once" },
  contacts: { holder: "The radar tape shows", unit: "contacts", pickVerb: "You query one contact at random" },
} as const;

type SkinKey = keyof typeof SKINS;

/** What the favourable outcomes are called, per skin. */
const LABELS = {
  bag: ["LIVE", "DUD", "TRAINING", "INERT"],
  spinner: ["CLEAR", "STORM", "HAZE", "ICING"],
  contacts: ["FRIENDLY", "HOSTILE", "UNKNOWN", "CIVILIAN"],
} as const;

export const LIKELIHOODS = ["IMPOSSIBLE", "UNLIKELY", "EVEN CHANCE", "LIKELY", "CERTAIN"] as const;

/** The five words the registry's likelihood line is labelled with. */
export function likelihoodOf(p: Rational): string {
  if (p.n === 0) return "IMPOSSIBLE";
  if (cmp(p, rat(1)) === 0) return "CERTAIN";
  const c = cmp(p, rat(1, 2));
  return c === 0 ? "EVEN CHANCE" : c < 0 ? "UNLIKELY" : "LIKELY";
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "predict" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];
  const names = LABELS[skinKey];

  // --- 1. build the sample space ----------------------------------------
  const groups = int(rng, 2, 4);
  // Counts per outcome. The registry caps the container at 20, and the
  // likelihood variant needs the full range of answers to be reachable, so a
  // favourable count of 0 (impossible) and of everything (certain) are both
  // allowed to be drawn.
  const counts: number[] = [];
  let left = int(rng, 5, 20);
  for (let i = 0; i < groups; i++) {
    const remaining = groups - i - 1;
    const take = i === groups - 1 ? left : int(rng, 1, Math.max(1, left - remaining));
    counts.push(take);
    left -= take;
  }
  const total = counts.reduce((a, b) => a + b, 0);

  const drawn = int(rng, 0, groups - 1);
  const ends = rng() < 0.25;
  const side = rng() < 0.5;

  /**
   * 7 out of 15 is 0.467. Calling that UNLIKELY rather than EVEN CHANCE is a
   * coin-toss of a judgement, so the likelihood card only draws counts that are
   * exactly half or clearly one side of it.
   */
  const clear = (f: number): boolean => {
    const d = Math.abs(f / total - 0.5);
    return d === 0 || d >= 1 / 6;
  };

  // Asking about one group of several is nearly always UNLIKELY, so half the
  // time the card asks about the largest group instead and the five words come
  // up at comparable rates.
  const biggest = Math.max(...counts);
  const order = side ? [biggest, ...counts] : [counts[drawn]!, ...counts];

  const favourable = variant !== "likelihood"
    ? counts[drawn]!
    // A card that can never say IMPOSSIBLE or CERTAIN teaches half the line.
    : ends ? (side ? 0 : total)
      : (order.find(clear) ?? (side ? 0 : total));
  const pickIndex = Math.max(0, counts.indexOf(favourable));
  const outcome = favourable === 0 ? "JAMMED" : favourable === total ? "ONE OF THESE" : names[pickIndex]!;

  const p = div0(rat(favourable), rat(total));
  const notP = sub(rat(1), p);

  // Tier 4 runs the experiment instead of counting it.
  const trials = int(rng, 1, 12) * 50;
  const predicted = mul(p, rat(trials));

  const correct: Rational = variant === "complement" ? notP : variant === "predict" ? predicted : p;

  // --- 2. prompt --------------------------------------------------------
  const spaceRows = [
    ["OUTCOME", ...names.slice(0, groups)],
    ["HOW MANY", ...counts.map((c) => String(c))],
  ];

  // The likelihood card is judged against the line, so the line must not carry
  // the answer. The counts go in the sentence and the line stays a bare scale.
  const breakdown = counts.map((c, i) => `${c} ${names[i]!}`).join(", ");

  const text =
    variant === "likelihood"
      ? bind("{{holder}} {{total}} {{unit}}: {{breakdown}}. {{verb}}. How likely is it to be {{outcome}}?", {
          holder: skin.holder, total: String(total), unit: skin.unit,
          breakdown, verb: skin.pickVerb, outcome,
        })
      : variant === "simple"
        ? bind("{{holder}} {{total}} {{unit}}. {{verb}}. What is P({{outcome}})?", {
            holder: skin.holder, total: String(total), unit: skin.unit, verb: skin.pickVerb, outcome,
          })
        : variant === "complement"
          ? bind("{{holder}} {{total}} {{unit}}. {{verb}}. What is P(NOT {{outcome}})?", {
              holder: skin.holder, total: String(total), unit: skin.unit, verb: skin.pickVerb, outcome,
            })
          : bind("{{holder}} {{total}} {{unit}}. You run {{trials}} draws, replacing each time. How many {{outcome}} should you expect?", {
              holder: skin.holder, total: String(total), unit: skin.unit, trials: fmtInt(trials), outcome,
            });

  const prompt = {
    text,
    figure: variant === "likelihood"
      ? { kind: "likelihood-line" as const }
      : { kind: "sample-space-list" as const, rows: spaceRows },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Count the total number of outcomes. That is every item that could come out, not every kind of item.", math: `total = ${total}` },
    { text: "Count the favourable ones: the outcomes that make the event happen.", math: `favourable = ${favourable}` },
    {
      text: variant === "complement"
        ? "P(event) is favourable over total. P(NOT the event) is 1 minus that, because everything else is the other case."
        : "P(event) is favourable over total. It is always between 0 and 1.",
      math: variant === "complement" ? `1 − ${fmtFraction(p)} = ${fmtFraction(notP)}` : `${favourable}/${total} = ${fmtFraction(p)}`,
    },
    {
      text: variant === "predict"
        ? "A prediction is the probability times the number of trials, not the probability on its own."
        : variant === "likelihood"
          ? "Compare it with 1/2. Zero is impossible, 1 is certain, and 1/2 is even either way."
          : "Write it in lowest terms, and check it is not above 1.",
      math: variant === "predict"
        ? `${fmtFraction(p)} × ${fmtInt(trials)} = ${fmtFraction(predicted)}`
        : variant === "likelihood" ? likelihoodOf(p) : fmtFraction(p),
    },
  ];

  // --- 4. the likelihood variant answers in words -----------------------
  if (variant === "likelihood") {
    const right = likelihoodOf(p);
    // Each foil is the word a named mistake actually produces, in priority
    // order: buildChoice drops any that collide with the answer or each other.
    const MIRROR: Record<string, string> = {
      IMPOSSIBLE: "CERTAIN", CERTAIN: "IMPOSSIBLE",
      UNLIKELY: "LIKELY", LIKELY: "UNLIKELY", "EVEN CHANCE": "UNLIKELY",
    };
    const candidates: Candidate[] = [
      { tag: "complement", value: MIRROR[right]! },
      { tag: "assume-equal", value: "EVEN CHANCE" },
      { tag: "over-one", value: "CERTAIN" },
      { tag: "over-one", value: "IMPOSSIBLE" },
      { tag: "assume-equal", value: "LIKELY" },
      { tag: "complement", value: "UNLIKELY" },
    ];
    const choice = buildChoice(rng, right, candidates, (a: Answer) => String(a));
    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${counts.join(",")}|${favourable}`),
      format: "likelihood-select",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, counts: counts.join(","), favourable },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const unfavourable = total - favourable;
  const candidates: Candidate[] = [
    // over-one: favourable over UNfavourable, which can exceed 1
    { tag: "over-one", value: () => div0(rat(favourable), rat(unfavourable)), when: unfavourable > 0 && variant !== "predict" },
    { tag: "over-one", value: () => mul(div0(rat(favourable), rat(unfavourable)), rat(trials)), when: unfavourable > 0 && variant === "predict" },
    // assume-equal: treats the outcome kinds as equally likely, so 1 in k
    { tag: "assume-equal", value: div0(rat(1), rat(groups)), when: variant !== "predict" },
    { tag: "assume-equal", value: div0(rat(trials), rat(groups)), when: variant === "predict" },
    // complement: reports P(A) when P(not A) was asked, and the other way round
    { tag: "complement", value: variant === "complement" ? p : notP, when: variant !== "predict" },
    { tag: "complement", value: mul(notP, rat(trials)), when: variant === "predict" },
    // prediction-unscaled belongs to sp.7.2, but reporting P itself is the same
    // slip here, so it is offered under the registry's own "over-one" tag only
    // when nothing else survives.
  ];

  const fmt = (v: Answer): string => fmtFraction(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${counts.join(",")}|${favourable}|${variant === "predict" ? trials : 0}`),
    format: variant === "predict" ? (rng() < 0.5 ? "numeric" : "multiple-choice") : (rng() < 0.5 ? "fraction" : "multiple-choice"),
    prompt,
    answer: correct,
    answerText: fmtFraction(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, counts: counts.join(","), favourable, trials },
  };
}
