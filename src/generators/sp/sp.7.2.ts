// sp.7.2 — Experimental and theoretical probability
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, fmtFraction, fmtInt } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.7.2";

type Variant =
  | "experimental"  // P from a frequency table                       (tier 1)
  | "predict"       // theoretical P x trials                         (tier 2)
  | "judge"         // does the run suggest the thing is unfair?      (tier 3)
  | "model";        // build a model from data that is not uniform    (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["experimental"],
  2: ["predict", "experimental"],
  3: ["judge", "predict"],
  4: ["model", "judge"],
};

const SKINS = {
  missiles: { thing: "missile", event: "DUD", other: "GOOD", run: "launches", device: "the batch" },
  radar: { thing: "sweep", event: "HIT", other: "MISS", run: "sweeps", device: "the radar" },
  seat: { thing: "test", event: "PASS", other: "FAIL", run: "tests", device: "the seat" },
} as const;

type SkinKey = keyof typeof SKINS;

/** The registry's theoretical sources: a fair die or a spinner of k sectors. */
const SIDES = [4, 5, 6, 8, 10] as const;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "model" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the run and the theory ----------------------------------------
  const sides = pick(rng, SIDES);
  const theoretical = div0(rat(1), rat(sides));
  // The registry's range, kept to a multiple of the side count so the expected
  // number of hits is whole and the comparison is about the data, not rounding.
  // At least ten expected hits, or "is it faulty" is a question about a handful
  // of events and no answer to it is defensible.
  const trials = sides * int(rng, 10, 60);
  const expected = mul(theoretical, rat(trials));

  // A fair run sits within a tenth of the expected count; a rigged one is at
  // least half again as far out, so "is it unfair" is a real question with a
  // real answer rather than a guess.
  const rigged = rng() < 0.5;
  const swing = rigged ? int(rng, 5, 9) / 10 : int(rng, 0, 8) / 100;
  const up = rng() < 0.5;
  // Never 0 and never every trial: both make the experimental probability a
  // degenerate 0 or 1, and then no named mistake produces a usable wrong option.
  const observed = Math.max(1, Math.min(trials - 1, Math.round(
    expected.n / expected.d * (1 + (up ? swing : -swing)),
  )));

  // A run read straight off a frequency table should reduce to something a
  // twelve-year-old can write down, so the logged counts are twentieths of the
  // run rather than whatever a wild swing happened to land on. Tier 1 reads the
  // table and tier 4 calls the same arithmetic a model; that is the only
  // difference the registry draws between them, and it is a framing one.
  const logTrials = int(rng, 2, 30) * 20;
  const logHits = int(rng, 1, 19) * (logTrials / 20);
  const logP = div0(rat(logHits), rat(logTrials));
  const fromLog = variant === "model" || variant === "experimental";

  const correct: Rational = fromLog ? logP : expected;

  // --- 2. prompt --------------------------------------------------------
  const shownHits = fromLog ? logHits : observed;
  const shownTrials = fromLog ? logTrials : trials;
  const freqRows = [
    ["RESULT", skin.event, skin.other],
    ["COUNT", fmtInt(shownHits), fmtInt(shownTrials - shownHits)],
  ];

  const text =
    variant === "experimental"
      ? bind("{{n}} {{run}} were logged. What is the EXPERIMENTAL probability of {{event}}?", {
          n: fmtInt(logTrials), run: skin.run, event: skin.event,
        })
      : variant === "predict"
        ? bind("The theoretical probability of {{event}} is 1/{{sides}}. Over {{n}} {{run}}, how many {{event}} should you expect?", {
            event: skin.event, sides: String(sides), n: fmtInt(trials), run: skin.run,
          })
        : variant === "judge"
          ? bind("Theory says {{event}} happens 1 time in {{sides}}, so {{exp}} of {{n}} {{run}}. The log shows {{obs}}. Does that mean {{device}} is faulty?", {
              event: skin.event, sides: String(sides), exp: fmtFraction(expected),
              n: fmtInt(trials), run: skin.run, obs: fmtInt(observed), device: skin.device,
            })
          : bind("No one knows the odds here, so {{n}} {{run}} were logged. Build the model: what is P({{event}})?", {
              n: fmtInt(logTrials), run: skin.run, event: skin.event,
            });

  const prompt = {
    text,
    figure: variant === "predict"
      ? { kind: "simulation" as const, rows: [["THEORY", `1 in ${sides}`], ["TRIALS", fmtInt(trials)]] }
      : { kind: "frequency-table" as const, rows: freqRows },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    {
      text: "Decide which probability is being asked for. Theoretical is what SHOULD happen; experimental is what DID happen.",
      math: variant === "predict" ? "theoretical" : "experimental",
    },
    {
      text: "Theoretical is favourable over total. Experimental is occurrences over trials. Both are a count over a count.",
      math: variant === "predict" ? `1/${sides}` : `${fmtInt(shownHits)}/${fmtInt(shownTrials)}`,
    },
    {
      text: "A prediction is the probability TIMES the number of trials, never the probability on its own.",
      math: `1/${sides} × ${fmtInt(trials)} = ${fmtFraction(expected)}`,
    },
    {
      text: "Expect a gap. A short run wanders away from theory; more trials pull them back together.",
      math: variant === "judge"
        ? (rigged ? "too far out to be chance" : "close enough to be chance")
        : fmtFraction(correct),
    },
  ];

  // --- 4. the judgement variant answers yes or no -----------------------
  if (variant === "judge") {
    const right = rigged ? "YES" : "NO";
    const foil = rigged ? "NO" : "YES";
    const options = ["YES", "NO"];
    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${sides}|${trials}|${observed}`),
      format: "yes-no",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).toUpperCase() === right,
      distractors: [{ tag: "exact-match", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(right),
      worked,
      errorTagsByAnswer: { [foil]: "exact-match" },
      params: { variant, skin: skinKey, sides, trials, observed, rigged: String(rigged) },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const hits = shownHits;
  const runs = shownTrials;
  const candidates: Candidate[] = [
    // trials-as-favorable: flips the ratio, trials over occurrences
    { tag: "trials-as-favorable", value: () => div0(rat(runs), rat(hits)), when: hits > 0 && variant !== "predict" },
    { tag: "trials-as-favorable", value: () => div0(rat(trials), rat(sides * sides)), when: variant === "predict" },
    // prediction-unscaled: reports P instead of P x n
    { tag: "prediction-unscaled", value: theoretical, when: variant === "predict" },
    { tag: "prediction-unscaled", value: rat(hits), when: variant !== "predict" },
    // exact-match: expects the experiment to land exactly on theory
    { tag: "exact-match", value: theoretical, when: variant !== "predict" },
    { tag: "exact-match", value: rat(trials), when: variant === "predict" },
  ];

  const fmt = (v: Answer): string => fmtFraction(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${sides}|${fromLog ? `${logHits}/${logTrials}` : `${observed}/${trials}`}`),
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
    params: { variant, skin: skinKey, sides, trials: shownTrials, observed: shownHits },
  };
}
