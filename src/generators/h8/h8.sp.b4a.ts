// h8.sp.b4a — Probability of compound events (Grade 8 honors, attached to Chapter 7)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, sub, mul, add, div0, fmtFraction } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.sp.b4a";

type Variant =
  | "pair"        // P of one named pair                        (tier 1)
  | "both"        // P(A and B) by multiplying                   (tier 2)
  | "at-least"    // P(at least one)                             (tier 3)
  | "three";      // three stages                                (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["pair"],
  2: ["both", "pair"],
  3: ["at-least", "both"],
  4: ["three", "at-least"],
};

/**
 * A stage is a device with equally likely outcomes and a named event that some
 * of them satisfy. The registry caps the combined sample space at 36, which is
 * what keeps a tree drawable and a list writable by hand.
 *
 * The families are templates rather than fixed stages: the number of outcomes
 * and which of them count as a hit are both drawn, so the same two devices can
 * pose many different questions. With a fixed set the whole skill only had
 * twelve cards at tier 1 and the no-repeat guard would empty it in one sortie.
 */
/** Several outcomes in one event need brackets, or "A and B or C" is unreadable. */
const bracket = (c: string[]): string => (c.length === 1 ? c[0]! : `(${c.join(" or ")})`);

interface Family {
  name: string;
  /** every outcome, in order, given a drawn size */
  outcomes: (size: number) => string[];
  /** how many outcomes this device may have */
  sizes: number[];
  /** how the event reads when `k` of the outcomes count */
  event: (chosen: string[]) => string;
}

const FAMILIES: Family[] = [
  {
    name: "RADAR", sizes: [2],
    outcomes: () => ["LOCK", "NO LOCK"],
    event: (c) => bracket(c),
  },
  {
    name: "MISSILE", sizes: [2],
    outcomes: () => ["HIT", "MISS"],
    event: (c) => bracket(c),
  },
  {
    name: "IFF", sizes: [2],
    outcomes: () => ["FRIEND", "FOE"],
    event: (c) => bracket(c),
  },
  {
    name: "WEATHER", sizes: [3, 4],
    outcomes: (size) => ["CLEAR", "CLOUD", "STORM", "ICING"].slice(0, size),
    event: (c) => bracket(c),
  },
  {
    name: "THREAT WHEEL", sizes: [3, 4, 5, 6],
    outcomes: (size) => Array.from({ length: size }, (_, i) => String(i + 1)),
    event: (c) => (c.length === 1 ? `A ${c[0]}` : `(${c.join(" or ")})`),
  },
  {
    name: "LOADOUT", sizes: [2, 3, 4],
    outcomes: (size) => ["AIM-9", "AIM-120", "GBU-12", "GUN"].slice(0, size),
    event: (c) => bracket(c),
  },
];

