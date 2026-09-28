// ns.1.1 — Rational numbers: compare, order, absolute value
// Shape follows content/examples/generators/ns.1.4.ts:
//   1. seed the RNG from (skill, tier, seed)
//   2. pick a variant
//   3. choose the answer first, derive the givens
//   4. build prompt, worked steps, distractors from registry error tags
//   5. hash canonical params

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, fromDecimal, sub, abs, neg, cmp, toNumber, fmtFraction, fmtDecimal, isTerminating, MINUS } from "../../engine/rational";
import { buildChoice, acceptRational, acceptOrder, bind, numberLineSpan, type Candidate } from "../shared";

const SKILL = "ns.1.1";

type Variant =
  | "compare-int"        // which of two integers is greater          (tier 1)
  | "abs-int"            // |n| for an integer                        (tier 1)
  | "compare-mixed"      // a fraction vs a decimal, signs mixed      (tier 2)
  | "abs-rational"       // |x| for a rational                        (tier 2)
  | "order-set"          // order 4-5 mixed rationals                 (tier 3)
  | "distance-context";  // |a - b| between two readings              (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["compare-int", "abs-int"],
  2: ["compare-mixed", "abs-rational"],
  3: ["order-set"],
  4: ["distance-context", "order-set"],
};

const SKINS = {
  altitude: {
    unit: "ft",
    compare: "Two contacts are painted at {{a}} ft and {{b}} ft relative to sea level. Which is higher?",
    abs: "A contact reads {{a}} ft relative to sea level. How far is that from sea level?",
    order: "Sort these altitude readings from lowest to highest: {{list}}.",
    distance: "Bogey at {{a}} ft, you at {{b}} ft. How far apart are you vertically?",
  },
  temperature: {
    unit: "°C",
    compare: "Outside air reads {{a}} °C at one waypoint and {{b}} °C at the next. Which is warmer?",
    abs: "The thermal gauge reads {{a}} °C. How far is that from freezing?",
    order: "Sort these outside-air readings from coldest to warmest: {{list}}.",
    distance: "Ground temp {{a}} °C, outside air {{b}} °C. What is the temperature difference?",
  },
  fuel: {
    unit: "L",
    compare: "Tank A reads {{a}} L against reserve, tank B reads {{b}} L. Which has more fuel?",
    abs: "The fuel computer reads {{a}} L against reserve. How far off reserve is that?",
    order: "Sort these fuel offsets from lowest to highest: {{list}}.",
    distance: "Tank A reads {{a}} L against reserve, tank B reads {{b}} L. How far apart are they?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

/**
 * Draw a fraction with a denominator the registry allows. The numerator is never
 * a multiple of the denominator, so the value stays a genuine fraction — tier 2
 * is "a fraction vs a decimal", and an integer in disguise loses the point.
 */
function drawFraction(rng: () => number, sign: 1 | -1): Rational {
  const d = int(rng, 2, 12);
  let n = int(rng, 1, d * 3);
  if (n % d === 0) n += 1;
  return rat(sign * n, d);
}

/** Draw a decimal with 1-2 places that is not a whole number. */
function drawDecimal(rng: () => number, sign: 1 | -1): Rational {
  const places = int(rng, 1, 2);
  const scale = 10 ** places;
  let units = int(rng, 1, 30 * scale);
  if (units % scale === 0) units += 1;
  return fromDecimal((sign * units) / scale, places);
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "distance-context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the answer first, then the givens ----------------------
  let a: Rational = rat(0);
  let b: Rational = rat(0);
  let set: Rational[] = [];
  // Display mode per slot: a value drawn as a decimal must read as a decimal,
  // and one drawn as a fraction must read as a fraction. The registry's tier 2
  // is explicitly "a fraction vs a decimal", so the form is part of the problem.
  let aDec = false;
  let bDec = false;
  let setDec: boolean[] = [];

  switch (variant) {
    case "compare-int":
    case "abs-int": {
      a = rat(int(rng, -30, 30));
      b = rat(int(rng, -30, 30));
      if (cmp(a, b) === 0) b = rat(toNumber(b) + 1 > 30 ? toNumber(b) - 1 : toNumber(b) + 1);
      break;
    }
    case "compare-mixed":
    case "abs-rational": {
      const fracFirst = rng() < 0.5;
      const signA: 1 | -1 = rng() < 0.5 ? 1 : -1;
      const signB: 1 | -1 = signA === 1 ? -1 : 1; // registry: signs mixed
      const frac = drawFraction(rng, fracFirst ? signA : signB);
      const dec = drawDecimal(rng, fracFirst ? signB : signA);
      a = fracFirst ? frac : dec;
      b = fracFirst ? dec : frac;
      aDec = !fracFirst;
      bDec = fracFirst;
      if (cmp(a, b) === 0) b = sub(b, rat(1, 4));
      break;
    }
    case "order-set": {
      // 4-5 values, at least two negative, one magnitude repeated with both signs.
      const size = int(rng, 4, 5);
      const mirrored = int(rng, 1, 12);
      set = [rat(mirrored), rat(-mirrored)];
      setDec = [false, false];
      while (set.length < size) {
        const sign: 1 | -1 = set.filter((x) => x.n < 0).length < 2 ? -1 : rng() < 0.5 ? 1 : -1;
        const v = rng() < 0.5 ? drawFraction(rng, sign) : rat(sign * int(rng, 1, 20));
        if (!set.some((x) => cmp(x, v) === 0)) { set.push(v); setDec.push(false); }
      }
      const shuffledIdx = shuffle(rng, set.map((_, i) => i));
      set = shuffledIdx.map((i) => set[i]!);
      setDec = shuffledIdx.map((i) => setDec[i]!);
      break;
    }
    case "distance-context": {
      aDec = rng() < 0.5;
      bDec = rng() < 0.5;
      a = aDec ? drawDecimal(rng, rng() < 0.5 ? 1 : -1) : rat(int(rng, -40, 40));
      b = bDec ? drawDecimal(rng, rng() < 0.5 ? 1 : -1) : rat(int(rng, -40, 40));
      if (cmp(a, b) === 0) b = sub(b, rat(5));
      break;
    }
  }

  const isCompare = variant === "compare-int" || variant === "compare-mixed";
  const isAbs = variant === "abs-int" || variant === "abs-rational";
  const isOrder = variant === "order-set";

  const sorted = [...set].sort((x, y) => cmp(x, y));
  const correct: Answer = isOrder ? sorted : isAbs ? abs(a) : isCompare ? (cmp(a, b) > 0 ? a : b) : abs(sub(a, b));

  // --- 2. prompt --------------------------------------------------------
  // Answers inherit the form of the givens: a decimal problem gets a decimal answer.
  const answerAsDecimal = aDec || bDec || setDec.some(Boolean);
  const show = (r: Rational, asDecimal = answerAsDecimal): string =>
    r.d === 1 ? fmtFraction(r) : asDecimal && isTerminating(r) ? fmtDecimal(r) : fmtFraction(r);
  const showAt = (r: Rational, dec: boolean): string => show(r, dec);
  const template = isOrder ? skin.order : isAbs ? skin.abs : isCompare ? skin.compare : skin.distance;
  const values = isOrder ? set : [a, b];

  const prompt = {
    text: bind(template, {
      a: showAt(a, aDec),
      b: showAt(b, bDec),
      list: set.map((v, i) => showAt(v, setDec[i] ?? false)).join(", "),
    }),
    units: skin.unit,
    figure: {
      kind: "number-line" as const,
      ...numberLineSpan(values.map(toNumber)),
      points: values.map(toNumber),
    },
  };

  // --- 3. worked steps: one per numbered step in the manual --------------
  const worked: WorkedStep[] = isOrder
    ? [
        { text: "Put every value on one number line. Negatives sit left of zero.", math: set.map((v, i) => showAt(v, setDec[i] ?? false)).join("   ") },
        { text: "For two negatives, the one with the larger size is farther left, so it is smaller.", math: `${MINUS}8 < ${MINUS}3` },
        { text: "Read the line left to right. That is lowest to highest.", math: sorted.map((v) => show(v, false)).join(" < ") },
      ]
    : isAbs
      ? [
          { text: "Absolute value is the distance from zero on the number line.", math: `|${showAt(a, aDec)}|` },
          { text: "Distance has no direction, so drop the sign.", math: show(abs(a)) },
          { text: "Check: the answer is never negative.", math: `${show(abs(a))} ${skin.unit}` },
        ]
      : isCompare
        ? [
            { text: "Put both values on the number line.", math: `${showAt(a, aDec)}   ${showAt(b, bDec)}` },
            { text: "Farther right is greater. A negative is always less than a positive.", math: `${show(cmp(a, b) > 0 ? b : a)} < ${show(cmp(a, b) > 0 ? a : b)}` },
            { text: "Name the greater value.", math: `${show(cmp(a, b) > 0 ? a : b)} ${skin.unit}` },
          ]
        : [
            { text: "Distance between two readings is the absolute value of their difference.", math: `|${showAt(a, aDec)} − (${showAt(b, bDec)})|` },
            { text: "Subtract.", math: `|${show(sub(a, b))}|` },
            { text: "Take the absolute value. Distance is never negative.", math: `${show(abs(sub(a, b)))} ${skin.unit}` },
          ];

  // --- 4. distractors from registry error tags --------------------------
  //
  // A comparison has exactly two possible answers, so it carries one distractor
  // (the other value) rather than the spec's three: with two options there is no
  // third distinct wrong answer to compute. The tag still records *why* the wrong
  // one gets picked, which is what the engine logs.
  const lesser = cmp(a, b) > 0 ? b : a;
  const isTrueFraction = (r: Rational): boolean => r.d !== 1;
  const comparesByDenominator = isTrueFraction(a) && isTrueFraction(b) && a.d !== b.d;

  const candidates: Candidate[] = isCompare
    ? [
        // frac-size: -1/2 > -1/4 because 2 > 4, i.e. ranks by denominator
        { tag: "frac-size", value: lesser, when: comparesByDenominator },
        // neg-magnitude: treats -8 as greater than -3, i.e. reverses the comparison
        { tag: "neg-magnitude", value: lesser, when: !comparesByDenominator },
      ]
    : isAbs
      ? [
          // abs-negates: thinks |x| flips the sign of every number
          { tag: "abs-negates", value: neg(abs(a)), when: toNumber(a) !== 0 },
        ]
      : [
          { tag: "abs-negates", value: neg(abs(sub(a, b))) },
          // neg-magnitude: subtracts the sizes instead of taking the difference
          { tag: "neg-magnitude", value: sub(abs(a), abs(b)) },
        ];

  const fmtAnswer = (x: Answer): string => (Array.isArray(x) ? x.map((v) => show(v as Rational)).join(", ") : show(x as Rational));
  const choice = isOrder
    ? null
    : buildChoice(rng, correct, candidates, fmtAnswer, isCompare ? 2 : 4);

  const format = isOrder ? "order" : isCompare ? "pick-one:greater" : rng() < 0.4 ? "multiple-choice" : "numeric";

  const params = {
    variant,
    skin: skinKey,
    ...(isOrder ? { set: set.map((r) => `${r.n}/${r.d}`).join(" ") } : { a: `${a.n}/${a.d}`, b: `${b.n}/${b.d}` }),
  };

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${isOrder ? set.map((r) => `${r.n}/${r.d}`).join(",") : `${a.n}/${a.d}|${b.n}/${b.d}`}`),
    format,
    prompt,
    answer: correct,
    accept: isOrder ? acceptOrder(sorted) : acceptRational(correct as Rational),
    ...(choice ? { distractors: choice.distractors, options: choice.options, optionText: choice.optionText, correctIndex: choice.correctIndex } : {}),
    answerText: fmtAnswer(correct),
    worked,
    errorTagsByAnswer: choice?.errorTagsByAnswer ?? {},
    params,
  };
}
