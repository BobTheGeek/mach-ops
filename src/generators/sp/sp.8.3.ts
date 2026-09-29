// sp.8.3 — Comparing populations
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, sub, add, mul, div0, cmp, fmtInt, fmtDecimal, fmtFraction, isTerminating } from "../../engine/rational";
import { mean, mad, sortAsc } from "../../engine/stats";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "sp.8.3";

type Variant =
  | "higher"    // which group sits higher                     (tier 1)
  | "in-mads"   // the gap measured in MADs                     (tier 2)
  | "overlap"   // same spread, different centres: how big      (tier 3)
  | "statement";// centre AND spread in one judgement           (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["higher"],
  2: ["in-mads", "higher"],
  3: ["overlap", "in-mads"],
  4: ["statement", "overlap"],
};

const SKINS = {
  sortie: { noun: "sortie times", unit: "minutes", a: "EAGLE", b: "FALCON" },
  lock: { noun: "lock times", unit: "seconds", a: "ALPHA", b: "BRAVO" },
  fuel: { noun: "fuel burn", unit: "litres", a: "EAGLE", b: "FALCON" },
} as const;

type SkinKey = keyof typeof SKINS;

/** The registry's separations: the gap between the centres, counted in MADs. */
const SEPARATIONS = [rat(1, 2), rat(1), rat(2), rat(3)] as const;

const show = (r: Rational): string =>
  (r.d === 1 ? fmtInt(r.n) : isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));
const list = (vs: readonly Rational[]): string => vs.map(show).join(", ");
const nums = (vs: readonly Rational[]): number[] => vs.map((v) => v.n / v.d);

/**
 * A set with a whole mean and a whole MAD.
 *
 * The registry asks for the difference in centres to come out at a half, one,
 * two or three MADs exactly. That only works if the MAD is a number you can
 * divide by, so the deviations are drawn until they cancel and their sizes
 * total a multiple of the count.
 */
function setWithMad(rng: () => number, centre: number, targetMad: number, count: number): Rational[] | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const devs: number[] = [];
    for (let i = 0; i < count - 1; i++) devs.push(int(rng, -2 * targetMad, 2 * targetMad));
    devs.push(-devs.reduce((a, b) => a + b, 0));
    const spread = devs.reduce((a, b) => a + Math.abs(b), 0);
    const values = devs.map((d) => centre + d);
    if (spread !== targetMad * count) continue;
    if (devs.some((d) => Math.abs(d) > 2 * targetMad)) continue;
    if (values.some((v) => v < 4 || v > 200)) continue;
    return sortAsc(values.map((v) => rat(v)));
  }
  return null;
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

const RETRY_SALT = 5281;
const MAX_RETRIES = 8;

