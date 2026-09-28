// ns.1.4 — Subtracting integers
// Template generator. Every other generator follows this shape:
//   1. seed the RNG from (skill, tier, seed)
//   2. pick a variant
//   3. choose the answer first, derive the givens
//   4. build prompt, worked steps, distractors from registry error tags
//   5. hash canonical params

import { mulberry32, hash32, sha1 } from "../../engine/rng";
import type { Problem, Tier, Distractor, WorkedStep } from "../../engine/types";

const SKILL = "ns.1.4";

type Variant =
  | "pos-minus-pos"      // a - b, may go negative            (tier 1)
  | "minus-negative"     // a - (-b), a can be negative       (tier 2)
  | "neg-minus-neg"      // (-a) - (-b)                       (tier 3)
  | "change-context"     // final - initial, signed           (tier 4)
  | "distance-context";  // |a - b|                           (tier 4)

const VARIANTS: Record<Tier, Variant[]> = {
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

function pick<T>(rng: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)];
}
function int(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
function fmt(n: number): string {
  return n < 0 ? `−${Math.abs(n).toLocaleString()}` : n.toLocaleString();
}

export function generate(tier: Tier, seed: number, opts: { skin?: keyof typeof SKINS } = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = pick(rng, VARIANTS[tier]);
  const skinKey = opts.skin ?? pick(rng, Object.keys(SKINS) as (keyof typeof SKINS)[]);
  const skin = SKINS[skinKey];

  // --- 1. choose numbers so the answer is clean -------------------------
  let a: number, b: number;
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
    text: template,
    units: skin.unit,
    figure: { kind: "number-line", min: Math.min(a, b, 0) - 5, max: Math.max(a, b, 0) + 5, points: [a, b] },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" ---------
  const worked: WorkedStep[] = isDistance
    ? [
        { text: "Distance on a number line is the absolute value of the difference.", math: `|${fmt(a)} − (${fmt(b)})|` },
        { text: "Subtracting a number is adding its opposite.", math: `|${fmt(a)} + (${fmt(-b)})|` },
        { text: "Add using the integer rules.", math: `|${fmt(a - b)}|` },
        { text: "Distance is never negative.", math: `${fmt(correct)} ${skin.unit}` },
      ]
    : [
        { text: isChange ? "Change is final minus initial." : "Write the subtraction.", math: isChange ? `${fmt(b)} − (${fmt(a)})` : `${fmt(a)} − (${fmt(b)})` },
        { text: "Keep the first number, change − to +, change the second number to its opposite.", math: isChange ? `${fmt(b)} + (${fmt(-a)})` : `${fmt(a)} + (${fmt(-b)})` },
        { text: "Add using the integer rules (same signs: add and keep the sign; different signs: subtract and keep the sign of the larger).", math: `${fmt(correct)}` },
        { text: "Check on the number line: did you move the right direction?", math: `${fmt(correct)} ${skin.unit}` },
      ];

  // --- 4. distractors from registry error tags ---------------------------
  const first = isChange ? b : a;
  const second = isChange ? a : b;
  const candidates: Distractor[] = [
    { tag: "double-neg", value: first - Math.abs(second) },          // 7 − (−3) = 4
    { tag: "negate-first", value: -first - second },                 // negates the wrong number
    { tag: "commute", value: second - first },                       // b − a
    { tag: "initial-minus-final", value: a - b },                    // only differs for change variant
    { tag: "neg-distance", value: -Math.abs(a - b) },                // only for distance variant
  ];
  const distractors: Distractor[] = [];
  for (const c of candidates) {
    if (c.value === correct) continue;
    if (distractors.some((d) => d.value === c.value)) continue;
    if (isDistance && c.tag === "initial-minus-final") continue;
    if (!isDistance && c.tag === "neg-distance") continue;
    distractors.push(c);
    if (distractors.length === 3) break;
  }
  while (distractors.length < 3) {
    const mag = correct === 0 ? 10 : correct * 2;
    if (!distractors.some((d) => d.value === mag) && mag !== correct) distractors.push({ tag: "magnitude", value: mag });
    else distractors.push({ tag: "magnitude", value: correct + 10 });
  }

  const params = { variant, skin: skinKey, a, b };
  const problem: Problem = {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a}|${b}`),
    format: tier >= 3 || rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    accept: (input) => typeof input === "number" && input === correct,
    distractors,
    worked,
    errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [String(d.value), d.tag])),
    params,
  };
  return problem;
}
