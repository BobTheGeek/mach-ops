// ns.2.1 — Multiplying integers
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { buildChoice, acceptRational, bind, numberLineSpan, type Candidate } from "../shared";

const SKILL = "ns.2.1";

type Variant =
  | "one-negative"    // a x b, one factor negative, |product| <= 100   (tier 1)
  | "two-negative"    // both negative, |product| <= 200                (tier 2)
  | "three-factors"   // three factors, mixed signs                     (tier 3)
  | "square-sign"     // (-a)^2 against -a^2                            (tier 4)
  | "rate-time";      // descent rate x minutes                         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["one-negative"],
  2: ["two-negative", "one-negative"],
  3: ["three-factors", "two-negative"],
  4: ["square-sign", "rate-time", "three-factors"],
};

const SKINS = {
  descent: {
    unit: "ft",
    plain: "Engine map: {{a}} × {{b}} = ?",
    three: "Engine map: {{list}} = ?",
    rate: "You descend {{rate}} ft every minute for {{minutes}} minutes. What is your change in altitude?",
    square: "Compare the two readouts: {{left}} and {{right}}. What does {{left}} come to?",
  },
  fuel: {
    unit: "L",
    plain: "Fuel computer: {{a}} × {{b}} = ?",
    three: "Fuel computer: {{list}} = ?",
    rate: "You burn {{rate}} L every minute for {{minutes}} minutes. What is your change in fuel?",
    square: "Compare the two readouts: {{left}} and {{right}}. What does {{left}} come to?",
  },
  thrust: {
    unit: "%",
    plain: "Thrust trim: {{a}} × {{b}} = ?",
    three: "Thrust trim: {{list}} = ?",
    rate: "Thrust drops {{rate}}% every minute for {{minutes}} minutes. What is the total change?",
    square: "Compare the two readouts: {{left}} and {{right}}. What does {{left}} come to?",
  },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "rate-time" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose factors so the product stays inside the registry's range ----
  let factors: number[] = [];
  let base = 0;            // square variant: the a in (-a)^2
  let negatedSquare = false; // true when the card asks for -a^2
  let rate = 0;
  let minutes = 0;

  switch (variant) {
    case "one-negative":
      factors = [int(rng, -12, -2), int(rng, 2, 12)];
      if (rng() < 0.5) factors.reverse();
      break;
    case "two-negative":
      factors = [int(rng, -15, -2), int(rng, -15, -2)];
      break;
    case "three-factors": {
      const draw = (): number => {
        let v = int(rng, -9, 9);
        while (v === 0 || v === 1 || v === -1) v = int(rng, -9, 9);
        return v;
      };
      factors = [draw(), draw(), draw()];
      break;
    }
    case "square-sign":
      base = int(rng, 2, 12);
      negatedSquare = rng() < 0.5;
      factors = [base, base];
      break;
    case "rate-time":
      rate = -int(rng, 2, 40) * 10; // a descent or burn, always negative
      minutes = int(rng, 2, 12);
      factors = [rate, minutes];
      break;
  }

  const product = factors.reduce((p, f) => p * f, 1);
  const correct = variant === "square-sign" ? (negatedSquare ? -(base * base) : base * base) : product;

  // --- 2. prompt -------------------------------------------------------
  const left = negatedSquare ? `${"−"}${base}²` : `(${"−"}${base})²`;
  const right = negatedSquare ? `(${"−"}${base})²` : `${"−"}${base}²`;
  const template =
    variant === "square-sign" ? skin.square
      : variant === "rate-time" ? skin.rate
        : factors.length > 2 ? skin.three : skin.plain;

  const prompt = {
    text: bind(template, {
      a: fmtInt(factors[0] ?? 0),
      b: fmtInt(factors[1] ?? 0),
      list: factors.map((f) => `(${fmtInt(f)})`).join(" × "),
      rate: fmtInt(Math.abs(rate)),
      minutes: String(minutes),
      left,
      right,
    }),
    units: skin.unit,
    figure: {
      kind: (variant === "rate-time" ? "velocity-time" : "number-line") as "velocity-time" | "number-line",
      ...numberLineSpan([0, correct]),
      points: variant === "rate-time" ? [rate] : factors,
      labels: factors.map((f) => fmtInt(f)),
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const negatives = factors.filter((f) => f < 0).length;
  const sizes = factors.map((f) => Math.abs(f));
  const worked: WorkedStep[] =
    variant === "square-sign"
      ? [
          { text: "Read what the exponent is attached to. Brackets around the minus mean the minus is squared too.", math: `${left}` },
          { text: negatedSquare ? "Without brackets, only the number is squared; the minus stays in front." : "With brackets, the negative is one of the two factors.", math: negatedSquare ? `${"−"}(${base} × ${base})` : `(${"−"}${base}) × (${"−"}${base})` },
          { text: "Multiply the sizes.", math: `${base} × ${base} = ${base * base}` },
          { text: "Apply the sign you worked out in step 2.", math: `${fmtInt(correct)} ${skin.unit}` },
        ]
      : [
          { text: "Multiply the sizes, ignoring the signs for now.", math: `${sizes.join(" × ")} = ${Math.abs(product)}` },
          { text: "Count the negative factors.", math: `${negatives} negative${negatives === 1 ? "" : "s"}` },
          { text: "An even count of negatives is positive; an odd count is negative.", math: negatives % 2 === 0 ? "positive" : "negative" },
          { text: "Write the answer with that sign.", math: `${fmtInt(correct)} ${skin.unit}` },
        ];

  // --- 4. distractors from registry error tags --------------------------
  // All three of this skill's tags produce the same number — the answer with the
  // wrong sign — so each owns the variant where it is the real mistake. Without
  // that split the first one listed shadows the other two and they never reach a
  // player, which also means the engine never logs them.
  const wrongSign = rat(-correct);
  const candidates: Candidate[] = [
    // square-sign: confuses (-a)^2 with -a^2
    { tag: "square-sign", value: wrongSign, when: variant === "square-sign" && correct !== 0 },
    // count-negatives: miscounts the negatives in a product of three
    { tag: "count-negatives", value: wrongSign, when: variant === "three-factors" && correct !== 0 },
    // add-rule-on-mult: applies the addition sign rule, so neg x neg comes out negative
    {
      tag: "add-rule-on-mult",
      value: wrongSign,
      when: variant !== "square-sign" && variant !== "three-factors" && correct !== 0,
    },
  ];

  const fmtAnswer = (x: Answer): string => fmtInt(Math.round(Number((x as { n: number }).n)));
  const choice = buildChoice(rng, rat(correct), candidates, fmtAnswer);

  return {
    skill: SKILL,
    tier,
    seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${factors.join(",")}|${negatedSquare ? "neg" : ""}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: rat(correct),
    answerText: fmtInt(correct),
    accept: acceptRational(rat(correct)),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, factors: factors.join(" "), negatedSquare: negatedSquare ? 1 : 0 },
  };
}