function build(tier: Tier, seed: number, opts: GenerateOpts, attempt: number): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed + attempt * RETRY_SALT}`));
  const variant = opts.transfer && tier === 4 ? "statement" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. two groups a known number of MADs apart ------------------------
  const count = int(rng, 4, 6) * 2;            // registry: 8-12 values each
  const targetMad = int(rng, 1, 3) * 2;        // even, so half a MAD is whole too
  const separation = pick(rng, [...SEPARATIONS]);
  const gap = Math.round(targetMad * (separation.n / separation.d));

  const centreA = int(rng, 40, 90);
  const centreB = rng() < 0.5 ? centreA + gap : centreA - gap;

  const setA = setWithMad(rng, centreA, targetMad, count);
  const setB = setWithMad(rng, centreB, targetMad, count);
  // A set the search could not build would have the wrong MAD and the ratio
  // would be a lie, so the card is re-seeded rather than shipped.
  if (!setA || !setB) {
    if (attempt < MAX_RETRIES) return build(tier, seed, opts, attempt + 1);
    // The search has never failed this many times in a row in testing; if it
    // ever does, a plain pair of sets is better than no card at all.
    return build(tier, seed + 1, opts, 0);
  }

  const meanA = mean(setA);
  const meanB = mean(setB);
  const madA = mad(setA);
  const difference = cmp(meanA, meanB) >= 0 ? sub(meanA, meanB) : sub(meanB, meanA);
  const inMads = div0(difference, madA);
  const higher = cmp(meanA, meanB) > 0 ? skin.a : skin.b;

  // The registry's own reading: two or more MADs apart is a real difference.
  const meaningful = cmp(inMads, rat(2)) >= 0;

  const correct: Rational = variant === "in-mads" ? inMads : difference;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "higher"
      ? bind("{{a}} logged {{la}}. {{b}} logged {{lb}}. Both {{noun}} in {{unit}}. Which squadron has the higher MEAN?", {
          a: skin.a, la: list(shuffle(rng, [...setA])), b: skin.b, lb: list(shuffle(rng, [...setB])),
          noun: skin.noun, unit: skin.unit,
        })
      : variant === "in-mads"
        ? bind("{{a}} averages {{ma}} {{unit}} and {{b}} averages {{mb}}. Both have a MAD of {{mad}}. How many MADs apart are the two means?", {
            a: skin.a, ma: show(meanA), unit: skin.unit, b: skin.b, mb: show(meanB), mad: show(madA),
          })
        : variant === "overlap"
          ? bind("{{a}} logged {{la}}. {{b}} logged {{lb}}. Both in {{unit}}. How far apart are the two MEANS?", {
              a: skin.a, la: list(setA), b: skin.b, lb: list(setB), unit: skin.unit,
            })
          : bind("{{a}} averages {{ma}} {{unit}} and {{b}} averages {{mb}}, and both spread by a MAD of {{mad}}. Which statement fits the data?", {
              a: skin.a, ma: show(meanA), unit: skin.unit, b: skin.b, mb: show(meanB), mad: show(madA),
            });

  const prompt = {
    text,
    units: variant === "in-mads" ? "MADs" : skin.unit,
    figure: {
      kind: "parallel-dot-plots" as const,
      rows: [nums(setA), nums(setB)],
      labels: [skin.a, skin.b],
      min: 0,
      max: Math.ceil(Math.max(...nums(setA), ...nums(setB)) / 10) * 10 + 10,
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the centre of each group. Comparing two groups starts with one number for each.", math: `${skin.a} ${show(meanA)}   ${skin.b} ${show(meanB)}` },
    { text: "Subtract to get the gap between the centres. Say which way round it goes.", math: `${show(difference)} ${skin.unit}, ${higher} higher` },
    { text: "Find the spread. The MAD says how far a typical value sits from its own centre.", math: `MAD ${show(madA)}` },
    { text: "Divide the gap by the MAD. That is how big the difference really is: two MADs or more is a difference worth reporting.", math: `${show(difference)} ÷ ${show(madA)} = ${show(inMads)} MADs — ${meaningful ? "a real difference" : "too small to call"}` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${setA.map((v) => v.n).join(",")}|${setB.map((v) => v.n).join(",")}`);

  // --- 4. which group sits higher ---------------------------------------
  if (variant === "higher") {
    const foil = higher === skin.a ? skin.b : skin.a;
    const options = [skin.a, skin.b];
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: higher,
      answerText: higher,
      accept: (input: Answer) => String(input).toUpperCase() === higher,
      distractors: [{ tag: "ignore-spread", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(higher),
      worked,
      errorTagsByAnswer: { [foil]: "ignore-spread" },
      params: { variant, skin: skinKey, mad: madA.n, separation: `${separation.n}/${separation.d}` },
    };
  }

  // --- 5. the comparison statement, which must carry centre AND spread ---
  if (variant === "statement") {
    const lower = higher === skin.a ? skin.b : skin.a;
    const verdict = meaningful ? "A REAL DIFFERENCE" : "TOO SMALL TO CALL";
    const wrongVerdict = meaningful ? "TOO SMALL TO CALL" : "A REAL DIFFERENCE";
    const right = `${higher} IS ${show(inMads)} MADS HIGHER THAN ${lower} — ${verdict}`;
    // Every option ends in a verdict, so the longest sentence is not the answer
    // and the choice has to be made on the arithmetic.
    const candidates: Candidate[] = [
      // ignore-spread: the right gap read against the wrong yardstick
      { tag: "ignore-spread", value: `${higher} IS ${show(inMads)} MADS HIGHER THAN ${lower} — ${wrongVerdict}` },
      // mad-as-difference: quotes the spread where the gap belongs
      { tag: "mad-as-difference", value: `${higher} IS ${show(madA)} MADS HIGHER THAN ${lower} — ${verdict}` },
      // ignore-spread: a verdict with no mention of how spread out the data is
      { tag: "ignore-spread", value: `${higher} IS HIGHER THAN ${lower} — THE MEANS DIFFER` },
      { tag: "mad-as-difference", value: `${higher} IS ${show(difference)} MADS HIGHER THAN ${lower} — ${verdict}` },
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
      params: { variant, skin: skinKey, mad: madA.n, separation: `${separation.n}/${separation.d}` },
    };
  }

  // --- 6. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // mad-as-difference: reports the spread where the gap was asked for
    { tag: "mad-as-difference", value: madA },
    // ignore-spread: gives the raw gap when the question asked in MADs, and the
    // other way round when it asked in the units themselves
    { tag: "ignore-spread", value: variant === "in-mads" ? difference : inMads },
    { tag: "mad-as-difference", value: add(difference, madA) },
    { tag: "ignore-spread", value: mul(difference, madA) },
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
    params: { variant, skin: skinKey, mad: madA.n, separation: `${separation.n}/${separation.d}` },
  };
}
