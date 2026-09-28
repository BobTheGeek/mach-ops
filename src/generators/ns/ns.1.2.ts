// ns.1.2 — Adding integers
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { buildChoice, acceptRational, bind, numberLineSpan, type Candidate } from "../shared";

const SKILL = "ns.1.2";

type Variant =
  | "same-sign"       // a + b, same sign, |n| <= 20                    (tier 1)
  | "mixed-sign"      // a + b, opposite signs, |n| <= 50               (tier 2)
  | "zero-pair"       // three terms, two of which cancel               (tier 3)
  | "net-change";     // 3-4 signed legs in a story, answer the total   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["same-sign"],
  2: ["mixed-sign", "same-sign"],
  3: ["zero-pair", "mixed-sign"],
  4: ["net-change", "zero-pair"],
};

const SKINS = {
  altitude: {
    unit: "ft",
    plain: "Altitude computer: {{a}} + ({{b}}) = ?",
    three: "Altitude computer: {{list}} = ?",
    story: "You fly {{legs}}. What is your net change in altitude?",
    noun: "climb and descent legs",
  },
  fuel: {
    unit: "L",
    plain: "Fuel computer: {{a}} + ({{b}}) = ?",
    three: "Fuel computer: {{list}} = ?",
    story: "The tanker gives and the engines burn: {{legs}}. What is the net change in fuel?",
    noun: "fuel added and burned",
  },
  credits: {
    unit: "cr",
    plain: "Credit ledger: {{a}} + ({{b}}) = ?",
    three: "Credit ledger: {{list}} = ?",
    story: "This sortie you record {{legs}}. What is your net change in credits?",
    noun: "credits earned and spent",
  },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "net-change" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose numbers so the answer is clean -------------------------
  let terms: number[];

  switch (variant) {
    case "same-sign": {
      const sign = rng() < 0.5 ? 1 : -1;
      terms = [sign * int(rng, 1, 20), sign * int(rng, 1, 20)];
      break;
    }
    case "mixed-sign": {
      const a = int(rng, -50, 50) || 7;
      let b = -Math.sign(a) * int(rng, 1, 50);
      if (Math.abs(b) === Math.abs(a)) b += Math.sign(b) * 3; // registry: |a| != |b|
      terms = [a, b];
      break;
    }
    case "zero-pair": {
      const p = int(rng, 1, 25);
      const extra = int(rng, -30, 30) || 6;
      // Move the cancelling pair around so its position is never the cue.
      const layouts = [[p, -p, extra], [p, extra, -p], [extra, p, -p]] as const;
      terms = [...pick(rng, layouts)];
      break;
    }
    case "net-change": {
      const n = int(rng, 3, 4);
      terms = Array.from({ length: n }, () => int(rng, -40, 40) || 5);
      break;
    }
  }

  const correct = terms.reduce((s, t) => s + t, 0);

  // --- 2. prompt --------------------------------------------------------
  const isStory = variant === "net-change";
  const isThree = terms.length > 2 && !isStory;
  const template = isStory ? skin.story : isThree ? skin.three : skin.plain;

  const legs = terms
    .map((t) => (t >= 0 ? `+${fmtInt(t)} ${skin.unit}` : `${fmtInt(t)} ${skin.unit}`))
    .join(", ");

  const prompt = {
    text: bind(template, {
      a: fmtInt(terms[0]!),
      b: fmtInt(terms[1]!),
      list: terms.map((t) => `(${fmtInt(t)})`).join(" + "),
      legs,
    }),
    units: skin.unit,
    figure: {
      kind: (variant === "zero-pair" ? "zero-pairs" : "number-line") as "zero-pairs" | "number-line",
      ...numberLineSpan([0, ...terms, correct]),
      points: [0, correct],
      labels: terms.map((t) => fmtInt(t)),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const running: number[] = [];
  terms.reduce((s, t) => { const v = s + t; running.push(v); return v; }, 0);

  const worked: WorkedStep[] = [
    { text: "Write the addition with each sign shown.", math: terms.map((t) => `(${fmtInt(t)})`).join(" + ") },
    variant === "zero-pair"
      ? { text: "Look for a number and its opposite. They make a zero pair and cancel.", math: `(${fmtInt(terms.find((t) => terms.includes(-t) && t > 0) ?? 0)}) + (${fmtInt(-(terms.find((t) => terms.includes(-t) && t > 0) ?? 0))}) = 0` }
      : { text: "Same signs: add the sizes and keep the sign. Different signs: subtract the sizes and keep the sign of the bigger one.", math: `|${Math.abs(terms[0]!)}| and |${Math.abs(terms[1]!)}|` },
    { text: "Add left to right, one step at a time.", math: running.map((v) => fmtInt(v)).join(" → ") },
    { text: "Check on the number line: positive moves right, negative moves left.", math: `${fmtInt(correct)} ${skin.unit}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const magSum = terms.reduce((s, t) => s + Math.abs(t), 0);
  const candidates: Candidate[] = [
    // add-magnitudes: adds sizes regardless of sign
    { tag: "add-magnitudes", value: rat(correct < 0 ? -magSum : magSum) },
    { tag: "add-magnitudes", value: rat(-magSum) },
    // first-sign: right size, sign of the first addend
    { tag: "first-sign", value: rat(Math.sign(terms[0]!) * Math.abs(correct)) },
    // drop-sign: the sign fell off
    { tag: "drop-sign", value: rat(Math.abs(correct)) },
  ];

  const fmtAnswer = (x: Answer): string => fmtInt(Math.round(Number((x as { n: number; d: number }).n / (x as { n: number; d: number }).d)));
  const choice = buildChoice(rng, rat(correct), candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${terms.join(",")}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: rat(correct),
    accept: acceptRational(rat(correct)),
    distractors: choice.distractors,
    options: choice.options,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, terms: terms.join(" "), correct },
  };
}
