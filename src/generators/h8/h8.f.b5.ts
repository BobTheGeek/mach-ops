// h8.f.b5 — Qualitative graphs (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "h8.f.b5";

type Variant =
  | "match"     // which graph tells this story              (tier 1)
  | "describe"  // what is happening in this stretch          (tier 2)
  | "sketch"    // pick the sketch of a described sortie       (tier 3)
  | "compare";  // two stories, one graph each                 (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["match"],
  2: ["describe", "match"],
  3: ["sketch", "describe"],
  4: ["compare", "sketch"],
};

/** A leg of a sortie: what the altitude does, and what it looks like. */
const LEGS = {
  climb: { story: "climbs away", shape: "RISING", dir: 1 },
  cruise: { story: "holds its altitude", shape: "FLAT", dir: 0 },
  descend: { story: "comes down", shape: "FALLING", dir: -1 },
  fast: { story: "climbs hard", shape: "RISING STEEPLY", dir: 2 },
  slow: { story: "eases down gently", shape: "FALLING GENTLY", dir: -1 },
} as const;

type LegKey = keyof typeof LEGS;
const KEYS = Object.keys(LEGS) as LegKey[];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "compare" : pick(rng, VARIANTS[tier]);

  // --- 1. build a sortie out of three legs -------------------------------
  const legs: LegKey[] = [];
  while (legs.length < 3) {
    const k = pick(rng, KEYS);
    if (legs[legs.length - 1] !== k) legs.push(k);
  }
  const story = legs.map((k) => LEGS[k].story).join(", then ");
  const shape = legs.map((k) => LEGS[k].shape).join(" → ");

  // A second sortie for the comparison tier.
  const other: LegKey[] = [];
  while (other.length < 3) {
    const k = pick(rng, KEYS);
    if (other[other.length - 1] !== k) other.push(k);
  }
  const otherShape = other.map((k) => LEGS[k].shape).join(" → ");

  // Which stretch the describe variant asks about.
  const at = int(rng, 0, 2);

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "match"
      ? bind("On this sortie the aircraft {{story}}. Which shape does its ALTITUDE-AGAINST-TIME graph have?", { story })
      : variant === "describe"
        ? bind("The altitude graph goes {{shape}}. What is the aircraft doing in the {{nth}} stretch?", {
            shape, nth: ["FIRST", "SECOND", "THIRD"][at]!,
          })
        : variant === "sketch"
          ? bind("Sketch the sortie: the aircraft {{story}}. Which sketch is it?", { story })
          : bind("One aircraft {{story}}. Another gives a graph that goes {{other}}. Which description belongs to the SECOND one?", {
              story, other: otherShape,
            });

  const prompt = {
    text,
    figure: {
      kind: "coordinate-plane-sketch" as const,
      labels: ["TIME", "ALTITUDE"],
      series: [legs.map((k, i) => [i * 3, 5 + LEGS[k].dir * (i + 1) * 2])],
      max: 9,
      maxY: 14,
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Read the graph left to right as a story in time. Going up means increasing, going down means decreasing.", math: shape },
    { text: "FLAT does not mean stopped. On an altitude graph a flat stretch is level flight, still moving forwards.", math: "flat = holding altitude" },
    { text: "Steeper means faster, not higher. Two rising stretches at different angles are two different rates of climb.", math: "steeper = quicker change" },
    { text: "The graph is not a picture of the flight path. A graph of speed against time that rises is not an aircraft climbing.", math: story },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${legs.join(",")}|${other.join(",")}|${at}`);

  // --- 4. the answer is a description or a shape ------------------------
  const right = variant === "describe"
    ? LEGS[legs[at]!].story.toUpperCase()
    : variant === "compare"
      ? other.map((k) => LEGS[k].story).join(", then ").toUpperCase()
      : shape;

  const wrongShape = shuffle(rng, KEYS.filter((k) => k !== legs[0])).slice(0, 3);
  const candidates: Candidate[] = variant === "describe"
    ? [
        // flat-means-stopped: a level stretch read as the aircraft stopping
        { tag: "flat-means-stopped", value: "STOPPED IN MID-AIR" },
        { tag: "graph-as-picture", value: LEGS[legs[(at + 1) % 3]!].story.toUpperCase() },
        { tag: "flat-means-stopped", value: LEGS[legs[(at + 2) % 3]!].story.toUpperCase() },
      ]
    : variant === "compare"
      ? [
          { tag: "graph-as-picture", value: story.toUpperCase() },
          { tag: "flat-means-stopped", value: other.map((k) => LEGS[k].story).reverse().join(", then ").toUpperCase() },
          { tag: "graph-as-picture", value: wrongShape.map((k) => LEGS[k].story).join(", then ").toUpperCase() },
        ]
      : [
          // graph-as-picture: the graph read as a drawing of the flight path
          { tag: "graph-as-picture", value: legs.map((k) => LEGS[k].shape).reverse().join(" → ") },
          { tag: "flat-means-stopped", value: wrongShape.map((k) => LEGS[k].shape).join(" → ") },
          { tag: "graph-as-picture", value: otherShape },
        ];

  const choice = buildChoice(rng, right, candidates, (v: Answer) => String(v));

  return {
    skill: SKILL, tier, seed, hash,
    format: variant === "sketch" ? "graph-select" : "multiple-choice",
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
    params: { variant, legs: legs.join(","), at },
  };
}