interface Stage {
  name: string;
  outcomes: string[];
  chosen: string[];
  p: Rational;
  event: string;
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

const RETRY_SALT = 4507;
const MAX_RETRIES = 8;

function build(tier: Tier, seed: number, opts: GenerateOpts, attempt: number): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed + attempt * RETRY_SALT}`));
  const variant = opts.transfer && tier === 4 ? "three" : pick(rng, VARIANTS[tier]);

  // --- 1. build the stages ----------------------------------------------
  const wanted = variant === "three" ? 3 : 2;
  const used: string[] = [];
  const stages: Stage[] = [];
  let guard = 0;
  while (stages.length < wanted && guard++ < 200) {
    const family = pick(rng, FAMILIES);
    if (used.includes(family.name)) continue;
    const size = pick(rng, family.sizes);
    const outcomes = family.outcomes(size);
    // At least one outcome counts and at least one does not, or the stage is
    // certain or impossible and contributes nothing to the question.
    const take = int(rng, 1, size - 1);
    // Rotated rather than taken from the front, so the same device can ask about
    // different outcomes and the space is wider than one subset per size.
    const from = int(rng, 0, size - 1);
    const chosen = Array.from({ length: take }, (_, i) => outcomes[(from + i) % size]!);
    // Three stages of six outcomes each is 216 leaves; the registry caps the
    // sample space at 36, so the running product is checked before committing.
    const sizeSoFar = stages.reduce((a, st) => a * st.outcomes.length, 1) * size;
    const roomLeft = wanted - stages.length - 1;
    if (sizeSoFar * 2 ** roomLeft > 36) continue;
    used.push(family.name);
    stages.push({
      name: family.name, outcomes, chosen,
      p: div0(rat(take), rat(size)),
      event: family.event(chosen),
    });
  }
  if (stages.length < wanted) {
    if (attempt < MAX_RETRIES) return build(tier, seed, opts, attempt + 1);
    while (stages.length < wanted) {
      stages.push({ name: "COIN", outcomes: ["H", "T"], chosen: ["H"], p: rat(1, 2), event: "H" });
    }
  }

  const sizes = stages.map((st) => st.outcomes.length);
  const total = sizes.reduce((a, b) => a * b, 1);

  const ps = stages.map((st) => st.p);
  const pAll = ps.reduce<Rational>((acc, p) => mul(acc, p), rat(1));
  // P(at least one) is 1 minus P(none of them).
  const pNone = stages.reduce<Rational>((acc, st) => mul(acc, sub(rat(1), st.p)), rat(1));
  const pAtLeastOne = sub(rat(1), pNone);

  const correct: Rational = variant === "at-least" ? pAtLeastOne : pAll;

  const names = stages.map((st) => st.event).join(" and ");
  const listed = stages.map((st) => `${st.name} (${st.outcomes.join(", ")})`).join("; ");

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "pair"
      ? bind("Two things happen on this sortie: {{listed}}. Every outcome is equally likely. What is P({{names}})?", { listed, names })
      : variant === "both"
        ? bind("{{listed}}. The two are independent. What is P({{names}}) — both of them?", { listed, names })
        : variant === "at-least"
          ? bind("{{listed}}. You want {{names}}. What is the probability that AT LEAST ONE of those happens?", { listed, names })
          : bind("Three stages this time: {{listed}}. What is P({{names}}) — all three?", { listed, names });

  const prompt = {
    text,
    figure: {
      kind: "tree-diagram" as const,
      stages: stages.map((st) => [...st.outcomes]),
      labels: stages.map((st) => st.name),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Count the outcomes of each stage on its own. The tree grows one column per stage.", math: sizes.join(" and ") },
    { text: "MULTIPLY the counts to size the whole sample space. Adding them counts the branches of one column, not the leaves of the tree.", math: `${sizes.join(" × ")} = ${total}` },
    { text: "For independent stages, P(all of them) is the probabilities MULTIPLIED. Adding probabilities would push the answer above 1.", math: `${ps.map(fmtFraction).join(" × ")} = ${fmtFraction(pAll)}` },
    { text: "For 'at least one', work out P(none of them) and take it from 1. Listing the ways to get at least one is slower and easier to get wrong.", math: `1 − ${fmtFraction(pNone)} = ${fmtFraction(pAtLeastOne)}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const pSum = ps.reduce<Rational>((acc, p) => add(acc, p), rat(0));
  const candidates: Candidate[] = [
    // add-not-multiply: P(A and B) taken as P(A) + P(B)
    { tag: "add-not-multiply", value: pSum },
    // count-stages: the sample space sized by adding the stages, so 1 over that
    { tag: "count-stages", value: div0(rat(1), rat(sizes.reduce((a, b) => a + b, 0))) },
    { tag: "add-not-multiply", value: variant === "at-least" ? pAll : pAtLeastOne },
    { tag: "count-stages", value: ps[0]! },
  ];

  const fmt = (v: Answer): string => fmtFraction(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${stages.map((st) => `${st.name}:${st.outcomes.join("/")}:${st.chosen.join("/")}`).join("|")}`),
    format: rng() < 0.5 ? "fraction" : "multiple-choice",
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
    params: { variant, stages: stages.map((st) => st.name).join(","), total },
  };
}
