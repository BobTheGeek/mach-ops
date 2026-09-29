// rp.5.5 — Graphs of proportional relationships
// Shape follows content/examples/generators/ns.1.4.ts.
//
// The figure carries the graph; the answer is read off it. A full drag-a-point
// input is Math Kit work, so these use the reading and choosing formats the
// registry also lists.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, toNumber, fmtFraction } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.5.5";

type Variant =
  | "which-graph"  // which graph is proportional            (tier 1)
  | "read-k"       // read k from a graph                    (tier 2)
  | "write"        // write y = kx from a graph              (tier 3)
  | "meaning";     // what does the point (x, y) mean        (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["which-graph"],
  2: ["read-k", "which-graph"],
  3: ["write", "read-k"],
  4: ["meaning", "write"],
};

/**
 * The registry lists eight k values, which is only a few dozen distinct problems
 * once the variants are counted — not enough for the no-repeat guard. The list is
 * generated instead: halves, thirds and quarters up to 6, all of which still draw
 * cleanly on a 0..10 grid.
 */
const K_VALUES: [number, number][] = [
  ...Array.from({ length: 12 }, (_, i) => [i + 1, 2] as [number, number]),
  ...Array.from({ length: 8 }, (_, i) => [i + 1, 4] as [number, number]),
  ...Array.from({ length: 6 }, (_, i) => [i + 1, 3] as [number, number]),
];

const SKINS = {
  fuel: { x: "DISTANCE (NM)", y: "FUEL (L)", per: "litres of fuel per nautical mile" },
  climb: { x: "MINUTES", y: "ALTITUDE (KFT)", per: "thousand feet per minute" },
  credits: { x: "MISSIONS", y: "CREDITS", per: "credits per mission" },
} as const;

type SkinKey = keyof typeof SKINS;

/** y = kx written properly: a coefficient of 1 disappears. */
function equationOf(k: Rational): string {
  const c = fmtFraction(k);
  return c === "1" ? "y = x" : `y = ${c}x`;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "meaning" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  const kf = pick(rng, K_VALUES);
  const k = rat(kf[0], kf[1]);
  // Which point the card talks about also varies, so the same k is not the same card.
  const readAt = int(rng, 2, 8);
  const maxX = 10;
  const maxY = Math.max(4, Math.ceil(toNumber(k) * maxX));

  // A proportional line, and a foil with a non-zero intercept.
  const line = [0, maxX].map((x) => [x, toNumber(mul(k, rat(x)))]);
  const intercept = int(rng, 1, 3);
  const foil = [0, maxX].map((x) => [x, intercept + toNumber(mul(k, rat(x)))]);

  const prompt = {
    text: variant === "which-graph"
      ? "Which line shows a proportional relationship?"
      : variant === "read-k"
        // The graph carries the point; saying it in words would be the answer.
        ? "Read the constant of proportionality from the graph."
        : variant === "write"
          ? "Write the equation of this line."
          : bind("The line passes through ({{x}}, {{y}}). What does that point mean?", {
              x: String(readAt), y: fmtFraction(mul(k, rat(readAt))),
            }),
    figure: {
      kind: "coordinate-plane" as const,
      max: maxX,
      maxY,
      // read-k needs the (1, k) point marked, or there is nothing to read.
      series: variant === "which-graph" ? [line, foil] : [line, [[1, toNumber(k)]]],
      labels: [skin.x, skin.y],
    },
  };

  const worked: WorkedStep[] = [
    { text: "A proportional graph is a straight line that goes through the origin, (0, 0).", math: "(0, 0)" },
    { text: "Find the point where x is 1. Its y value is k, the constant of proportionality.", math: `(1, ${fmtFraction(k)})` },
    { text: "The equation is y = kx. Nothing is added, because adding would lift the line off the origin.", math: `y = ${fmtFraction(k)}x` },
    { text: "A point (x, y) reads as: x of the bottom quantity gives y of the side quantity.", math: `${readAt} → ${fmtFraction(mul(k, rat(readAt)))}` },
  ];

  /* -------- which graph: pick the line through the origin ------------ */
  if (variant === "which-graph") {
    const options = ["THE LINE THROUGH (0, 0)", `THE LINE THROUGH (0, ${intercept})`];
    const correctIndex = 0;
    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${intercept}|${readAt}`),
      format: "graph-select",
      prompt,
      answer: options[0]!,
      answerText: options[0]!,
      accept: (input: Answer) => input === options[0],
      distractors: [{ tag: "any-line", value: options[1]! }],
      options,
      optionText: options,
      correctIndex,
      worked,
      errorTagsByAnswer: { [options[1]!]: "any-line" },
      params: { variant, skin: skinKey, k: `${k.n}/${k.d}`, intercept },
    };
  }

  /* -------- write the equation -------------------------------------- */
  if (variant === "write") {
    const right = equationOf(k);
    // De-duplicate: when k is 1 the "reads k backwards" foil is the right answer.
    const wrong = [...new Set([
      `${equationOf(k)} + ${intercept}`,
      equationOf(div0(rat(1), k)),
      `y = x + ${fmtFraction(k)}`,
    ])].filter((w) => w !== right);
    const laid = shuffle(rng, [right, ...wrong]);
    const correctIndex = laid.indexOf(right);
    const tags = ["any-line", "k-as-x-over-y", "point-meaning"];
    const distractors = laid.filter((_, i) => i !== correctIndex).map((value, i) => ({ tag: tags[i % tags.length]!, value }));

    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${intercept}|${readAt}`),
      format: rng() < 0.5 ? "multiple-choice" : "expression",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).replace(/\s+/g, "") === right.replace(/\s+/g, ""),
      distractors,
      options: laid,
      optionText: laid,
      correctIndex,
      worked,
      errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [d.value, d.tag])),
      params: { variant, skin: skinKey, k: `${k.n}/${k.d}` },
    };
  }

  /* -------- what the point means ------------------------------------ */
  if (variant === "meaning") {
    const y = mul(k, rat(readAt));
    const right = `${readAt} ${skin.x.split(" ")[0]!.toLowerCase()} gives ${fmtFraction(y)} ${skin.y.split(" ")[0]!.toLowerCase()}`;
    const swapped = `${fmtFraction(y)} ${skin.x.split(" ")[0]!.toLowerCase()} gives ${readAt} ${skin.y.split(" ")[0]!.toLowerCase()}`;
    const options = shuffle(rng, [right, swapped]);
    const correctIndex = options.indexOf(right);

    return {
      skill: SKILL, tier, seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${readAt}`),
      format: "pick-one:meaning",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => input === right,
      distractors: [{ tag: "point-meaning", value: swapped }],
      options,
      optionText: options,
      correctIndex,
      worked,
      errorTagsByAnswer: { [swapped]: "point-meaning" },
      params: { variant, skin: skinKey, k: `${k.n}/${k.d}` },
    };
  }

  /* -------- read k --------------------------------------------------- */
  const candidates: Candidate[] = [
    { tag: "k-as-x-over-y", value: () => div0(rat(1), k), when: k.n !== 0 },
    { tag: "any-line", value: mul(k, rat(2)) },
    { tag: "point-meaning", value: mul(k, rat(readAt)) },
  ];
  const fmt = (v: Answer): string => fmtFraction(v as Rational);
  const choice = buildChoice(rng, k, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|read-k|${k.n}/${k.d}|${readAt}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: k,
    answerText: fmtFraction(k),
    accept: acceptRational(k),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant: "read-k", skin: skinKey, k: `${k.n}/${k.d}` },
  };
}
