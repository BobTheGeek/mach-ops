// rp.6.2 — The percent proportion
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, fromDecimal, fmtFraction, fmtDecimal, isTerminating } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.6.2";

type Variant =
  | "part"     // 25% of 80                                (tier 1)
  | "percent"  // 18 is what % of 60                       (tier 2)
  | "whole"    // 15 is 30% of what                        (tier 3)
  | "hidden";  // the whole is not the largest number said (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["part"],
  2: ["percent", "part"],
  3: ["whole", "percent"],
  4: ["hidden", "whole"],
};

/** The registry's percent list. */
const PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90] as const;

const SKINS = {
  missiles: { whole: "missiles carried", part: "missiles fired", carrier: "You carry {{w}} missiles." },
  squadron: { whole: "aircraft in the squadron", part: "aircraft ready", carrier: "The squadron has {{w}} aircraft." },
  shields: { whole: "shield strength", part: "shield damage taken", carrier: "Shields read {{w}}." },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "hidden" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. choose the whole and the percent, then compute the part -------
  const percent = rng() < 0.15 ? fromDecimal(12.5, 1) : rat(pick(rng, PERCENTS));
  // A multiple of 40 keeps every percent in the registry's list — 12.5% included —
  // landing on a whole number, because these skins count real objects.
  const whole = rat(int(rng, 1, 25) * 40);
  const part = mul(whole, div0(percent, rat(100)));

  const show = (r: Rational): string => (isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

  const correct = variant === "percent" ? percent : variant === "whole" || variant === "hidden" ? whole : part;

  // --- 2. prompt --------------------------------------------------------
  const text =
    // The whole has to be in the sentence, or there is nothing to take a percent of.
    // The whole has to be in the sentence, or there is nothing to take a percent of.
    variant === "part" ? `${bind(skin.carrier, { w: show(whole) })} What is ${show(percent)}% of that?`
      : variant === "percent" ? bind("{{part}} of {{whole}} {{noun}}. What percent is that?", { part: show(part), whole: show(whole), noun: skin.whole })
        : variant === "whole" ? bind("{{part}} is {{p}}% of the {{whole}}. What is the whole?", { part: show(part), p: show(percent), whole: skin.whole })
          : bind("{{part}} {{noun}} — that is {{p}}% of what the squadron started with. How many did it start with?", {
              part: show(part), noun: skin.part, p: show(percent),
            });

  const prompt = {
    text,
    figure: {
      kind: "part-whole-bar" as const,
      rows: [["PART", variant === "part" ? "?" : show(part)],
             ["WHOLE", variant === "whole" || variant === "hidden" ? "?" : show(whole)],
             ["PERCENT", variant === "percent" ? "?" : `${show(percent)}%`]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the WHOLE first. It is whatever the percent is OF, and it is not always the biggest number in the sentence.", math: `whole = ${variant === "whole" || variant === "hidden" ? "?" : show(whole)}` },
    { text: "Set up part over whole equals percent over 100.", math: `${variant === "part" ? "?" : show(part)} / ${variant === "whole" || variant === "hidden" ? "?" : show(whole)} = ${variant === "percent" ? "?" : show(percent)} / 100` },
    { text: "Cross multiply and solve for the one that is missing.", math: `part × 100 = percent × whole` },
    { text: "Write the answer, with a % sign only if a percent was asked for.", math: variant === "percent" ? `${show(correct)}%` : show(correct) },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // part-whole-swap: puts the part where the whole goes
    { tag: "part-whole-swap", value: () => mul(div0(whole, part), rat(100)), when: part.n !== 0 && variant === "percent" },
    { tag: "part-whole-swap", value: () => div0(mul(part, part), whole), when: whole.n !== 0 && variant !== "percent" },
    // percent-as-number: uses 25 rather than 25/100
    { tag: "percent-as-number", value: mul(whole, percent) },
    { tag: "percent-as-number", value: () => div0(part, percent), when: percent.n !== 0 },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${whole.n}/${whole.d}|${percent.n}/${percent.d}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: variant === "percent" ? `${show(correct)}%` : show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, whole: whole.n, percent: `${percent.n}/${percent.d}` },
  };
}
