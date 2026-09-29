// h8.ee.a3 — Estimate with a single digit times a power of 10 (HONORS)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtFraction } from "../../engine/rational";
import { fmtSci, superscript, type SciNotation } from "../../engine/quantity";
import { buildChoice, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.a3";

type Variant =
  | "big"        // 4,200,000 as 4 x 10^6                   (tier 1)
  | "tiny"       // small numbers, negative exponents        (tier 2)
  | "how-many"   // how many times larger is A than B        (tier 3)
  | "order";     // order several mixed quantities           (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["big"],
  2: ["tiny", "big"],
  3: ["how-many", "tiny"],
  4: ["order", "how-many"],
};

const SKINS = {
  range: {
    unit: "m",
    round: "The range computer reads {{value}} m. Round it to one digit times a power of ten.",
    compare: "Airframe A ranges {{a}} m and airframe B ranges {{b}} m. About how many times farther is A?",
    order: "Sort these ranges from shortest to longest: {{list}}.",
  },
  wavelength: {
    unit: "m",
    round: "The radar wavelength is {{value}} m. Round it to one digit times a power of ten.",
    compare: "Radar A uses {{a}} m and radar B uses {{b}} m. About how many times longer is A?",
    order: "Sort these wavelengths from shortest to longest: {{list}}.",
  },
  cost: {
    unit: "CR",
    round: "The fleet bill reads {{value}} CR. Round it to one digit times a power of ten.",
    compare: "Fleet A costs {{a}} CR and fleet B costs {{b}} CR. About how many times more is A?",
    order: "Sort these costs from lowest to highest: {{list}}.",
  },
} as const;

type SkinKey = keyof typeof SKINS;

