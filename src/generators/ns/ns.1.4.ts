// ns.1.4 — Subtracting integers
// Template generator. Every other generator follows this shape:
//   1. seed the RNG from (skill, tier, seed)
//   2. pick a variant
//   3. choose the answer first, derive the givens
//   4. build prompt, worked steps, distractors from registry error tags
//   5. hash canonical params

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { buildChoice, acceptRational, bind, numberLineSpan, type Candidate } from "../shared";

const SKILL = "ns.1.4";

type Variant =
  | "pos-minus-pos"      // a - b, may go negative            (tier 1)
  | "minus-negative"     // a - (-b), a can be negative       (tier 2)
  | "neg-minus-neg"      // (-a) - (-b)                       (tier 3)
  | "change-context"     // final - initial, signed           (tier 4)
  | "distance-context";  // |a - b|                           (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["pos-minus-pos"],
  2: ["minus-negative", "pos-minus-pos"],
  3: ["neg-minus-neg", "minus-negative"],
  4: ["change-context", "distance-context", "neg-minus-neg"],
};

// Skins are wrappers only: numbers are chosen first, skins bind them into text.
const SKINS = {
  altitude: {
    unit: "ft",
    change: "You were at {{a}} ft. You are now at {{b}} ft. What was your change in altitude?",
    distance: "Bogey at {{a}} ft, you at {{b}} ft. How far apart are you vertically?",
    plain: "Altitude readout: {{a}} − ({{b}}) = ?",
  },
  temperature: {
    unit: "°C",
    change: "Cockpit temp read {{a}} °C at takeoff and {{b}} °C at altitude. What was the change?",
    distance: "Ground temp {{a}} °C, outside air {{b}} °C. What is the temperature difference?",
    plain: "Thermal readout: {{a}} − ({{b}}) = ?",
  },
  fuel: {
    unit: "L",
    change: "Fuel margin was {{a}} L below reserve, now {{b}} L. What is the change?",
    distance: "Tank A reads {{a}} L relative to reserve, tank B reads {{b}} L. How far apart are they?",
    plain: "Fuel computer: {{a}} − ({{b}}) = ?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "change-context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose numbers so the answer is clean -------------------------
  let a: number;
  let b: number;
  switch (variant) {
    case "pos-minus-pos":
      a = int(rng, 0, 30); b = int(rng, 1, 40); break;                 // answer may be negative
    case "minus-negative":
      a = int(rng, -20, 20); b = int(rng, -20, -1); break;             // a - (-|b|)
    case "neg-minus-neg":
      a = int(rng, -50, -1); b = int(rng, -50, -1); if (a === b) b -= 1; break;
    case "change-context":
    case "distance-context":
      a = int(rng, -40, 40); b = int(rng, -40, 40); if (a === b) b += 5; break;
  }

  // For context variants a = initial, b = final.
  const isChange = variant === "change-context";
  const isDistance = variant === "distance-context";
  const correct = isChange ? b - a : isDistance ? Math.abs(a - b) : a - b;

  // --- 2. prompt --------------------------------------------------------
  const template = isChange ? skin.change : isDistance ? skin.distance : skin.plain;
  const prompt = {
    text: bind(template, { a: fmtInt(a), b: fmtInt(b) }),
    units: skin.unit,
    figure: { kind: "number-line" as const, ...numberLineSpan([a, b]), points: [a, b] },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" ---------
  const worked: WorkedStep[] = isDistance
    ? [
        { text: "Distance on a number line is the absolute value of the difference.", math: `|${fmtInt(a)} − (${fmtInt(b)})|` },
        { text: "Subtracting a number is adding its opposite.", math: `|${fmtInt(a)} + (${fmtInt(-b)})|` },
        { text: "Add using the integer rules.", math: `|${fmtInt(a - b)}|` },
        { text: "Distance is never negative.", math: `${fmtInt(correct)} ${skin.unit}` },
      ]
    : [
        { text: isChange ? "Change is final minus initial." : "Write the subtraction.", math: isChange ? `${fmtInt(b)} − (${fmtInt(a)})` : `${fmtInt(a)} − (${fmtInt(b)})` },
        { text: "Keep the first number, change − to +, change the second number to its opposite.", math: isChange ? `${fmtInt(b)} + (${fmtInt(-a)})` : `${fmtInt(a)} + (${fmtInt(-b)})` },
        { text: "Add using the integer rules (same signs: add and keep the sign; different signs: subtract and keep the sign of the larger).", math: `${fmtInt(correct)}` },
        { text: "Check on the number line: did you move the right direction?", math: `${fmtInt(correct)} ${skin.unit}` },
      ];

  // --- 4. distractors from registry error tags ---------------------------
  const first = isChange ? b : a;
  const second = isChange ? a : b;
  const candidates: Candidate[] = [
    { tag: "double-neg", value: rat(first - Math.abs(second)) },          // 7 − (−3) = 4
    { tag: "negate-first", value: rat(-first - second) },                 // negates the wrong number
    { tag: "commute", value: rat(second - first) },                       // b − a
    { tag: "initial-minus-final", value: rat(a - b), when: isChange },    // change computed backwards
    { tag: "neg-distance", value: rat(-Math.abs(a - b)), when: isDistance },
  ];

  const fmtAnswer = (x: Answer): string => fmtInt(Math.round(Number((x as { n: number; d: number }).n / (x as { n: number; d: number }).d)));
  const choice = buildChoice(rng, rat(correct), candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a}|${b}`),
    format: tier >= 3 || rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: rat(correct),
    accept: acceptRational(rat(correct)),
    distractors: choice.distractors,
    options: choice.options,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, a, b },
  };
}
