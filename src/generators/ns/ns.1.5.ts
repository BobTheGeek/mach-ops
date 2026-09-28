// ns.1.5 — Subtracting rational numbers
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fromDecimal, sub, neg, abs, toNumber, fmtFraction, fmtDecimal, fmtImproper, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, numberLineSpan, type Candidate } from "../shared";

const SKILL = "ns.1.5";

type Variant =
  | "decimals"          // decimals 1-2 places, one negative                  (tier 1)
  | "like-den-minus-neg"// like denominators, subtract a negative             (tier 2)
  | "unlike-den"        // unlike denominators, mixed numbers, both signs     (tier 3)
  | "distance-vertical";// |a - b| on a vertical number line                  (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["decimals"],
  2: ["like-den-minus-neg", "decimals"],
  3: ["unlike-den", "like-den-minus-neg"],
  4: ["distance-vertical", "unlike-den"],
};

const SKINS = {
  altitude: {
    unit: "KFT",
    plain: "Altitude tape: {{a}} − ({{b}}) = ?",
    distance: "Your target sits at {{a}} KFT and the sub contact at {{b}} KFT. How far apart are they vertically?",
  },
  fuel: {
    unit: "L",
    plain: "Fuel margin: {{a}} − ({{b}}) = ?",
    distance: "Tank A reads {{a}} L against minimum, tank B reads {{b}} L. How far apart are they?",
  },
  thermal: {
    unit: "°C",
    plain: "Thermal readout: {{a}} − ({{b}}) = ?",
    distance: "Skin temp reads {{a}} °C, outside air {{b}} °C. What is the gap?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

const LCM_LIMIT = 60;
function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; }
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

/** A numerator that is never a whole multiple of d, so the value stays a fraction. */
function properNumerator(rng: () => number, d: number, maxWhole: number): number {
  let n = int(rng, 1, d * maxWhole);
  if (n % d === 0) n += 1;
  return n;
}

function drawDenominators(rng: () => number): [number, number] {
  for (let i = 0; i < 40; i++) {
    const d1 = int(rng, 2, 12);
    const d2 = int(rng, 2, 12);
    if (d1 !== d2 && lcm(d1, d2) <= LCM_LIMIT) return [d1, d2];
  }
  return [3, 4];
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "distance-vertical" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose numbers so the answer is clean -------------------------
  let a: Rational;
  let b: Rational;
  let decimalForm: boolean;
  let denominators: [number, number] = [1, 1];

  switch (variant) {
    case "decimals": {
      const places = int(rng, 1, 2);
      const scale = 10 ** places;
      const negFirst = rng() < 0.5; // registry: one negative
      // Not a whole number: tier 1 is explicitly about decimals.
      const units = (): number => {
        let u = int(rng, 1, 25 * scale - 1);
        if (u % scale === 0) u += 1;
        return u;
      };
      a = fromDecimal(((negFirst ? -1 : 1) * units()) / scale, places);
      b = fromDecimal(((negFirst ? 1 : -1) * units()) / scale, places);
      decimalForm = true;
      break;
    }
    case "like-den-minus-neg": {
      const d = int(rng, 3, 12);
      a = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d, 3), d);
      b = rat(-properNumerator(rng, d, 3), d); // subtract a negative
      decimalForm = false;
      denominators = [d, d];
      break;
    }
    case "unlike-den": {
      const [d1, d2] = drawDenominators(rng);
      a = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d1, 5), d1);
      b = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d2, 5), d2);
      decimalForm = false;
      denominators = [d1, d2];
      break;
    }
    case "distance-vertical": {
      const useDecimals = rng() < 0.5;
      if (useDecimals) {
        a = fromDecimal(int(rng, -250, 250) / 10, 1);
        b = fromDecimal(int(rng, -250, 250) / 10, 1);
        decimalForm = true;
      } else {
        const [d1, d2] = drawDenominators(rng);
        a = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d1, 5), d1);
        b = rat((rng() < 0.5 ? 1 : -1) * properNumerator(rng, d2, 5), d2);
        decimalForm = false;
        denominators = [d1, d2];
      }
      if (toNumber(a) === toNumber(b)) b = sub(b, rat(5));
      break;
    }
  }

  const isDistance = variant === "distance-vertical";
  // A zero difference makes the sign rules invisible, so nudge identical draws apart.
  if (!isDistance && toNumber(a) === toNumber(b)) b = sub(b, rat(1, b.d * 2));
  const correct = isDistance ? abs(sub(a, b)) : sub(a, b);

  // --- 2. prompt --------------------------------------------------------
  const show = (r: Rational): string =>
    r.d === 1 ? fmtFraction(r) : decimalForm && isTerminating(r) ? fmtDecimal(r) : fmtFraction(r);

  const prompt = {
    text: bind(isDistance ? skin.distance : skin.plain, { a: show(a), b: show(b) }),
    units: skin.unit,
    figure: {
      kind: (isDistance ? "vertical-number-line" : "number-line") as "vertical-number-line" | "number-line",
      ...numberLineSpan([toNumber(a), toNumber(b)], 2),
      points: [toNumber(a), toNumber(b)],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const common = lcm(denominators[0], denominators[1]);
  const worked: WorkedStep[] = isDistance
    ? [
        { text: "Distance on a number line is the absolute value of the difference.", math: `|${show(a)} − (${show(b)})|` },
        { text: "Rewrite as adding the opposite: keep, change, change.", math: `|${show(a)} + (${show(neg(b))})|` },
        { text: decimalForm ? "Line up the decimal points and add." : `Rewrite over the common denominator ${common}, then add.`, math: `|${fmtImproper(sub(a, b))}|` },
        { text: "Take the absolute value. Distance is never negative.", math: `${show(correct)} ${skin.unit}` },
      ]
    : [
        { text: "Write the subtraction with both signs shown.", math: `${show(a)} − (${show(b)})` },
        { text: "Rewrite as adding the opposite: keep the first, change the sign, flip the second.", math: `${show(a)} + (${show(neg(b))})` },
        { text: decimalForm ? "Line up the decimal points." : `Rewrite both over the common denominator ${common}.`, math: decimalForm ? `${fmtDecimal(a)}   ${fmtDecimal(neg(b))}` : `${a.n * (common / a.d)}/${common}   ${-b.n * (common / b.d)}/${common}` },
        { text: "Add using the sign rules, then simplify.", math: `${show(correct)} ${skin.unit}` },
      ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // double-neg: a - (-b) treated as a - b
    { tag: "double-neg", value: sub(a, abs(b)), when: b.n < 0 },
    { tag: "double-neg", value: sub(abs(a), abs(b)), when: b.n >= 0 },
    // sub-denominators: subtracts denominators as well as numerators
    { tag: "sub-denominators", value: rat(a.n - b.n, a.d - b.d === 0 ? 1 : a.d - b.d), when: !decimalForm && a.d !== b.d },
    // neg-distance: reports a negative distance
    { tag: "neg-distance", value: neg(abs(sub(a, b))), when: isDistance },
    { tag: "neg-distance", value: neg(correct), when: !isDistance && toNumber(correct) !== 0 },
  ];

  const fmtAnswer = (x: Answer): string => show(x as Rational);
  const choice = buildChoice(rng, correct, candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a.n}/${a.d}|${b.n}/${b.d}`),
    format: decimalForm ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: fmtAnswer(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}` },
  };
}