const plain = (s: SciNotation): string => {
  const v = s.coefficient * 10 ** s.exponent;
  return s.exponent >= 0 ? v.toLocaleString("en-US") : v.toPrecision(2);
};

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "order" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  /* -------- how many times larger ------------------------------------ */
  if (variant === "how-many") {
    const expA = int(rng, 2, 12);
    const gap = int(rng, 1, 5);
    const expB = expA - gap;
    const digitA = int(rng, 2, 9);
    const digitB = int(rng, 1, digitA);
    const a: SciNotation = { coefficient: digitA, exponent: expA };
    const b: SciNotation = { coefficient: digitB, exponent: expB };
    const times = (digitA / digitB) * 10 ** gap;

    const worked: WorkedStep[] = [
      { text: "Write both numbers as one digit times a power of ten.", math: `${fmtSci(a)} and ${fmtSci(b)}` },
      { text: "Comparing means dividing, not subtracting.", math: `${fmtSci(a)} ÷ ${fmtSci(b)}` },
      { text: "Divide the digits and subtract the exponents.", math: `${digitA} ÷ ${digitB} = ${digitA / digitB}, ${expA} − ${expB} = ${gap}` },
      { text: "Put it back together.", math: `about ${times.toLocaleString("en-US")} times` },
    ];

    const correct = rat(Math.round(times));
    const candidates: Candidate[] = [
      // ratio-subtract: subtracts instead of dividing
      { tag: "ratio-subtract", value: rat(Math.round(digitA * 10 ** expA - digitB * 10 ** expB)), when: Math.abs(digitA * 10 ** expA) < 1e15 },
      { tag: "ratio-subtract", value: rat(gap) },
      // exponent-off-by-one: counts a power of ten wrong
      { tag: "exponent-off-by-one", value: rat(Math.round(times * 10)) },
      { tag: "exponent-off-by-one", value: rat(Math.round(times / 10)), when: times >= 10 },
    ];
    const fmt = (x: Answer): string => fmtFraction(x as { n: number; d: number });
    const choice = buildChoice(rng, correct, candidates, fmt);

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${digitA}e${expA}|${digitB}e${expB}`),
      format: rng() < 0.5 ? "numeric" : "multiple-choice",
      prompt: {
        text: bind(skin.compare, { a: fmtSci(a), b: fmtSci(b) }),
        figure: { kind: "powers-of-ten-line" as const, min: expB - 1, max: expA + 1, points: [expB, expA], labels: [fmtSci(b), fmtSci(a)] },
      },
      answer: correct,
      answerText: fmt(correct),
      accept: (input: Answer) => {
        const r = input as { n?: number; d?: number };
        return typeof r?.n === "number" && typeof r?.d === "number" && r.n * correct.d === correct.n * r.d;
      },
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, digitA, expA, digitB, expB },
    };
  }

  /* -------- order a mixed set ---------------------------------------- */
  if (variant === "order") {
    const size = int(rng, 4, 5);
    const used = new Set<number>();
    const set: SciNotation[] = [];
    while (set.length < size) {
      const exponent = int(rng, -9, 12);
      if (used.has(exponent)) continue;
      used.add(exponent);
      set.push({ coefficient: int(rng, 1, 9), exponent });
    }
    const laid = shuffle(rng, set);
    const sorted = [...laid].sort((x, y) => x.exponent - y.exponent || x.coefficient - y.coefficient);
    const labels = sorted.map(fmtSci);
    const answer = sorted.map((s) => rat(s.coefficient * 10 ** Math.max(0, Math.min(6, s.exponent + 9))));

    const worked: WorkedStep[] = [
      { text: "Write every quantity as one digit times a power of ten.", math: laid.map(fmtSci).join("   ") },
      { text: "Compare the exponents first. A bigger exponent always wins, whatever the digit is.", math: sorted.map((s) => `10${superscript(s.exponent)}`).join(" < ") },
      { text: "Only when two exponents match do you compare the digits.", math: "4 × 10⁵ < 7 × 10⁵" },
      { text: "Read them smallest to largest.", math: labels.join(" < ") },
    ];

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|${variant}|${laid.map((s) => `${s.coefficient}e${s.exponent}`).join(",")}`),
      format: "order",
      prompt: {
        text: bind(skin.order, { list: laid.map(fmtSci).join(", ") }),
        figure: { kind: "powers-of-ten-line" as const, min: -10, max: 13, points: laid.map((s) => s.exponent), labels: laid.map(fmtSci) },
      },
      answer,
      answerText: labels.join(" < "),
      orderLabels: labels,
      accept: (input: Answer) => {
        if (!Array.isArray(input) || input.length !== answer.length) return false;
        return input.every((x, i) => {
          const r = x as { n: number; d: number };
          return r.n * answer[i]!.d === answer[i]!.n * r.d;
        });
      },
      worked,
      errorTagsByAnswer: {},
      params: { variant, skin: skinKey, set: laid.map((s) => `${s.coefficient}e${s.exponent}`).join(" ") },
    };
  }

  /* -------- round one number to a single digit ----------------------- */
  const exponent = variant === "tiny" ? int(rng, -9, -1) : int(rng, 3, 12);
  const digit = int(rng, 1, 9);
  const noise = int(rng, 0, 99) / 100;               // the part that gets rounded away
  const correct: SciNotation = { coefficient: digit, exponent };
  const answerText = fmtSci(correct);

  const worked: WorkedStep[] = [
    { text: "Find the first digit of the number. That digit is the one you keep.", math: `${digit}` },
    { text: "Drop everything after it. Rounding to one digit is the point of the estimate.", math: `${digit}` },
    {
      text: variant === "tiny"
        ? "Count how many places the point moves to sit just after that digit. Moving right makes the exponent negative."
        : "Count how many places the point moves to sit just after that digit.",
      math: `10${superscript(exponent)}`,
    },
    { text: "Write it as one digit times that power of ten.", math: answerText },
  ];

  const candidates: Candidate[] = [
    // exponent-off-by-one: counts the zeros wrong
    { tag: "exponent-off-by-one", value: fmtSci({ coefficient: digit, exponent: exponent + 1 }) },
    { tag: "exponent-off-by-one", value: fmtSci({ coefficient: digit, exponent: exponent - 1 }) },
    // ratio-subtract only applies to comparisons; the sign flip is the other trap here
    { tag: "ratio-subtract", value: fmtSci({ coefficient: digit, exponent: -exponent }), when: exponent !== 0 },
  ];
  const choice = buildChoice(rng, answerText, candidates, (x) => String(x));

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${digit}|${exponent}|${Math.round(noise * 100)}`),
    format: rng() < 0.5 ? "multiple-choice" : "sci-notation",
    prompt: {
      text: bind(skin.round, { value: plain({ coefficient: digit + noise, exponent }) }),
      units: skin.unit,
      figure: { kind: "powers-of-ten-line" as const, min: exponent - 2, max: exponent + 2, points: [exponent], labels: [answerText] },
    },
    answer: answerText,
    answerText,
    accept: (input: Answer) => String(input).replace(/\s+/g, "") === answerText.replace(/\s+/g, ""),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, digit, exponent },
  };
}
