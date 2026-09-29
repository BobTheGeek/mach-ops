// g.9.5 — Finding unknown angle measures
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, fmtInt } from "../../engine/rational";
import { complement, supplement, showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "g.9.5";

type Variant =
  | "pair"      // complementary or supplementary, find the other  (tier 1)
  | "crossing"  // vertical and adjacent at a crossing              (tier 2)
  | "equation"  // (3x) and (2x + 20): solve, then answer the ANGLE (tier 3)
  | "multi";    // two relationships in one figure                  (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["pair"],
  2: ["crossing", "pair"],
  3: ["equation", "crossing"],
  4: ["multi", "equation"],
};

const SKINS = {
  paths: { noun: "flight paths", one: "path" },
  headings: { noun: "intercept vectors", one: "vector" },
  bank: { noun: "bank-angle limits", one: "limit" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "multi" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the angles ----------------------------------------------------
  const supplementary = rng() < 0.5;
  const total = supplementary ? 180 : 90;
  // Kept at 20 or more so that no distractor recipe — including the spec's
  // "correct minus ten" fallback — can produce a negative angle.
  const given = rat(int(rng, 20, total - 20));
  const partner = supplementary ? supplement(given) : complement(given);

  // Tier 2: two lines crossing. The angle opposite is equal; the one beside it
  // makes a straight line with it.
  const wantsVertical = rng() < 0.5;
  const crossing = wantsVertical ? given : supplement(given);

  // Tier 3: (mx) and (nx + k) together make the total. m, n and k are chosen so
  // x comes out whole, because an angle of 27.4 degrees is a different lesson.
  const m = int(rng, 2, 6);
  const n = int(rng, 1, 5);
  // x is redrawn until both angles land at 20 degrees or more, for the same
  // reason the given angle is: no option on an angle card may come out negative.
  const x = ((): number => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const v = int(rng, 4, 20);
      const second = total - m * v;
      if (m * v >= 20 && second >= 20) return v;
    }
    return Math.max(4, Math.floor((total / 2) / m));
  })();
  const k = total - (m + n) * x;
  const firstAngle = rat(m * x);
  const secondAngle = rat(n * x + k);

  // Tier 4: a straight line split into three, two of them known.
  const p1 = rat(int(rng, 20, 70));
  const p2 = rat(int(rng, 20, 70));
  const p3 = sub(rat(180), add(p1, p2));

  const correct: Rational =
    variant === "pair" ? partner
      : variant === "crossing" ? crossing
        : variant === "equation" ? firstAngle
          : p3;

  const relationship = supplementary ? "SUPPLEMENTARY" : "COMPLEMENTARY";

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "pair"
      ? bind("Two angles are {{rel}} and one of them is {{a}}°. What is the other?", {
          rel: relationship, a: showNumber(given),
        })
      : variant === "crossing"
        ? bind("Two straight {{noun}} cross. One of the four angles is {{a}}°. What is the angle {{where}} it?", {
            noun: skin.noun, a: showNumber(given),
            where: wantsVertical ? "directly OPPOSITE" : "right NEXT to",
          })
        : variant === "equation"
          ? bind("Two {{rel}} angles measure ({{m}}x)° and ({{n}}x + {{k}})°. What is the FIRST angle?", {
              rel: relationship.toLowerCase(), m: String(m), n: String(n), k: fmtInt(k),
            })
          : bind("A straight line is split into three angles: {{a}}°, {{b}}° and one more. What is the third?", {
              a: showNumber(p1), b: showNumber(p2),
            });

  const prompt = {
    text,
    units: "degrees",
    figure: {
      kind: "angle-diagram" as const,
      rays: variant === "multi" ? [0, 180, 180 - p1.n, p3.n] : [0, 180, given.n, given.n + 180],
      arcs: variant === "multi"
        ? [{ from: 0, to: p3.n, label: "?" }, { from: p3.n, to: p3.n + p2.n, label: `${showNumber(p2)}°` }]
        : [{ from: 0, to: given.n, label: `${showNumber(given)}°` },
           { from: given.n, to: variant === "crossing" && wantsVertical ? given.n + 180 : 180, label: "?" }],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Name the relationship first. Complementary angles add to 90; supplementary angles add to 180.", math: `${relationship} → ${total}°` },
    { text: "Vertical angles — the pair directly opposite each other where two lines cross — are EQUAL, not supplementary.", math: `opposite ${showNumber(given)}° is ${showNumber(given)}°` },
    { text: "Write the equation and solve it. With two expressions in x, add them and set the total.", math: `${m}x + ${n}x + ${fmtInt(k)} = ${total} → x = ${x}` },
    { text: "Answer the ANGLE, not x. Put x back into the expression the question asked about.", math: `${m} × ${x} = ${showNumber(firstAngle)}°` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  // An angle is never negative, so every recipe is guarded: using 90 where 180
  // belongs only produces a number at all when the angle is under 90, and
  // "−33°" is not a mistake anyone makes, it is a broken option.
  const swapped = supplementary ? complement(given) : supplement(given);
  const candidates: Candidate[] = [
    // comp-supp-swap: 90 used for 180, or the other way round
    { tag: "comp-supp-swap", value: swapped, when: swapped.n > 0 },
    { tag: "comp-supp-swap", value: sub(correct, rat(90)), when: correct.n > 90 },
    { tag: "comp-supp-swap", value: add(correct, rat(90)), when: correct.n + 90 <= 180 },
    // stop-at-x: x reported instead of the angle it produces
    { tag: "stop-at-x", value: rat(x), when: variant === "equation" },
    { tag: "stop-at-x", value: given, when: variant !== "equation" },
    // vertical-supp: opposite angles treated as adding to 180
    { tag: "vertical-supp", value: supplement(given), when: variant === "crossing" && wantsVertical },
    { tag: "vertical-supp", value: given, when: variant === "crossing" && !wantsVertical },
    { tag: "vertical-supp", value: secondAngle, when: variant === "equation" },
    { tag: "vertical-supp", value: sub(rat(180), p1), when: variant === "multi" },
    { tag: "vertical-supp", value: supplement(correct), when: correct.n < 180 },
  ];

  const choice = buildChoice(rng, correct, candidates, (v: Answer) => `${showNumber(v as Rational)}°`);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${given.n}|${supplementary}|${wantsVertical}|${m},${n},${x}|${p1.n},${p2.n}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: `${showNumber(correct)}°`,
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, given: given.n, supplementary: String(supplementary) },
  };
}
