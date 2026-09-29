// h8.ee.a1 — Properties of integer exponents (HONORS)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtFraction } from "../../engine/rational";
import { fmtPower } from "../../engine/quantity";
import { buildChoice, bind, isUsableChoice, type Candidate } from "../shared";

const SKILL = "h8.ee.a1";

type Variant =
  | "product"   // same base, multiplying: add exponents        (tier 1)
  | "quotient"  // dividing: subtract; zero exponent            (tier 2)
  | "power"     // power of a power: multiply                   (tier 3)
  | "negative"  // negative exponents                           (tier 3)
  | "evaluate"; // evaluate numerically                         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["product"],
  2: ["quotient", "product"],
  3: ["power", "negative"],
  4: ["evaluate", "power"],
};

const SKINS = {
  signal: {
    symbolic: "Signal computer: simplify {{expr}} to a single power.",
    evaluate: "Signal strength is {{expr}}. What is that as a number?",
  },
  squadron: {
    symbolic: "Squadron plan: simplify {{expr}} to a single power.",
    evaluate: "The squadron grows by {{expr}}. What is that as a number?",
  },
  radar: {
    symbolic: "Radar gain: simplify {{expr}} to a single power.",
    evaluate: "Radar gain is {{expr}}. What is that as a number?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

/** Keep numeric evaluations under 10^6, as the registry asks. */
function safeEvaluation(base: number, exponent: number): boolean {
  return Math.abs(base ** Math.abs(exponent)) <= 1_000_000;
}

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "evaluate" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // Symbolic problems use x so the rule is the point, not the arithmetic.
  const symbolic = variant !== "evaluate";
  const base = symbolic && rng() < 0.5 ? "x" : String(int(rng, 2, 10));

  let m = 0;
  let n = 0;
  let resultExp = 0;
  let expr = "";

  switch (variant) {
    case "product":
      m = int(rng, 1, 6); n = int(rng, 1, 6);
      resultExp = m + n;
      expr = `${fmtPower(base, m)} × ${fmtPower(base, n)}`;
      break;
    case "quotient":
      m = int(rng, 2, 8); n = int(rng, 1, m); // n can equal m, which gives the zero exponent
      resultExp = m - n;
      expr = `${fmtPower(base, m)} ÷ ${fmtPower(base, n)}`;
      break;
    case "power":
      m = int(rng, 2, 4); n = int(rng, 2, 3);
      resultExp = m * n;
      expr = `(${fmtPower(base, m)})${fmtPower("", n)}`;
      break;
    case "negative":
      m = int(rng, 1, 5); n = int(rng, -5, -1);
      resultExp = m + n;
      expr = `${fmtPower(base, m)} × ${fmtPower(base, n)}`;
      break;
    case "evaluate": {
      let b = int(rng, 2, 10);
      m = int(rng, 1, 5); n = int(rng, -4, 4);
      while (!safeEvaluation(b, m + n)) { b = int(rng, 2, 4); m = int(rng, 1, 3); n = int(rng, -2, 2); }
      resultExp = m + n;
      expr = `${fmtPower(b, m)} × ${fmtPower(b, n)}`;
      return evaluated(b, m, n, resultExp, expr);
    }
  }

  // --- symbolic answer: one power of the same base ---------------------
  const answerText = resultExp === 0 ? "1" : fmtPower(base, resultExp);

  const worked: WorkedStep[] = [
    { text: "Check that both parts have the same base. The rules only work when they do.", math: `base ${base}` },
    {
      text: variant === "power"
        ? "A power of a power multiplies the exponents."
        : variant === "quotient"
          ? "Dividing the same base subtracts the exponents."
          : "Multiplying the same base adds the exponents. The base never changes.",
      math: variant === "power" ? `${m} × ${n} = ${resultExp}` : variant === "quotient" ? `${m} − ${n} = ${resultExp}` : `${m} + ${n} = ${resultExp}`,
    },
    {
      text: resultExp === 0
        ? "Anything to the power 0 is 1, because dividing a number by itself gives 1."
        : resultExp < 0
          ? "A negative exponent means one over the positive power, not a negative answer."
          : "The base stays the same; only the exponent changed.",
      math: resultExp === 0 ? `${base}⁰ = 1` : resultExp < 0 ? `${fmtPower(base, resultExp)} = 1/${fmtPower(base, Math.abs(resultExp))}` : fmtPower(base, resultExp),
    },
    { text: "Write the result as a single power.", math: answerText },
  ];

  const candidates: Candidate[] = [
    // multiply-exponents-on-product: 3^2 x 3^4 = 3^8
    { tag: "multiply-exponents-on-product", value: fmtPower(base, m * n), when: variant !== "power" && m * n !== resultExp },
    { tag: "multiply-exponents-on-product", value: fmtPower(base, m + n), when: variant === "power" && m + n !== resultExp },
    // multiply-bases: 3^2 x 3^4 = 9^6
    { tag: "multiply-bases", value: `${base === "x" ? "x²" : String(Number(base) * Number(base))}${fmtPower("", resultExp)}`, when: variant !== "power" },
    // zero-exp-zero: 5^0 = 0
    { tag: "zero-exp-zero", value: "0", when: resultExp === 0 },
    // negative-exp-negative: 2^-3 = -8
    { tag: "negative-exp-negative", value: `−${fmtPower(base, Math.abs(resultExp))}`, when: resultExp < 0 },
  ];

  const choice = buildChoice(rng, answerText, candidates, (x) => String(x));
  // Every recipe can collide on a symbolic answer; a one-option card is not a
  // choice, so the problem becomes free entry instead.
  const usable = isUsableChoice(choice);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${base}|${m}|${n}`),
    format: !usable || rng() < 0.5 ? "expression" : "multiple-choice",
    prompt: {
      text: bind(skin.symbolic, { expr }),
      math: [expr],
      figure: { kind: "expanded-form" as const, rows: [[expr], [answerText]] },
    },
    answer: answerText,
    answerText,
    accept: (input: Answer) => canonicalPower(String(input)) === canonicalPower(answerText),
    ...(usable
      ? {
          distractors: choice.distractors,
          options: choice.options,
          optionText: choice.optionText,
          correctIndex: choice.correctIndex,
        }
      : {}),
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, base, m, n },
  };

  /* -------- numeric evaluation --------------------------------------- */
  function evaluated(b: number, mm: number, nn: number, exp: number, text: string): Problem {
    const value = exp >= 0 ? rat(b ** exp) : rat(1, b ** Math.abs(exp));
    const steps: WorkedStep[] = [
      { text: "Check that both parts have the same base.", math: `base ${b}` },
      { text: "Multiplying the same base adds the exponents.", math: `${mm} + ${nn} = ${exp}` },
      {
        text: exp === 0 ? "Anything to the power 0 is 1." : exp < 0 ? "A negative exponent means one over the positive power." : "Work the power out.",
        math: exp < 0 ? `1 / ${fmtPower(b, Math.abs(exp))}` : fmtPower(b, exp),
      },
      { text: "Write it as a number.", math: fmtFraction(value) },
    ];

    const wrong: Candidate[] = [
      { tag: "multiply-exponents-on-product", value: rat(b ** Math.min(6, Math.abs(mm * nn))), when: mm * nn !== exp && safeEvaluation(b, mm * nn) },
      { tag: "negative-exp-negative", value: rat(-(b ** Math.abs(exp))), when: exp < 0 },
      { tag: "zero-exp-zero", value: rat(0), when: exp === 0 },
      { tag: "multiply-bases", value: rat((b * b) ** Math.min(3, Math.abs(exp))), when: safeEvaluation(b * b, Math.abs(exp)) },
    ];

    const fmt = (x: Answer): string => fmtFraction(x as { n: number; d: number });
    const built = buildChoice(rng, value, wrong, fmt);
    const builtUsable = isUsableChoice(built);

    return {
      skill: SKILL,
      tier,
      seed,
      hash: sha1(`${SKILL}|${tier}|evaluate|${b}|${mm}|${nn}`),
      format: !builtUsable || rng() < 0.5 ? "numeric" : "multiple-choice",
      prompt: {
        text: bind(skin.evaluate, { expr: text }),
        math: [text],
        figure: { kind: "expanded-form" as const, rows: [[text], [fmtFraction(value)]] },
      },
      answer: value,
      answerText: fmtFraction(value),
      accept: (input: Answer) => {
        const r = input as { n?: number; d?: number };
        if (typeof r?.n === "number" && typeof r?.d === "number") return r.n * value.d === value.n * r.d;
        return false;
      },
      ...(builtUsable
        ? {
            distractors: built.distractors,
            options: built.options,
            optionText: built.optionText,
            correctIndex: built.correctIndex,
          }
        : {}),
      worked: steps,
      errorTagsByAnswer: built.errorTagsByAnswer,
      params: { variant: "evaluate", skin: skinKey, base: b, m: mm, n: nn },
    };
  }
}

/** Accept x^5, x5 and x⁵ as the same written answer. */
function canonicalPower(s: string): string {
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return s
    .replace(/\s+/g, "")
    .replace(/\^/g, "")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUP.indexOf(c)))
    .replace(/⁻/g, "-")
    .toLowerCase();
}
