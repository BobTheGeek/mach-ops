// rp.5.4 — Writing and solving proportions
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, sub, add, fromDecimal, fmtFraction, isTerminating, fmtDecimal } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "rp.5.4";

type Variant =
  | "clean-factor"  // a/b = x/d with a whole scale factor   (tier 1)
  | "cross"         // no clean factor, cross products       (tier 2)
  | "denominator"   // the unknown is on the bottom          (tier 3)
  | "context";      // a two-step setup in a context         (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["clean-factor"],
  2: ["cross", "clean-factor"],
  3: ["denominator", "cross"],
  4: ["context", "denominator"],
};

const SKINS = {
  fuel: { top: "L", bottom: "NM", q: "You burn {{a}} L over {{b}} NM. At the same rate, how much fuel for {{d}} NM?" },
  missiles: { top: "MISSILES", bottom: "BOGEYS", q: "You need {{a}} missiles for {{b}} bogeys. At the same rate, how many for {{d}} bogeys?" },
  credits: { top: "CR", bottom: "SORTIES", q: "You earn {{a}} CR over {{b}} sorties. At the same rate, how much over {{d}} sorties?" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);

  // --- 1. choose the rate first, then the four values -------------------
  const clean = variant === "clean-factor";
  const decimals = variant === "denominator" && rng() < 0.5;

  const k: Rational = decimals
    ? fromDecimal(int(rng, 15, 400) / 10, 1)
    : clean
      ? rat(int(rng, 2, 9))
      : rat(int(rng, 3, 20), pick(rng, [2, 4, 5] as const));

  const b = rat(int(rng, 2, 12));
  const a = mul(k, b);
  const factor = clean ? rat(int(rng, 2, 6)) : rat(int(rng, 3, 17), pick(rng, [2, 4] as const));
  const d = mul(b, factor);
  const x = mul(k, d);

  // Missiles come in whole numbers. A fractional draw moves to a skin that can
  // take one rather than asking for half a missile.
  const wholeValues = a.d === 1 && x.d === 1 && d.d === 1;
  const finalSkin: SkinKey = !wholeValues && skinKey === "missiles" ? "fuel" : skinKey;
  const skin = SKINS[finalSkin];

  const show = (r: Rational): string =>
    decimals && isTerminating(r) ? fmtDecimal(r) : fmtFraction(r);

  // --- 2. prompt --------------------------------------------------------
  const proportion = `${show(a)} / ${show(b)} = x / ${show(d)}`;
  const prompt = {
    text: bind(skin.q, { a: show(a), b: show(b), d: show(d) }),
    units: skin.top,
    math: [proportion],
    figure: {
      kind: "ratio-table" as const,
      rows: [[skin.top, show(a), "?"], [skin.bottom, show(b), show(d)]],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Set it up so matching units sit in matching positions: same quantity on top of both fractions.", math: proportion },
    { text: "Look for a scale factor between the two known values of the same quantity.", math: `${show(b)} × ${show(factor)} = ${show(d)}` },
    { text: "If the factor is not clean, use cross products instead: multiply diagonally and set them equal.", math: `${show(a)} × ${show(d)} = x × ${show(b)}` },
    { text: "Solve for x, then check the units make sense.", math: `x = ${show(x)} ${skin.top}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // mismatched-setup: units in different positions, so a/b = d/x
    { tag: "mismatched-setup", value: () => div0(mul(b, d), a), when: a.n !== 0 },
    // additive-reasoning: adds the difference instead of scaling
    { tag: "additive-reasoning", value: add(a, sub(d, b)) },
    { tag: "mismatched-setup", value: mul(a, factor === undefined ? rat(1) : rat(factor.d, factor.n)) },
  ];

  const fmt = (v: Answer): string => show(v as Rational);
  const choice = buildChoice(rng, x, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${b.n}|${factor.n}/${factor.d}`),
    format: x.d === 1 ? (rng() < 0.5 ? "numeric" : "multiple-choice") : rng() < 0.5 ? "fraction" : "multiple-choice",
    prompt,
    answer: x,
    answerText: show(x),
    accept: acceptRational(x),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: finalSkin, k: `${k.n}/${k.d}`, b: b.n, factor: `${factor.n}/${factor.d}` },
  };
}
