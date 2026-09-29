// sp.8.1 — Samples and populations
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { fmtInt } from "../../engine/rational";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "sp.8.1";

type Variant =
  | "identify"  // which is the population and which the sample   (tier 1)
  | "judge"     // is this one method fair?                       (tier 2)
  | "choose"    // which of four methods is fair                  (tier 3)
  | "design";   // the biggest sample is not the fair one         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["identify"],
  2: ["judge", "identify"],
  3: ["choose", "judge"],
  4: ["design", "choose"],
};

/**
 * Each scenario carries its own population, its own sampling methods and its
 * own wording. Exactly one method is random, which is the registry's own rule
 * for this skill.
 */
const SCENARIOS = {
  helmet: {
    question: "what every pilot on the base thinks of the new helmet",
    population: "all {{N}} pilots on the base",
    unit: "pilots",
    random: "Draw {{n}} pilot numbers at random from the full roster.",
    convenience: "Ask the {{n}} pilots sitting in the ready room.",
    big: "Ask all {{B}} pilots in the biggest squadron.",
    selfSelected: "Pin a form to the noticeboard and count whoever fills it in.",
    place: "the pilots in the ready room",
  },
  maintenance: {
    question: "how many of the airframes across the wing need a wing-spar check",
    population: "all {{N}} airframes in the wing",
    unit: "airframes",
    random: "Inspect {{n}} tail numbers drawn at random from the whole wing.",
    convenience: "Inspect the {{n}} airframes already parked outside the hangar.",
    big: "Inspect all {{B}} airframes at the largest base.",
    selfSelected: "Inspect only the airframes whose crews reported a problem.",
    place: "the airframes already parked outside",
  },
  rations: {
    question: "how the whole wing rates the new flight rations",
    population: "all {{N}} aircrew in the wing",
    unit: "aircrew",
    random: "Pick {{n}} names at random from the wing roster.",
    convenience: "Ask the {{n}} aircrew in the mess at lunchtime.",
    big: "Ask all {{B}} aircrew on the night shift.",
    selfSelected: "Count the complaint cards that came back.",
    place: "the aircrew in the mess",
  },
} as const;

type ScenarioKey = keyof typeof SCENARIOS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "design" : pick(rng, VARIANTS[tier]);
  const key = (opts.skin as ScenarioKey | undefined) ?? pick(rng, Object.keys(SCENARIOS) as ScenarioKey[]);
  const sc = SCENARIOS[key];

  // --- 1. the numbers ---------------------------------------------------
  const population = int(rng, 6, 40) * 50;
  const sample = int(rng, 2, 10) * 10;
  // The biased-but-large option has to be genuinely larger than the fair sample,
  // or "a bigger sample must be fairer" is not even tempting.
  const big = sample + int(rng, 4, 20) * 10;

  const fill = { N: fmtInt(population), n: fmtInt(sample), B: fmtInt(big) };
  const methods = {
    random: bind(sc.random, fill),
    convenience: bind(sc.convenience, fill),
    big: bind(sc.big, fill),
    selfSelected: sc.selfSelected,
  };
  const populationText = bind(sc.population, fill);
  const sampleText = `the ${fmtInt(sample)} ${sc.unit} actually asked`;

  // --- 2. prompt --------------------------------------------------------
  // The judged method is fair half the time, so "no" is not a free answer.
  const judged = rng() < 0.5 ? "random" : pick(rng, ["convenience", "big", "selfSelected"] as const);
  const askPopulation = rng() < 0.5;

  const text =
    variant === "identify"
      ? bind("The wing wants to know {{q}}. {{m}} What is the {{which}}?", {
          q: sc.question, m: methods.random, which: askPopulation ? "POPULATION" : "SAMPLE",
        })
      : variant === "judge"
        ? bind("The wing wants to know {{q}}. Method: {{m}} Is that a fair sample?", {
            q: sc.question, m: methods[judged],
          })
        : variant === "choose"
          ? bind("The wing wants to know {{q}}. Which method gives a fair sample?", { q: sc.question })
          : bind("You have time to ask {{n}} {{unit}} about {{q}}. What decides whether that sample is fair?", {
              n: fmtInt(sample), unit: sc.unit, q: sc.question,
            });

  const prompt = {
    text,
    figure: {
      kind: "population-sample-diagram" as const,
      rows: [["POPULATION", populationText], ["SAMPLE", sampleText]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Name the POPULATION: everyone or everything the question is about, not just the ones you can reach.", math: populationText },
    { text: "Name the SAMPLE: the part you actually collect data from.", math: sampleText },
    { text: "Ask whether every member of the population had an equal chance of being picked. Only a random draw from the whole list does that.", math: "random draw from the full roster" },
    { text: "Size does not fix bias. A big sample of the wrong group is still the wrong group.", math: `${fmtInt(big)} from one squadron is still one squadron` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${key}|${population}|${sample}|${big}|${variant === "judge" ? judged : askPopulation}`);

  // --- 4. identify: population or sample --------------------------------
  if (variant === "identify") {
    const right = askPopulation ? populationText : sampleText;
    const candidates: Candidate[] = [
      { tag: "convenience", value: askPopulation ? sampleText : populationText },
      { tag: "big-is-unbiased", value: `the ${fmtInt(big)} ${sc.unit} in the biggest squadron` },
      { tag: "convenience", value: sc.place },
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
      params: { variant, skin: key, population, sample, asked: askPopulation ? "POPULATION" : "SAMPLE" },
    };
  }

  // --- 5. judge one method ----------------------------------------------
  if (variant === "judge") {
    const right = judged === "random" ? "YES" : "NO";
    const foil = right === "YES" ? "NO" : "YES";
    const options = ["YES", "NO"];
    const tag = judged === "big" ? "big-is-unbiased" : "convenience";
    return {
      skill: SKILL, tier, seed, hash,
      format: "yes-no",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: [{ tag, value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: tag },
      params: { variant, skin: key, population, sample, judged },
    };
  }

  // --- 6. design: what makes a sample fair, rather than which one is ------
  const DESIGN_RIGHT = "DRAWING THE NAMES AT RANDOM FROM THE WHOLE ROSTER";
  const design: Candidate[] = [
    { tag: "big-is-unbiased", value: "ASKING AS MANY AS POSSIBLE" },
    { tag: "convenience", value: "ASKING WHOEVER IS EASIEST TO REACH" },
    { tag: "convenience", value: "ASKING ONLY THE ONES WITH SOMETHING TO SAY" },
  ];

  // --- 7. choose the fair method ----------------------------------------
  const candidates: Candidate[] = variant === "design" ? design : [
    { tag: "big-is-unbiased", value: methods.big },
    { tag: "convenience", value: methods.convenience },
    { tag: "convenience", value: methods.selfSelected },
  ];
  const right = variant === "design" ? DESIGN_RIGHT : methods.random;
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
    params: { variant, skin: key, population, sample, big },
  };
}
