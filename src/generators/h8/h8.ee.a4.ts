// h8.ee.a4 — Scientific notation: operations and units (HONORS)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { fmtSci, toSci, fromSci, superscript, sciEqual, type SciNotation } from "../../engine/quantity";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.a4";

type Variant =
  | "convert"     // standard <-> scientific                  (tier 1)
  | "multiply"    // multiply or divide in scientific          (tier 2)
  | "add"         // add or subtract, matching exponents first (tier 3)
  | "units";      // choose km or m in a context               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["convert"],
  2: ["multiply", "convert"],
  3: ["add", "multiply"],
  4: ["units", "add"],
};

const SKINS = {
  range: {
    unit: "m",
    convert: "The SR-71 range reads {{value}} m. Write it in scientific notation.",
    multiply: "Range computer: {{a}} × {{b}} m. Give the answer in scientific notation.",
    divide: "Range computer: {{a}} ÷ {{b}}. Give the answer in scientific notation.",
    add: "Two legs measure {{a}} m and {{b}} m. What is the total, in scientific notation?",
    units: "A leg is {{value}} m. Which unit makes that easiest to read?",
  },
  mass: {
    unit: "g",
    convert: "Fuel mass reads {{value}} g. Write it in scientific notation.",
    multiply: "Mass computer: {{a}} × {{b}} g. Give the answer in scientific notation.",
    divide: "Mass computer: {{a}} ÷ {{b}}. Give the answer in scientific notation.",
    add: "Two tanks hold {{a}} g and {{b}} g. What is the total, in scientific notation?",
    units: "A tank holds {{value}} g. Which unit makes that easiest to read?",
  },
  fleet: {
    unit: "CR",
    convert: "The fleet total reads {{value}} CR. Write it in scientific notation.",
    multiply: "Fleet ledger: {{a}} × {{b}} CR. Give the answer in scientific notation.",
    divide: "Fleet ledger: {{a}} ÷ {{b}}. Give the answer in scientific notation.",
    add: "Two squadrons cost {{a}} CR and {{b}} CR. What is the total, in scientific notation?",
    units: "A squadron costs {{value}} CR. Which unit makes that easiest to read?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

const round2 = (x: number): number => Number(x.toFixed(2));

function plain(s: SciNotation): string {
  const v = fromSci(s);
  if (s.exponent >= 0) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v.toFixed(Math.min(12, Math.abs(s.exponent) + 2)).replace(/0+$/, "");
}

/** The metric ladder the units question picks from. */
const UNITS = [
  { name: "MILLI", factor: -3 },
  { name: "BASE", factor: 0 },
  { name: "KILO", factor: 3 },
  { name: "MEGA", factor: 6 },
  { name: "GIGA", factor: 9 },
] as const;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "units" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  /* -------- choose a unit -------------------------------------------- */
  if (variant === "units") {
    const exponent = int(rng, -6, 9);
    const value: SciNotation = { coefficient: round2(int(rng, 100, 999) / 100), exponent };
    // The best unit leaves a number between 1 and 1000.
    const best = [...UNITS].sort((a, b) => Math.abs(exponent - a.factor) - Math.abs(exponent - b.factor))[0]!;
    // GENERATOR_SPEC section 4: the correct position is drawn from the seed.
    const laidUnits = shuffle(rng, [...UNITS]);
    const options = laidUnits.map((u) => `${u.name} (10${superscript(u.factor)} ${skin.unit})`);
    const correctIndex = laidUnits.findIndex((u) => u.name === best.name);

    const worked: WorkedStep[] = [
      { text: "Write the quantity in scientific notation so the exponent is visible.", math: fmtSci(value) },
      { text: "Each step up the metric ladder is three powers of ten.", math: UNITS.map((u) => `10${superscript(u.factor)}`).join("  ") },
      { text: "Find the ladder step closest to the exponent you have.", math: `10${superscript(exponent)} → 10${superscript(best.factor)}` },
      { text: "Pick that unit, so the number reads between 1 and 1000.", math: `${best.name}` },
    ];

    const distractors = options.filter((_, i) => i !== correctIndex).map((value2) => ({ tag: "exponent-sign", value: value2 }));

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${value.coefficient}e${exponent}`),
      format: "multiple-choice",
      prompt: {
        text: bind(skin.units, { value: plain(value) }),
        figure: { kind: "place-value-shift" as const, rows: [[fmtSci(value)], [best.name]] },
      },
      answer: options[correctIndex]!,
      answerText: options[correctIndex]!,
      accept: (input: Answer) => input === options[correctIndex],
      distractors,
      options,
      optionText: options,
      correctIndex,
      worked,
      errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [d.value, d.tag])),
      params: { variant, skin: skinKey, exponent },
    };
  }

  /* -------- convert, multiply, divide, add --------------------------- */
  const divide = variant === "multiply" && rng() < 0.4;
  const a: SciNotation = { coefficient: round2(int(rng, 100, 999) / 100), exponent: int(rng, -6, 9) };
  // Adding needs comparable magnitudes: 9.89 x 10^-2 plus 3.14 x 10^8 rounds
  // straight back to 3.14 x 10^8 at two decimals, which teaches nothing.
  const bExponent = variant === "add" ? a.exponent - int(rng, 0, 2) : int(rng, -6, 9);
  const b: SciNotation = { coefficient: round2(int(rng, 100, 999) / 100), exponent: bExponent };

  let correct: SciNotation;
  let template: string;
  let worked: WorkedStep[];

  if (variant === "convert") {
    correct = a;
    template = skin.convert;
    worked = [
      { text: "Move the decimal point so exactly one non-zero digit sits in front of it.", math: `${a.coefficient}` },
      { text: "Count the places you moved it. Left gives a positive exponent, right a negative one.", math: `10${superscript(a.exponent)}` },
      { text: "Check the coefficient is at least 1 and less than 10.", math: `1 ≤ ${Math.abs(a.coefficient)} < 10` },
      { text: "Write it out.", math: fmtSci(correct) },
    ];
  } else if (variant === "multiply") {
    const raw = divide
      ? { coefficient: a.coefficient / b.coefficient, exponent: a.exponent - b.exponent }
      : { coefficient: a.coefficient * b.coefficient, exponent: a.exponent + b.exponent };
    correct = toSci(fromSci(raw));
    template = divide ? skin.divide : skin.multiply;
    worked = [
      { text: divide ? "Divide the coefficients." : "Multiply the coefficients.", math: `${a.coefficient} ${divide ? "÷" : "×"} ${b.coefficient} = ${round2(raw.coefficient)}` },
      { text: divide ? "Subtract the exponents." : "Add the exponents.", math: `${a.exponent} ${divide ? "−" : "+"} ${b.exponent} = ${raw.exponent}` },
      { text: "If the coefficient has slipped outside 1 to 10, shift the point and fix the exponent.", math: `${round2(raw.coefficient)} × 10${superscript(raw.exponent)}` },
      { text: "Write the answer.", math: fmtSci(correct) },
    ];
  } else {
    // add: the exponents must be matched before anything is added
    const shared = Math.max(a.exponent, b.exponent);
    const sum = fromSci(a) + fromSci(b);
    correct = toSci(sum);
    template = skin.add;
    worked = [
      { text: "You cannot add until both numbers sit on the same power of ten.", math: `${fmtSci(a)} + ${fmtSci(b)}` },
      { text: "Rewrite the smaller one on the larger power of ten.", math: `10${superscript(shared)}` },
      { text: "Now add the coefficients. The exponent does not change.", math: `${round2(fromSci(a) / 10 ** shared)} + ${round2(fromSci(b) / 10 ** shared)}` },
      { text: "Fix the coefficient back into 1 to 10 if it went over.", math: fmtSci(correct) },
    ];
  }

  const answerText = fmtSci(correct);

  const candidates: Candidate[] = [
    // coefficient-out-of-range: writes 12 x 10^5
    { tag: "coefficient-out-of-range", value: `${round2(correct.coefficient * 10)} × 10${superscript(correct.exponent - 1)}` },
    // exponent-sign: reverses the exponent sign for a small number
    { tag: "exponent-sign", value: fmtSci({ coefficient: correct.coefficient, exponent: -correct.exponent }), when: correct.exponent !== 0 },
    // add-exponents-on-add: adds exponents when adding
    { tag: "add-exponents-on-add", value: fmtSci({ coefficient: correct.coefficient, exponent: a.exponent + b.exponent }), when: variant === "add" && a.exponent + b.exponent !== correct.exponent },
  ];
  const choice = buildChoice(rng, answerText, candidates, (x) => String(x));

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${a.coefficient}e${a.exponent}|${b.coefficient}e${b.exponent}|${divide ? "div" : ""}`),
    format: rng() < 0.5 ? "sci-notation" : "multiple-choice",
    prompt: {
      text: bind(template, { value: plain(a), a: variant === "convert" ? plain(a) : fmtSci(a), b: fmtSci(b) }),
      units: skin.unit,
      figure: { kind: "place-value-shift" as const, rows: [[fmtSci(a)], [fmtSci(b)], [answerText]] },
    },
    answer: answerText,
    answerText,
    accept: (input: Answer) => {
      const text = String(input).replace(/\s+/g, "");
      if (text === answerText.replace(/\s+/g, "")) return true;
      // Accept a plain number that is the same value.
      const asNumber = Number(text.replace(/−/g, "-"));
      return Number.isFinite(asNumber) && sciEqual(toSci(asNumber), correct);
    },
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, a: `${a.coefficient}e${a.exponent}`, b: `${b.coefficient}e${b.exponent}` },
  };
}
